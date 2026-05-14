import { SiteAdapter } from './types.js';

/**
 * Adapter for claude.ai. Uses resilient heuristics over stable attributes
 * (ProseMirror contenteditable, aria-label, data-testid). If Claude redesigns,
 * this is the only file that changes.
 */
export class ClaudeAdapter implements SiteAdapter {
  readonly name = 'Claude';

  private findInput(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="prompt" i]') ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    return (
      document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]')
    );
  }

  isReady(): boolean {
    return this.findInput() !== null && this.findSendButton() !== null;
  }

  setInputValue(text: string): void {
    const input = this.findInput();
    if (!input) throw new Error('ClaudeAdapter: input not found');
    if (input instanceof HTMLTextAreaElement) {
      input.value = text;
    } else {
      input.textContent = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  clickSend(): void {
    const btn = this.findSendButton();
    if (!btn) throw new Error('ClaudeAdapter: send button not found');
    btn.click();
  }

  getLatestResponseText(): string {
    const selectorChain = ['[data-testid="assistant-message"]', '.font-claude-message'];
    for (const sel of selectorChain) {
      const messages = document.querySelectorAll<HTMLElement>(sel);
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        return last?.textContent?.trim() ?? '';
      }
    }
    return '';
  }

  isResponseComplete(): boolean {
    const stop = document.querySelector('button[aria-label*="Stop" i]');
    return stop === null;
  }
}
