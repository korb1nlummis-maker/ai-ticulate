import { describe, it, expect, beforeEach } from 'vitest';
import { loadFixture } from '../helpers/load-fixture.js';
import { ChatGPTAdapter } from '../../src/adapters/chatgpt.js';

describe('ChatGPTAdapter', () => {
  beforeEach(() => {
    loadFixture('fixtures/chatgpt-snapshot.html');
  });

  it('isReady() is true when input and send button are present', () => {
    expect(new ChatGPTAdapter().isReady()).toBe(true);
  });

  it('isReady() is false when the input is missing', () => {
    document.querySelector('#prompt-textarea')?.remove();
    expect(new ChatGPTAdapter().isReady()).toBe(false);
  });

  it('setInputValue writes into the input element', () => {
    const a = new ChatGPTAdapter();
    a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('#prompt-textarea') as HTMLTextAreaElement | null;
    expect(input?.value ?? input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new ChatGPTAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('isResponseComplete is true when no stop-button is present', () => {
    expect(new ChatGPTAdapter().isResponseComplete()).toBe(true);
  });

  it('isResponseComplete is false while a stop-button is present', () => {
    const stop = document.createElement('button');
    stop.setAttribute('data-testid', 'stop-button');
    document.body.appendChild(stop);
    expect(new ChatGPTAdapter().isResponseComplete()).toBe(false);
  });
});
