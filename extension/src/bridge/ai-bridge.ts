import { SiteAdapter } from '../adapters/types.js';

export type AIBridgeOptions = {
  /** How often to poll for response completion, in ms. */
  pollIntervalMs: number;
  /** Max time to wait for a response to complete, in ms. */
  timeoutMs: number;
};

const DEFAULT_OPTIONS: AIBridgeOptions = {
  pollIntervalMs: 400,
  timeoutMs: 120_000,
};

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
    this.adapter.clickSend();

    const startedAt = Date.now();
    return new Promise<string>((resolve, reject) => {
      const poll = (): void => {
        if (Date.now() - startedAt > this.options.timeoutMs) {
          reject(new Error('AIBridge: response timed out'));
          return;
        }
        if (this.adapter.isResponseComplete()) {
          const responseText = this.adapter.getLatestResponseText();
          if (responseText.length > 0 && responseText !== baseline) {
            resolve(responseText);
            return;
          }
        }
        setTimeout(poll, this.options.pollIntervalMs);
      };
      // Give the site a tick to register the send before the first poll.
      setTimeout(poll, this.options.pollIntervalMs);
    });
  }
}
