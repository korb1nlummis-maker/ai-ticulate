import { describe, it, expect } from 'vitest';
import { StubLLM } from '../../src/llm/stub.js';

describe('StubLLM', () => {
  it('returns the canned response matching the last user message', async () => {
    const llm = new StubLLM({
      'hello': 'hi there',
      'what time': 'noon',
    });

    const res = await llm.complete({
      messages: [
        { role: 'system', content: 'be brief' },
        { role: 'user', content: 'hello' },
      ],
    });

    expect(res.text).toBe('hi there');
  });

  it('throws if no canned response matches', async () => {
    const llm = new StubLLM({ 'hello': 'hi' });
    await expect(
      llm.complete({ messages: [{ role: 'user', content: 'unmatched' }] }),
    ).rejects.toThrow(/no canned response/i);
  });

  it('matches by substring of the user message', async () => {
    const llm = new StubLLM({ 'pretalk': '{"question":"what next?","chips":["a","b"],"done":false}' });
    const res = await llm.complete({
      messages: [{ role: 'user', content: 'please run pretalk for me' }],
    });
    expect(res.text).toContain('what next?');
  });
});
