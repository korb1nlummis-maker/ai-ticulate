import { SiteAdapter } from './types.js';

/**
 * Adapter for chatgpt.com. Uses resilient heuristics: prefers stable
 * attributes (id, data-testid, aria-label, author-role) over generated
 * class names. If ChatGPT redesigns, this is the only file that changes.
 */
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';

  private findInput(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('#prompt-textarea') ??
      document.querySelector<HTMLElement>('[data-testid="prompt-textarea"]') ??
      document.querySelector<HTMLElement>('main textarea') ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    return (
      document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label="Send prompt"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]')
    );
  }

  isReady(): boolean {
    return this.findInput() !== null && this.findSendButton() !== null;
  }

  setInputValue(text: string): void {
    const input = this.findInput();
    if (!input) throw new Error('ChatGPTAdapter: input not found');
    if (input instanceof HTMLTextAreaElement) {
      input.value = text;
    } else {
      input.textContent = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  clickSend(): void {
    const btn = this.findSendButton();
    if (!btn) throw new Error('ChatGPTAdapter: send button not found');
    btn.click();
  }

  getLatestResponseText(): string {
    const messages = document.querySelectorAll<HTMLElement>(
      '[data-message-author-role="assistant"]',
    );
    const last = messages[messages.length - 1];
    return last?.textContent?.trim() ?? '';
  }

  isResponseComplete(): boolean {
    const stop =
      document.querySelector('[data-testid="stop-button"]') ??
      document.querySelector('button[aria-label*="Stop" i]');
    return stop === null;
  }
}
