import { AdapterDiagnostics, SiteAdapter } from './types.js';
import {
  findLatestMessageTextStructurally,
  insertTextIntoEditable,
  looksLikeNonSendButton,
} from './dom-utils.js';

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
    const candidate =
      // Most specific: ChatGPT's known stable identifiers.
      document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label="Send prompt"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('form button[type="submit"]') ??
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the composer form.
      document.querySelector<HTMLButtonElement>('form button:last-of-type');
    // Never return a button whose aria-label indicates a non-send action.
    if (candidate && looksLikeNonSendButton(candidate)) return null;
    return candidate;
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

    insertTextIntoEditable(input, text);
  }

  clickSend(): void {
    const input = this.findInput();
    if (input) {
      input.focus();
      for (const type of ['keydown', 'keypress', 'keyup'] as const) {
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
    }
    // Also click the send button if we can confidently identify one (its
    // aria-label actually mentions "send"). Both mechanisms run for
    // reliability — whichever works first sends; the site won't send an
    // empty message, so a second no-op on an already-cleared editor is safe.
    const btn = this.findSendButton();
    if (
      btn &&
      !btn.disabled &&
      (btn.getAttribute('aria-label') ?? '').toLowerCase().includes('send')
    ) {
      btn.click();
    }
    if (!input && !btn) {
      throw new Error('ChatGPTAdapter: cannot send — no input or send button found');
    }
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
        const text = (last?.textContent ?? '').trim();
        if (text.length > 0) return text;
      }
    }
    // Structural fallback — selectors didn't match the live DOM.
    return findLatestMessageTextStructurally();
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
    if (input) {
      const attrs = Array.from(input.attributes)
        .map((a) => `${a.name}="${a.value}"`)
        .join(' ');
      notes.push(
        `input: <${input.tagName.toLowerCase()} ${attrs}> contentEditable=${input.isContentEditable}`,
      );
      // Surrounding structure (two levels up) so the real editable can be located.
      const ctx = input.parentElement?.parentElement ?? input.parentElement ?? input;
      notes.push(`input context outerHTML (first 700): ${ctx.outerHTML.slice(0, 700)}`);
    } else {
      notes.push('input: NOT FOUND');
    }
    if (sendButton)
      notes.push(`sendButton: aria-label="${sendButton.getAttribute('aria-label') ?? ''}"`);
    else notes.push('sendButton: NOT FOUND (Enter-key send will be used)');
    notes.push(
      responseEl
        ? 'responseContainer: found'
        : 'responseContainer: NOT FOUND (cannot read AI replies)',
    );
    if (!responseEl) {
      // Dump DOM intelligence so the real response selector can be identified.
      const testIds = Array.from(
        new Set(
          Array.from(document.querySelectorAll('[data-testid]'))
            .map((e) => e.getAttribute('data-testid'))
            .filter((v): v is string => v !== null),
        ),
      );
      notes.push(
        `data-testid values on page (${testIds.length}): ${testIds.slice(0, 50).join(', ')}`,
      );

      const main = document.querySelector('main') ?? document.body;
      const blocks = Array.from(main.querySelectorAll<HTMLElement>('*'))
        .filter((e) => {
          const t = (e.textContent ?? '').trim();
          return t.length > 40 && !e.closest('#ai-ticulate-root');
        })
        .slice(-10)
        .map((e) => {
          const cls = (e.getAttribute('class') ?? '').slice(0, 80);
          const tid = e.getAttribute('data-testid') ?? '';
          const snippet = (e.textContent ?? '').trim().slice(0, 50).replace(/\s+/g, ' ');
          return `<${e.tagName.toLowerCase()} class="${cls}" data-testid="${tid}"> "${snippet}"`;
        });
      notes.push(`last 10 substantial text blocks in <main>:`);
      for (const b of blocks) notes.push(`  ${b}`);

      const buttons = Array.from(document.querySelectorAll('button'))
        .slice(0, 40)
        .map((b) => {
          const al = b.getAttribute('aria-label') ?? '';
          const ti = b.getAttribute('title') ?? '';
          const ty = b.getAttribute('type') ?? '';
          const dis = (b as HTMLButtonElement).disabled ? ' disabled' : '';
          const txt = (b.textContent ?? '').trim().slice(0, 25);
          return `button[aria-label="${al}" title="${ti}" type="${ty}"${dis}] "${txt}"`;
        });
      notes.push(`buttons on page (first 40):`);
      for (const b of buttons) notes.push(`  ${b}`);
    }
    return {
      site: this.name,
      inputFound: input !== null,
      sendButtonFound: sendButton !== null,
      responseContainerFound: responseEl !== null,
      notes,
    };
  }
}
