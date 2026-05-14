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
};

const DEFAULT_OPTIONS: AIBridgeOptions = {
  pollIntervalMs: 400,
  timeoutMs: 120_000,
  emptyResponseGraceMs: 8_000,
  sendDelayMs: 350,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    // Capture the current (previous turn's) response BEFORE sending. On a real
    // site the prior assistant message stays in the DOM and the stop-generating
    // control hasn't appeared yet, so without this baseline the first poll would
    // resolve with the stale previous response.
    const baseline = this.adapter.getLatestResponseText();
    trace('AIBridge.send: baseline captured', 'len=' + baseline.length);

    trace('AIBridge.send: setInputValue start');
    await this.adapter.setInputValue(text);
    trace('AIBridge.send: setInputValue done');
    // Give the editor a beat to process the injected input before we send;
    // otherwise the Enter keypress / send click can race an editor the site
    // still thinks is empty, and the message silently never sends.
    await delay(this.options.sendDelayMs);
    trace('AIBridge.send: clickSend');
    this.adapter.clickSend();

    // Remember what we sent so we never resolve with our own prompt echoed
    // back. The structural response-reading fallback can, on the first poll
    // right after sending, briefly return the meta-prompt we just typed (it's
    // the last "message-like" block until the assistant's turn renders).
    const sentText = text;

    const startedAt = Date.now();
    // Timestamp of the first poll where the adapter reported complete but had
    // no new readable text. Reset to null whenever that condition isn't met,
    // so only a *continuous* window of complete-but-empty triggers early exit.
    let completeButEmptySince: number | null = null;
    let pollCount = 0;
    return new Promise<string>((resolve, reject) => {
      const poll = (): void => {
        pollCount++;
        if (Date.now() - startedAt > this.options.timeoutMs) {
          trace('AIBridge.send: TIMED OUT');
          reject(new Error('AIBridge: response timed out'));
          return;
        }
        const isComplete = this.adapter.isResponseComplete();
        if (isComplete) {
          const responseText = this.adapter.getLatestResponseText();
          const changedFromBaseline = responseText !== baseline;
          const tracePoll = (label: string): void => {
            trace(
              label,
              `attempt=${pollCount} isComplete=${isComplete} textLen=${responseText.length} changedFromBaseline=${changedFromBaseline}`,
            );
          };
          if (
            responseText.length > 0 &&
            changedFromBaseline &&
            !this.looksLikeEcho(responseText, sentText)
          ) {
            // Happy path: complete with fresh, readable text.
            tracePoll('AIBridge.send: poll');
            trace('AIBridge.send: RESOLVED', 'textLen=' + responseText.length);
            resolve(responseText);
            return;
          }
          // Complete, but nothing new/readable yet. Start (or continue) the
          // grace timer; if this state persists, the AI almost certainly
          // finished but produced nothing we can read.
          completeButEmptySince ??= Date.now();
          if (Date.now() - completeButEmptySince > this.options.emptyResponseGraceMs) {
            tracePoll('AIBridge.send: poll');
            trace('AIBridge.send: REJECTED no-readable-response');
            reject(
              new Error('AIBridge: the AI finished but produced no readable response'),
            );
            return;
          }
          if (pollCount === 1 || pollCount % 5 === 0) tracePoll('AIBridge.send: poll');
        } else {
          // Still generating — clear the grace timer.
          completeButEmptySince = null;
          if (pollCount === 1 || pollCount % 5 === 0) {
            const responseText = this.adapter.getLatestResponseText();
            trace(
              'AIBridge.send: poll',
              `attempt=${pollCount} isComplete=${isComplete} textLen=${responseText.length} changedFromBaseline=${responseText !== baseline}`,
            );
          }
        }
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
