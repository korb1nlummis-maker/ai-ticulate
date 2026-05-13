import { LLMClient, LLMCompleteOptions, LLMResponse } from './types.js';

/**
 * Substring-matching canned-response LLM for tests. Keys are matched
 * against the last user message; the LONGEST matching key wins
 * (most-specific-first), so overlapping keys like "pretalk" and
 * "pretalk variants" both work as expected.
 */
export class StubLLM implements LLMClient {
  constructor(private readonly cannedResponses: Record<string, string>) {}

  async complete(opts: LLMCompleteOptions): Promise<LLMResponse> {
    const lastUserMsg = [...opts.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      throw new Error('StubLLM: no user message in conversation');
    }
    const keysByLength = Object.keys(this.cannedResponses).sort((a, b) => b.length - a.length);
    for (const key of keysByLength) {
      if (lastUserMsg.content.includes(key)) {
        return { text: this.cannedResponses[key]! };
      }
    }
    throw new Error(`StubLLM: no canned response matched user message: ${lastUserMsg.content.slice(0, 60)}`);
  }
}
