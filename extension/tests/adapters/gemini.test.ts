import { describe, it, expect, beforeEach } from 'vitest';
import { loadFixture } from '../helpers/load-fixture.js';
import { GeminiAdapter } from '../../src/adapters/gemini.js';

describe('GeminiAdapter', () => {
  beforeEach(() => {
    loadFixture('fixtures/gemini-snapshot.html');
  });

  it('isReady() is true when input and send button are present', () => {
    expect(new GeminiAdapter().isReady()).toBe(true);
  });

  it('isReady() is false when the input is missing', () => {
    document.querySelector('[contenteditable="true"]')?.remove();
    expect(new GeminiAdapter().isReady()).toBe(false);
  });

  it('setInputValue writes into the input element', () => {
    const a = new GeminiAdapter();
    a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('[contenteditable="true"]');
    expect(input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new GeminiAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('isResponseComplete is true when no stop-button is present', () => {
    expect(new GeminiAdapter().isResponseComplete()).toBe(true);
  });

  it('isResponseComplete is false while a stop-button is present', () => {
    const stop = document.createElement('button');
    stop.setAttribute('aria-label', 'Stop generating');
    document.body.appendChild(stop);
    expect(new GeminiAdapter().isResponseComplete()).toBe(false);
  });
});
