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

  it('isReady() is true even when the send button is absent (empty input state)', () => {
    document.querySelector('button[aria-label*="Send" i]')?.remove();
    expect(new ClaudeAdapter().isReady()).toBe(true);
  });

  it('setInputValue writes into the input element', async () => {
    const a = new ClaudeAdapter();
    await a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('[contenteditable="true"]');
    expect(input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new ClaudeAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('getLatestResponseText returns empty string when no response exists', () => {
    document.querySelectorAll('.font-claude-response-body').forEach((el) => el.remove());
    document.querySelectorAll('.font-claude-message').forEach((el) => el.remove());
    expect(new ClaudeAdapter().getLatestResponseText()).toBe('');
  });

  it('getCurrentInputText returns whatever is currently in the input', async () => {
    const a = new ClaudeAdapter();
    await a.setInputValue('typed text');
    expect(a.getCurrentInputText()).toContain('typed text');
  });

  it('getResponseSignal counts user messages as a proxy for assistant turns', () => {
    // Fixture contains 2 user messages — Claude's assistant turn count matches.
    expect(new ClaudeAdapter().getResponseSignal()).toBe(2);
  });

  it('getResponseSignal increments when a new user message is added', () => {
    const a = new ClaudeAdapter();
    const before = a.getResponseSignal();
    const next = document.createElement('div');
    next.setAttribute('data-testid', 'user-message');
    next.textContent = 'a fresh user prompt';
    document.body.appendChild(next);
    expect(a.getResponseSignal()).toBe(before + 1);
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

  it('diagnose() reports all elements found on a healthy page', () => {
    const diag = new ClaudeAdapter().diagnose();
    expect(diag.site).toBe('Claude');
    expect(diag.inputFound).toBe(true);
    expect(diag.sendButtonFound).toBe(true);
    expect(diag.responseContainerFound).toBe(true);
  });

  it('diagnose() reports inputFound false when the input is missing', () => {
    document.querySelector('[contenteditable="true"]')?.remove();
    const diag = new ClaudeAdapter().diagnose();
    expect(diag.inputFound).toBe(false);
  });
});
