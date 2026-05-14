import { describe, it, expect, beforeEach } from 'vitest';
import { loadFixture } from '../helpers/load-fixture.js';
import { ClaudeAdapter } from '../../src/adapters/claude.js';

describe('ClaudeAdapter', () => {
  beforeEach(() => {
    loadFixture('fixtures/claude-snapshot.html');
  });

  it('isReady() is true when input and send button are present', () => {
    expect(new ClaudeAdapter().isReady()).toBe(true);
  });

  it('isReady() is false when the input is missing', () => {
    document.querySelector('[contenteditable="true"]')?.remove();
    expect(new ClaudeAdapter().isReady()).toBe(false);
  });

  it('setInputValue writes into the input element', () => {
    const a = new ClaudeAdapter();
    a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('[contenteditable="true"]');
    expect(input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new ClaudeAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('isResponseComplete is true when no stop-button is present', () => {
    expect(new ClaudeAdapter().isResponseComplete()).toBe(true);
  });

  it('isResponseComplete is false while a stop-button is present', () => {
    const stop = document.createElement('button');
    stop.setAttribute('aria-label', 'Stop response');
    document.body.appendChild(stop);
    expect(new ClaudeAdapter().isResponseComplete()).toBe(false);
  });
});
