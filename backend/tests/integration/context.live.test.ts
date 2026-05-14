import { describe, it, expect } from 'vitest';
import { summarizeContext } from '../../src/services/context.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('context live LLM', () => {
  it('extracts a sensible topic and role from realistic chat history', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const history = `
User: I'm setting up a Google Ads campaign for our SaaS product.
Assistant: Great. What's the product and target audience?
User: It's a project management tool for engineering teams of 50-200 people.
Assistant: Got it. Have you defined your keywords?
User: Yes — "agile project tracking", "engineering project management", etc.
Assistant: For B2B SaaS like this...
`.trim();

    const res = await summarizeContext(llm, { chatHistory: history });

    expect(res.topic).toBeTruthy();
    expect(res.topic?.toLowerCase()).toMatch(/ads|marketing|campaign|saas/);
    expect(res.inferredUserRole).toBeTruthy();
  }, 30_000);
});
