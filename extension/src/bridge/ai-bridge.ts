import { AdapterDiagnostics, SiteAdapter } from '../adapters/types.js';

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
    if (!this.adapter.isReady()) {
      throw new Error(`AIBridge: adapter "${this.adapter.name}" is not ready`);
    }

    // Capture the current (previous turn's) response BEFORE sending. On a real
    // site the prior assistant message stays in the DOM and the stop-generating
    // control hasn't appeared yet, so without this baseline the first poll would
    // resolve with the stale previous response.
    const baseline = this.adapter.getLatestResponseText();

    this.adapter.setInputValue(text);
    // Give the editor a beat to process the injected input before we send;
    // otherwise the Enter keypress / send click can race an editor the site
    // still thinks is empty, and the message silently never sends.
    await delay(this.options.sendDelayMs);
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
    return new Promise<string>((resolve, reject) => {
      const poll = (): void => {
        if (Date.now() - startedAt > this.options.timeoutMs) {
          reject(new Error('AIBridge: response timed out'));
          return;
        }
        if (this.adapter.isResponseComplete()) {
          const responseText = this.adapter.getLatestResponseText();
          if (
            responseText.length > 0 &&
            responseText !== baseline &&
            !this.looksLikeEcho(responseText, sentText)
          ) {
            // Happy path: complete with fresh, readable text.
            resolve(responseText);
            return;
          }
          // Complete, but nothing new/readable yet. Start (or continue) the
          // grace timer; if this state persists, the AI almost certainly
          // finished but produced nothing we can read.
          completeButEmptySince ??= Date.now();
          if (Date.now() - completeButEmptySince > this.options.emptyResponseGraceMs) {
            reject(
              new Error('AIBridge: the AI finished but produced no readable response'),
            );
            return;
          }
        } else {
          // Still generating — clear the grace timer.
          completeButEmptySince = null;
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
