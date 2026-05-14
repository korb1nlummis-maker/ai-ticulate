import { describe, it, expect } from 'vitest';
import { pickAdapter } from '../../src/adapters/registry.js';

describe('pickAdapter', () => {
  it('returns the ChatGPT adapter for chatgpt.com', () => {
    expect(pickAdapter('chatgpt.com')?.name).toBe('ChatGPT');
  });
  it('returns the Claude adapter for claude.ai', () => {
    expect(pickAdapter('claude.ai')?.name).toBe('Claude');
  });
  it('returns the Gemini adapter for gemini.google.com', () => {
    expect(pickAdapter('gemini.google.com')?.name).toBe('Gemini');
  });
  it('returns null for an unsupported host', () => {
    expect(pickAdapter('example.com')).toBeNull();
  });
});
