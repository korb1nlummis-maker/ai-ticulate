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

  it('isReady() is true even when the send button is absent (empty input state)', () => {
    document.querySelector('button[aria-label*="Send" i]')?.remove();
    expect(new GeminiAdapter().isReady()).toBe(true);
  });

  it('setInputValue writes into the input element', async () => {
    const a = new GeminiAdapter();
    await a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('[contenteditable="true"]');
    expect(input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new GeminiAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('getLatestResponseText returns empty string when no response exists', () => {
    document.querySelectorAll('model-response').forEach((el) => el.remove());
    document.querySelectorAll('message-content').forEach((el) => el.remove());
    document.querySelectorAll('.model-response-text').forEach((el) => el.remove());
    expect(new GeminiAdapter().getLatestResponseText()).toBe('');
  });

  it('getCurrentInputText returns whatever is currently in the input', async () => {
    const a = new GeminiAdapter();
    await a.setInputValue('typed text');
    expect(a.getCurrentInputText()).toContain('typed text');
  });

  it('getResponseSignal counts model response blocks', () => {
    // Fixture contains 2 message-content elements.
    expect(new GeminiAdapter().getResponseSignal()).toBe(2);
  });

  it('getResponseSignal increments when a new model response block appears', () => {
    const a = new GeminiAdapter();
    const before = a.getResponseSignal();
    const next = document.createElement('message-content');
    next.textContent = 'a fresh model response';
    document.body.appendChild(next);
    expect(a.getResponseSignal()).toBe(before + 1);
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

  it('diagnose() reports all elements found on a healthy page', () => {
    const diag = new GeminiAdapter().diagnose();
    expect(diag.site).toBe('Gemini');
    expect(diag.inputFound).toBe(true);
    expect(diag.sendButtonFound).toBe(true);
    expect(diag.responseContainerFound).toBe(true);
  });

  it('diagnose() reports inputFound false when the input is missing', () => {
    document.querySelector('[contenteditable="true"]')?.remove();
    const diag = new GeminiAdapter().diagnose();
    expect(diag.inputFound).toBe(false);
  });
});
