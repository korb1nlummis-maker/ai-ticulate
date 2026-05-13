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

  it('throws if there is no user message at all', async () => {
    const llm = new StubLLM({ 'anything': 'response' });
    await expect(
      llm.complete({ messages: [{ role: 'system', content: 'be brief' }] }),
    ).rejects.toThrow(/no user message/i);
  });

  it('matches against the LAST user message (not the first)', async () => {
    const llm = new StubLLM({ 'second': 'matched the second' });
    const res = await llm.complete({
      messages: [
        { role: 'user', content: 'first message about first thing' },
        { role: 'assistant', content: 'understood' },
        { role: 'user', content: 'now my second question' },
      ],
    });
    expect(res.text).toBe('matched the second');
  });

  it('longest matching key wins when multiple keys match', async () => {
    const llm = new StubLLM({
      'pretalk': 'short match',
      'pretalk variants': 'long match',
    });
    const res = await llm.complete({
      messages: [{ role: 'user', content: 'run pretalk variants now' }],
    });
    expect(res.text).toBe('long match');
  });
});
