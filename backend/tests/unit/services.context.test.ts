import { describe, it, expect } from 'vitest';
import { summarizeContext } from '../../src/services/context.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('summarizeContext', () => {
  it('returns a structured summary from the LLM', async () => {
    const canned = JSON.stringify({
      topic: 'machine learning for marketing',
      inferred_user_role: 'marketing manager',
      prior_decisions: ['decided to use AI for content'],
      active_goal: 'understand ML enough to brief the team',
    });
    const llm = new StubLLM({ 'chat history': canned });

    const res = await summarizeContext(llm, { chatHistory: 'chat history goes here' });

    expect(res.topic).toBe('machine learning for marketing');
    expect(res.inferredUserRole).toBe('marketing manager');
    expect(res.priorDecisions).toEqual(['decided to use AI for content']);
    expect(res.activeGoal).toContain('understand ML');
  });

  it('handles null fields gracefully', async () => {
    const canned = JSON.stringify({
      topic: null,
      inferred_user_role: null,
      prior_decisions: [],
      active_goal: null,
    });
    const llm = new StubLLM({ 'empty': canned });
    const res = await summarizeContext(llm, { chatHistory: 'empty' });
    expect(res.topic).toBeNull();
    expect(res.inferredUserRole).toBeNull();
    expect(res.priorDecisions).toEqual([]);
    expect(res.activeGoal).toBeNull();
  });

  it('throws on malformed JSON from the LLM', async () => {
    const llm = new StubLLM({ 'broken': 'not json' });
    await expect(
      summarizeContext(llm, { chatHistory: 'broken' }),
    ).rejects.toThrow();
  });
});
