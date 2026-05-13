import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../src/services/variants.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('variants live LLM', () => {
  it('returns 5 distinct variants for a realistic prompt', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const res = await generateVariants(llm, {
      originalPrompt: 'explain machine learning',
      contextSummary: 'User is a marketing manager curious about ML for work.',
      qaHistory: [
        { q: 'What level of detail?', a: 'enough to discuss with my team' },
        { q: 'What examples would help?', a: 'ad targeting and content personalization' },
      ],
    });

    expect(res.variants).toHaveLength(5);
    for (const v of res.variants) {
      expect(v.text.length).toBeGreaterThan(20);
    }
    const distinctTexts = new Set(res.variants.map((v) => v.text));
    expect(distinctTexts.size).toBe(5);
  }, 60_000);
});
