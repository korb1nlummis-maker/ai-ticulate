import { LLMClient, LLMCompleteOptions, LLMResponse } from './types.js';

/**
 * Substring-matching canned-response LLM for tests. Keys are matched
 * against the last user message; first matching key wins.
 */
export class StubLLM implements LLMClient {
  constructor(private readonly cannedResponses: Record<string, string>) {}

  async complete(opts: LLMCompleteOptions): Promise<LLMResponse> {
    const lastUserMsg = [...opts.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      throw new Error('StubLLM: no user message in conversation');
    }
    for (const [key, response] of Object.entries(this.cannedResponses)) {
      if (lastUserMsg.content.includes(key)) {
        return { text: response };
      }
    }
    throw new Error(`StubLLM: no canned response matched user message: ${lastUserMsg.content.slice(0, 60)}`);
  }
}
