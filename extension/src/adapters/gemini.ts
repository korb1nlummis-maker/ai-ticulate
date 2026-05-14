import { SiteAdapter } from './types.js';

/**
 * Adapter for gemini.google.com. Uses resilient heuristics over stable
 * attributes (rich-textarea contenteditable, aria-label, message-content).
 * If Gemini redesigns, this is the only file that changes.
 *
 * NOTE: these selectors are best-effort. They were built against HTML
 * fixtures, not the live site — the pre-release checklist requires
 * verifying each selector chain against the real gemini.google.com DOM.
 * The fallback chains go most-specific -> most-generic so that a redesign
 * degrades gracefully instead of failing outright.
 */
export class GeminiAdapter implements SiteAdapter {
  readonly name = 'Gemini';

  private findInput(): HTMLElement | null {
    return (
      // Most specific: Gemini's rich-textarea web component and labelled box.
      document.querySelector<HTMLElement>('rich-textarea [contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="prompt" i]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="Enter a prompt" i]') ??
      // Broader: a textbox-role contenteditable scoped to the chat region.
      document.querySelector<HTMLElement>('main [role="textbox"]') ??
      document.querySelector<HTMLElement>('[role="textbox"]') ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]') ??
      // Last resort: any contenteditable on the page.
      document.querySelector<HTMLElement>('[contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    return (
      // Most specific: Gemini's known aria-labels.
      document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the input area / composer form.
      document.querySelector<HTMLButtonElement>('.input-area button:last-of-type') ??
      document.querySelector<HTMLButtonElement>('form button:last-of-type')
    );
  }

  isReady(): boolean {
    // A send button that exists but is `disabled` (e.g. empty input) still
    // means the chat UI is fully present and ready to be driven — we will
    // populate the input ourselves before clicking, which enables it. So we
    // only require that the elements exist, not that the button is enabled.
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
    const selectorChain = [
      // Most specific: Gemini's known model-response markers.
      'message-content',
      '.model-response-text',
      // Broader: the model-response web component wrapper, or any element
      // whose class hints at a model response turn.
      'model-response',
      '[class*="model-response" i]',
    ];
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
    // While generating, Gemini shows a stop control. Its absence means the
    // response is done. Check several selector variants so a small attribute
    // change doesn't make us think generation finished prematurely.
    const stop =
      document.querySelector('[data-testid="stop-button"]') ??
      document.querySelector('button[aria-label*="Stop" i]') ??
      document.querySelector('[aria-label*="Stop generating" i]');
    return stop === null;
  }
}
