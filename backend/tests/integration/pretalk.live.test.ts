import { describe, it, expect } from 'vitest';
import { runPretalk } from '../../src/services/pretalk.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('pretalk live LLM', () => {
  it('returns a structurally valid response for a vague prompt', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const res = await runPretalk(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [],
    });

    expect(typeof res.question).toBe('string');
    expect(Array.isArray(res.chips)).toBe(true);
    expect(typeof res.done).toBe('boolean');
    if (!res.done) {
      expect(res.question.length).toBeGreaterThan(0);
      expect(res.chips.length).toBeGreaterThanOrEqual(2);
    }
  }, 30_000);
});
