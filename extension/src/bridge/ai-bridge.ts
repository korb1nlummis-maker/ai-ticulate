import { AdapterDiagnostics, SiteAdapter } from '../adapters/types.js';
import { trace } from '../trace.js';

export type AIBridgeOptions = {
  /** How often to poll for response completion, in ms. */
  pollIntervalMs: number;
  /** Max time to wait for a response to complete, in ms. */
  timeoutMs: number;
  /**
   * How long the adapter may continuously report `isResponseComplete() === true`
   * while still producing no new readable text before we give up early. This
   * catches the "the AI finished but the page shows nothing we can read" case
   * (bad selector, empty turn, error bubble) instead of waiting the full
   * `timeoutMs` and reporting a misleading "timed out".
   */
  emptyResponseGraceMs: number;
  /**
   * How long to pause between `setInputValue` and `clickSend`, in ms. The site's
   * contenteditable editor needs a tick to process the injected input before it
   * will honour a send — without this pause the Enter keypress can race an
   * editor the site still thinks is empty, and the message never sends.
   */
  sendDelayMs: number;
  /**
   * How long after `clickSend` to wait before checking that the input was
   * actually cleared (i.e. the send fired). If the input still contains a
   * substantial prefix of the text we tried to send at this point, the host
   * site never actually submitted — reject fast with a clear error rather
   * than waiting the full timeout. Set to 0 to skip the check.
   */
  sendFiredCheckMs: number;
  /**
   * Fallback completion path. If a new turn has appeared and the response
   * text has been non-empty AND unchanged for this long, treat the response
   * as done even if `isResponseComplete()` is still returning false. This
   * catches the case where the host site's "stop generating" indicator gets
   * stuck (artifact rendering, tool-use UI, a selector match drift) but the
   * actual readable reply has finished streaming.
   */
  textStableMs: number;
};

