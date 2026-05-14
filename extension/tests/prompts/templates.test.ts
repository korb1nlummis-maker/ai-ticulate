import { describe, it, expect } from 'vitest';
import {
  buildRefinePrompt,
  buildOptionsPrompt,
  buildFinalizePrompt,
} from '../../src/prompts/templates.js';

describe('meta-prompt templates', () => {
  it('buildRefinePrompt embeds the user request and asks for parseable output', () => {
    const p = buildRefinePrompt('build me a website');
    expect(p).toContain('build me a website');
    expect(p).toContain('QUESTION');
    expect(p).toContain('STATUS');
  });

  it('buildOptionsPrompt embeds the goal summary and asks for exactly 5 options', () => {
    const p = buildOptionsPrompt({
      goalSummary: 'a portfolio website for a photographer',
      answers: ['audience: potential clients', 'style: minimal'],
    });
    expect(p).toContain('a portfolio website for a photographer');
    expect(p).toContain('5');
    expect(p).toContain('OPTION');
  });

  it('buildFinalizePrompt passes the chosen prompt through for sending as-is', () => {
    const chosen = 'Design a minimal portfolio site for a wedding photographer...';
    expect(buildFinalizePrompt(chosen)).toContain('Design a minimal portfolio site');
  });
});
