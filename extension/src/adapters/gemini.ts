import { SiteAdapter } from './types.js';

/**
 * Adapter for gemini.google.com. Uses resilient heuristics over stable
 * attributes (rich-textarea contenteditable, aria-label, message-content).
 * If Gemini redesigns, this is the only file that changes.
 */
export class GeminiAdapter implements SiteAdapter {
  readonly name = 'Gemini';

  private findInput(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('rich-textarea [contenteditable="true"]') ??
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
    if (!input) throw new Error('GeminiAdapter: input not found');
    if (input instanceof HTMLTextAreaElement) {
      input.value = text;
    } else {
      input.textContent = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  clickSend(): void {
    const btn = this.findSendButton();
    if (!btn) throw new Error('GeminiAdapter: send button not found');
    btn.click();
  }

  getLatestResponseText(): string {
    const selectorChain = ['message-content', '.model-response-text'];
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