const DEFAULT_OPTIONS: AIBridgeOptions = {
  pollIntervalMs: 400,
  timeoutMs: 240_000,
  emptyResponseGraceMs: 8_000,
  sendDelayMs: 350,
  sendFiredCheckMs: 1500,
  textStableMs: 10_000,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * The AI bridge: the one core primitive the whole product is built on.
 * Types a message into the user's AI chat, sends it, waits for the response
 * to finish generating, and returns the response text.
 */
export class AIBridge {
  private readonly options: AIBridgeOptions;

  constructor(
    private readonly adapter: SiteAdapter,
    options: Partial<AIBridgeOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async sendAndAwaitResponse(text: string): Promise<string> {
    trace('AIBridge.send: start');
    if (!this.adapter.isReady()) {
      trace('AIBridge.send: adapter not ready');
      throw new Error(`AIBridge: adapter "${this.adapter.name}" is not ready`);
    }

    // Capture the response-count baseline BEFORE sending. A new response is
    // signalled by this count going up — not by the response text differing,
    // which fails when a new response happens to match a previous one (e.g.
    // an identical regeneration, or two messages that settle at the same
    // byte-exact text by coincidence).
    const baselineSignal = this.adapter.getResponseSignal();
    trace('AIBridge.send: baseline captured', `signal=${baselineSignal}`);

    trace('AIBridge.send: setInputValue start');
    await this.adapter.setInputValue(text);
    trace('AIBridge.send: setInputValue done');
    // Give the editor a beat to process the injected input before we send;
    // otherwise the Enter keypress / send click can race an editor the site
    // still thinks is empty, and the message silently never sends.
    await delay(this.options.sendDelayMs);
    trace('AIBridge.send: clickSend');
    this.adapter.clickSend();

    // Fast-fail: a short while after clickSend, if the input still has our
    // text in it, the send didn't fire (the host site's editor likely
    // reverted our text before the send, or the Enter/button didn't actually
    // submit). Reject early with a clear error rather than waiting the full
    // timeout.
    if (this.options.sendFiredCheckMs > 0) {
      await delay(this.options.sendFiredCheckMs);
      const stillHasText = norm(this.adapter.getCurrentInputText()).includes(
        norm(text).slice(0, 60),
      );
      if (stillHasText) {
        trace('AIBridge.send: send did not fire — input still has our text');
        throw new Error(
          'AIBridge: the message did not send — the chat site may have rejected the input',
        );
      }
      trace('AIBridge.send: send fired (input cleared)');
    }

    // Remember what we sent so we never resolve with our own prompt echoed
    // back. The structural response-reading fallback can, on the first poll
    // right after sending, briefly return the meta-prompt we just typed (it's
    // the last "message-like" block until the assistant's turn renders).
    const sentText = text;

    const startedAt = Date.now();
    // Timestamp of the first poll where the adapter reported complete + a new
    // turn but had no readable text. Reset to null whenever that condition
    // isn't met, so only a *continuous* window of complete-but-empty triggers
    // early exit.
    let completeButEmptySince: number | null = null;
    let pollCount = 0;
    // Track the last non-empty text and when it last changed, so we can resolve
    // via the text-stability fallback if isResponseComplete() gets stuck.
    let lastSeenText = '';
    let lastChangeAt = Date.now();
    return new Promise<string>((resolve, reject) => {
      const poll = (): void => {
        pollCount++;
        if (Date.now() - startedAt > this.options.timeoutMs) {
          trace('AIBridge.send: TIMED OUT');
          reject(new Error('AIBridge: response timed out'));
          return;
        }
        const isComplete = this.adapter.isResponseComplete();
        const currentSignal = this.adapter.getResponseSignal();
        const responseText = this.adapter.getLatestResponseText();
        const newTurnExists = currentSignal > baselineSignal;
        const isEcho = this.looksLikeEcho(responseText, sentText);
        const tracePoll = (label: string): void => {
          trace(
            label,
            `attempt=${pollCount} isComplete=${isComplete} sig=${currentSignal}/${baselineSignal} newTurn=${newTurnExists} textLen=${responseText.length}`,
          );
        };

        if (responseText !== lastSeenText) {
          lastSeenText = responseText;
          lastChangeAt = Date.now();
        }

        if (isComplete && newTurnExists && responseText.length > 0 && !isEcho) {
          // Happy path: complete, a new turn exists, and we can read it.
          tracePoll('AIBridge.send: poll');
          trace('AIBridge.send: RESOLVED', 'textLen=' + responseText.length);
          resolve(responseText);
          return;
        }

        // Text-stability fallback: a new turn appeared, the text has been
        // non-empty and non-echo, and it has stopped changing for textStableMs.
        // Treat that as effectively complete — covers the case where the
        // host site's "still generating" indicator gets stuck (artifacts,
        // tool-use UI, a stale spinner) even though the readable reply is
        // done.
        if (
          newTurnExists &&
          responseText.length > 0 &&
          !isEcho &&
          Date.now() - lastChangeAt >= this.options.textStableMs
        ) {
          tracePoll('AIBridge.send: poll (text-stable)');
          trace(
            'AIBridge.send: RESOLVED via text-stability',
            `textLen=${responseText.length} stableMs=${Date.now() - lastChangeAt}`,
          );
          resolve(responseText);
          return;
        }

        // Empty-response-grace: only triggers AFTER a new turn has been
        // detected. If no new turn has appeared yet, keep waiting — the AI
        // just hasn't replied yet. Without this, a fast-completing site
        // (isResponseComplete=true before any new turn renders) would
        // trigger the empty-grace clock and reject prematurely.
        if (isComplete && newTurnExists && (responseText.length === 0 || isEcho)) {
          completeButEmptySince ??= Date.now();
          if (Date.now() - completeButEmptySince > this.options.emptyResponseGraceMs) {
            tracePoll('AIBridge.send: poll');
            trace('AIBridge.send: REJECTED no-readable-response');
            reject(
              new Error('AIBridge: the AI finished but produced no readable response'),
            );
            return;
          }
        } else {
          completeButEmptySince = null;
        }

        if (pollCount === 1 || pollCount % 5 === 0) tracePoll('AIBridge.send: poll');
        setTimeout(poll, this.options.pollIntervalMs);
      };
      // Give the site a tick to register the send before the first poll.
      setTimeout(poll, this.options.pollIntervalMs);
    });
  }

  /**
   * True if `candidate` is essentially just our own sent prompt echoed back —
   * which the structural response-reading fallback can briefly pick up before
   * the assistant's turn renders. We must not resolve with that.
   */
  private looksLikeEcho(candidate: string, sent: string): boolean {
    const norm = (s: string): string => s.trim().replace(/\s+/g, ' ');
    const c = norm(candidate);
    const s = norm(sent);
    if (c === s) return true;
    // candidate is basically just our sent prompt echoed back
    const head = s.slice(0, 60);
    return head.length > 0 && c.startsWith(head);
  }

  /** Diagnostic report from the underlying adapter — for debugging live failures. */
  diagnose(): AdapterDiagnostics {
    return this.adapter.diagnose();
  }
}
