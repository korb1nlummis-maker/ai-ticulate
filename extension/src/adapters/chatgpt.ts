import { AdapterDiagnostics, SiteAdapter } from './types.js';

/**
 * Adapter for chatgpt.com. Uses resilient heuristics: prefers stable
 * attributes (id, data-testid, aria-label, author-role) over generated
 * class names. If ChatGPT redesigns, this is the only file that changes.
 *
 * NOTE: these selectors are best-effort. They were built against HTML
 * fixtures, not the live site — the pre-release checklist requires
 * verifying each selector chain against the real chatgpt.com DOM. The
 * fallback chains go most-specific -> most-generic so that a redesign
 * degrades gracefully instead of failing outright.
 */
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';

  private findInput(): HTMLElement | null {
    return (
      // Most specific: ChatGPT's known stable identifiers.
      document.querySelector<HTMLElement>('#prompt-textarea') ??
      document.querySelector<HTMLElement>('[data-testid="prompt-textarea"]') ??
      // Broader: any textarea/contenteditable scoped to the chat region.
      document.querySelector<HTMLElement>('main textarea') ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]') ??
      document.querySelector<HTMLElement>('form textarea') ??
      document.querySelector<HTMLElement>('textarea[placeholder]') ??
      document.querySelector<HTMLElement>('main [role="textbox"]') ??
      // Last resort: any contenteditable inside the form/main region.
      document.querySelector<HTMLElement>('form [contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    return (
      // Most specific: ChatGPT's known stable identifiers.
      document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label="Send prompt"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('form button[type="submit"]') ??
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the composer form.
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
    if (!input) throw new Error('ChatGPTAdapter: input not found');

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // contenteditable editor (ProseMirror / rich-textarea / etc.): try multiple
    // strategies, verifying the text actually landed after each.
    input.focus();
    const selectAll = (): void => {
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(input);
      sel.removeAllRanges();
      sel.addRange(range);
    };
    const landed = (): boolean => (input.textContent ?? '').includes(text);

    // Strategy 1: execCommand insertText (runs through the editor's input pipeline)
    selectAll();
    try {
      document.execCommand('insertText', false, text);
    } catch {
      /* not supported here */
    }

    // Strategy 2: beforeinput event carrying the data (ProseMirror listens for this)
    if (!landed()) {
      selectAll();
      try {
        input.dispatchEvent(
          new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text,
          }),
        );
      } catch {
        /* ignore */
      }
    }

    // Strategy 3: last-resort direct textContent set
    if (!landed()) {
      input.textContent = text;
    }

    // Always fire input so the editor / framework state syncs.
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
    );
  }

  clickSend(): void {
    const input = this.findInput();
    if (input) {
      input.focus();
      for (const type of ['keydown', 'keyup'] as const) {
        input.dispatchEvent(
          new KeyboardEvent(type, {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          } as KeyboardEventInit),
        );
      }
      return;
    }
    // No input handle — fall back to the send button if we can find one.
    const btn = this.findSendButton();
    if (btn) {
      btn.click();
      return;
    }
    throw new Error('ChatGPTAdapter: cannot send — no input or send button found');
  }

  getLatestResponseText(): string {
    // Most specific: assistant messages by author-role attribute.
    const selectorChain = [
      '[data-message-author-role="assistant"]',
      'article[data-message-author-role="assistant"]',
      // Broader: rendered markdown blocks (ChatGPT wraps assistant content
      // in `.markdown`); these can appear inside assistant turns only.
      '[data-message-author-role="assistant"] .markdown',
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
    // While generating, ChatGPT shows a stop control. Its absence means the
    // response is done. Check several selector variants so a small attribute
    // change doesn't make us think generation finished prematurely.
    const stop =
      document.querySelector('[data-testid="stop-button"]') ??
      document.querySelector('button[aria-label*="Stop" i]') ??
      document.querySelector('[aria-label*="Stop generating" i]');
    return stop === null;
  }

  diagnose(): AdapterDiagnostics {
    const input = this.findInput();
    const sendButton = this.findSendButton();
    // responseContainer: reuse the same selectors getLatestResponseText relies on.
    const responseEl = document.querySelector('[data-message-author-role="assistant"]');
    const notes: string[] = [];
    if (input)
      notes.push(
        `input: <${input.tagName.toLowerCase()}> ${input.getAttribute('id') ? '#' + input.getAttribute('id') : ''}`.trim(),
      );
    else notes.push('input: NOT FOUND');
    if (sendButton)
      notes.push(`sendButton: aria-label="${sendButton.getAttribute('aria-label') ?? ''}"`);
    else notes.push('sendButton: NOT FOUND (Enter-key send will be used)');
    notes.push(
      responseEl
        ? 'responseContainer: found'
        : 'responseContainer: NOT FOUND (cannot read AI replies)',
    );
    return {
      site: this.name,
      inputFound: input !== null,
      sendButtonFound: sendButton !== null,
      responseContainerFound: responseEl !== null,
      notes,
    };
  }
}
