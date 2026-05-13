import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../src/services/variants.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('generateVariants', () => {
  it('returns 5 variants with ids, text, and labels', async () => {
    const canned = JSON.stringify({
      variants: [
        { id: '1', text: 'Variant one [___]', label: 'analogies' },
        { id: '2', text: 'Variant two', label: 'story' },
        { id: '3', text: 'Variant three [___]', label: 'specifics' },
        { id: '4', text: 'Variant four', label: 'comparison' },
        { id: '5', text: 'Variant five', label: 'briefing' },
      ],
    });
    const llm = new StubLLM({ 'help me write an email': canned });

    const res = await generateVariants(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [{ q: 'kind?', a: 'work' }],
    });

    expect(res.variants).toHaveLength(5);
    expect(res.variants[0]!.text).toContain('Variant one');
    expect(res.variants[0]!.label).toBe('analogies');
  });

  it('throws if the LLM returns fewer than 5 variants', async () => {
    const canned = JSON.stringify({ variants: [{ id: '1', text: 'only one', label: 'x' }] });
    const llm = new StubLLM({ 'short': canned });
    await expect(
      generateVariants(llm, { originalPrompt: 'short', contextSummary: '', qaHistory: [] }),
    ).rejects.toThrow(/5/);
  });

  it('throws on malformed JSON from the LLM', async () => {
    const llm = new StubLLM({ 'broken': 'not json at all' });
    await expect(
      generateVariants(llm, { originalPrompt: 'broken', contextSummary: '', qaHistory: [] }),
    ).rejects.toThrow();
  });
});
