import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('e2e smoke', () => {
  it('runs the full flow: context summarize -> pretalk -> variants', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const app = createApp(llm);

    // 1. Context summarize
    const ctxRes = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatHistory: 'User: I run social media for a small bakery. Need help with engagement.',
      }),
    });
    expect(ctxRes.status).toBe(200);
    const ctxBody = await ctxRes.json();

    // 2. Pre-talk turn 1
    const ptRes = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me come up with content ideas',
        contextSummary: JSON.stringify(ctxBody),
        qaHistory: [],
      }),
    });
    expect(ptRes.status).toBe(200);
    const ptBody = await ptRes.json();
    expect(typeof ptBody.question).toBe('string');
    expect(Array.isArray(ptBody.chips)).toBe(true);

    // 3. Variants (simulate enough Q&A)
    const vRes = await app.request('/variants/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me come up with content ideas',
        contextSummary: JSON.stringify(ctxBody),
        qaHistory: [
          { q: ptBody.question, a: ptBody.chips[0] ?? 'casual / fun' },
          { q: 'Platform?', a: 'Instagram' },
          { q: 'Time available?', a: '1-2 hours per week' },
        ],
      }),
    });
    expect(vRes.status).toBe(200);
    const vBody = await vRes.json();
    expect(vBody.variants).toHaveLength(5);

    // Sanity-check: at least one variant references something specific from context
    const allText = vBody.variants.map((v: { text: string }) => v.text).join('\n');
    expect(allText.toLowerCase()).toMatch(/bakery|instagram|content|engagement/);
  }, 90_000);
});
