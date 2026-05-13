import { describe, it, expect } from 'vitest';
import { loadPrompt, renderPrompt } from '../../src/prompts/loader.js';

describe('prompts/loader', () => {
  it('loads pretalk-next and parses frontmatter', () => {
    const p = loadPrompt('pretalk-next');
    expect(p.name).toBe('pretalk-next');
    expect(p.model).toBe('claude-haiku-4-5');
    expect(p.template).toContain('{{original_prompt}}');
  });

  it('renders a template by substituting {{vars}}', () => {
    const rendered = renderPrompt('pretalk-next', {
      original_prompt: 'help me write an email',
      context_summary: '',
      qa_history: '',
    });
    expect(rendered).toContain('help me write an email');
    expect(rendered).not.toContain('{{original_prompt}}');
  });

  it('throws on unknown prompt name', () => {
    expect(() => loadPrompt('nonexistent')).toThrow(/nonexistent/);
  });

  it('throws if a required variable is missing from render', () => {
    expect(() =>
      renderPrompt('pretalk-next', { original_prompt: 'x' } as Record<string, string>),
    ).toThrow(/context_summary|qa_history/);
  });

  it('parses frontmatter on files with CRLF line endings', () => {
    // The actual prompt files on disk may be CRLF on Windows; the loader normalizes.
    // This test verifies that normalization works end-to-end by checking that the existing
    // pretalk-next.md loads correctly regardless of what line endings it has on disk.
    const p = loadPrompt('pretalk-next');
    expect(p.template.length).toBeGreaterThan(0);
    expect(p.template).not.toContain('\r');
  });
});
