import { describe, it, expect } from 'vitest';
import { runPretalk } from '../../src/services/pretalk.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('runPretalk', () => {
  it('returns the parsed question and chips from the LLM', async () => {
    const canned = JSON.stringify({
      question: 'What kind of email?',
      chips: ['work', 'personal', 'apology'],
      allow_fill_in: true,
      done: false,
    });
    const llm = new StubLLM({ 'help me write an email': canned });

    const res = await runPretalk(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [],
    });

    expect(res.question).toBe('What kind of email?');
    expect(res.chips).toEqual(['work', 'personal', 'apology']);
    expect(res.allowFillIn).toBe(true);
    expect(res.done).toBe(false);
  });

  it('signals done when LLM returns done:true', async () => {
    const canned = JSON.stringify({ question: '', chips: [], allow_fill_in: false, done: true });
    const llm = new StubLLM({ 'enough context': canned });

    const res = await runPretalk(llm, {
      originalPrompt: 'enough context',
      contextSummary: '',
      qaHistory: [{ q: 'q1', a: 'a1' }],
    });

    expect(res.done).toBe(true);
  });

  it('throws on malformed JSON from the LLM', async () => {
    const llm = new StubLLM({ 'broken': 'not json at all' });
    await expect(
      runPretalk(llm, { originalPrompt: 'broken', contextSummary: '', qaHistory: [] }),
    ).rejects.toThrow();
  });
});
