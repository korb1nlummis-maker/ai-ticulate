import { SiteAdapter } from './types.js';

/**
 * Adapter for claude.ai. Uses resilient heuristics over stable attributes
 * (ProseMirror contenteditable, aria-label, data-testid). If Claude redesigns,
 * this is the only file that changes.
 *
 * NOTE: these selectors are best-effort. They were built against HTML
 * fixtures, not the live site — the pre-release checklist requires
 * verifying each selector chain against the real claude.ai DOM. The
 * fallback chains go most-specific -> most-generic so that a redesign
 * degrades gracefully instead of failing outright.
 */
export class ClaudeAdapter implements SiteAdapter {
  readonly name = 'Claude';

  private findInput(): HTMLElement | null {
    return (
      // Most specific: Claude's ProseMirror editor and labelled textbox.
      document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]') ??
      document.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="prompt" i]') ??
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
      // Most specific: Claude's known aria-labels.
      document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the composer form/fieldset.
      document.querySelector<HTMLButtonElement>('fieldset button:last-of-type') ??
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
    const selectorChain = [
      // Most specific: Claude's known assistant-message markers.
      '[data-testid="assistant-message"]',
      '.font-claude-message',
      // Broader: any element flagged as a non-user / model turn.
      '[data-testid*="assistant" i]',
      '[class*="claude-message" i]',
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
    // While generating, Claude shows a stop control. Its absence means the
    // response is done. Check several selector variants so a small attribute
    // change doesn't make us think generation finished prematurely.
    const stop =
      document.querySelector('[data-testid="stop-button"]') ??
      document.querySelector('button[aria-label*="Stop" i]') ??
      document.querySelector('[aria-label*="Stop generating" i]');
    return stop === null;
  }
}
