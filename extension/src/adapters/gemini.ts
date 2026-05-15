import { AdapterDiagnostics, SiteAdapter } from './types.js';
import { insertTextIntoEditable, looksLikeNonSendButton } from './dom-utils.js';
import {
  describeActiveElement,
  execInsertTextSupported,
  readInputCurrentText,
} from './diag-utils.js';
import { trace } from '../trace.js';

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
    const candidate =
      // Most specific: Gemini's known aria-labels.
      document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the input area / composer form.
      document.querySelector<HTMLButtonElement>('.input-area button:last-of-type') ??
      document.querySelector<HTMLButtonElement>('form button:last-of-type');
    // Never return a button whose aria-label indicates a non-send action.
    if (candidate && looksLikeNonSendButton(candidate)) return null;
    return candidate;
  }

  isReady(): boolean {
    // Only the input must exist. The send button is intentionally NOT required:
    // these sites only render it once the input has text, and our flow starts
    // with an empty input. The Enter-key send works without the button anyway.
    return this.findInput() !== null;
  }

  async setInputValue(text: string): Promise<void> {
    const input = this.findInput();
    trace('GeminiAdapter.setInputValue', 'inputFound=' + (input ? 'yes' : 'no'));
    if (!input) throw new Error('GeminiAdapter: input not found');

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const landed = await insertTextIntoEditable(input, text);
    if (!landed) {
      throw new Error('GeminiAdapter: could not type text into the input editor');
    }
  }

  clickSend(): void {
    const input = this.findInput();
    const btn = this.findSendButton();
    trace(
      'GeminiAdapter.clickSend',
      'input=' + (input ? 'yes' : 'no') + ' button=' + (btn ? 'yes' : 'no'),
    );
    if (input) {
      input.focus();
      const fire = (type: 'keydown' | 'keypress' | 'keyup'): void => {
        input.dispatchEvent(
          new KeyboardEvent(type, {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            shiftKey: false,
            bubbles: true,
            cancelable: true,
          } as KeyboardEventInit),
        );
      };
      fire('keydown');
      fire('keypress');
      fire('keyup');
    }
    // Also click a confidently-identified send button if one is present.
    if (
      btn &&
      !btn.disabled &&
      (btn.getAttribute('aria-label') ?? '').toLowerCase().includes('send')
    ) {
      btn.click();
    }
    if (!input && !btn) {
      throw new Error('GeminiAdapter: cannot send — no input or send button found');
    }
  }

  getLatestResponseText(): string {
    const via = (label: string, result: string): string => {
      trace('GeminiAdapter.getLatestResponseText', label + ' returnedLen=' + result.length);
      return result;
    };
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
        const text = (last?.textContent ?? '').trim();
        if (text.length > 0) return via('via=' + sel + ' count=' + messages.length, text);
      }
    }
    // No specific selector matched. Do NOT fall back to a structural scan —
    // it would happily grab page chrome (footers, model-selector text) and
    // hand the bridge a "false positive" non-empty response. Return '' and
    // let the bridge's empty-response-grace handle the no-response-yet case.
    return via('via=none', '');
  }

  getCurrentInputText(): string {
    const input = this.findInput();
    if (!input) return '';
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      return input.value;
    }
    return input.textContent ?? '';
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

  getResponseSignal(): number {
    return (
      document.querySelectorAll('message-content').length ||
      document.querySelectorAll('.model-response-text').length
    );
  }

  diagnose(): AdapterDiagnostics {
    const input = this.findInput();
    const sendButton = this.findSendButton();
    // responseContainer: reuse the same selectors getLatestResponseText relies on.
    const responseEl =
      document.querySelector('message-content') ??
      document.querySelector('.model-response-text');
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
    const responseBlockCount = document.querySelectorAll('message-content').length;
    return {
      site: this.name,
      inputFound: input !== null,
      sendButtonFound: sendButton !== null,
      responseContainerFound: responseEl !== null,
      inputCurrentText: readInputCurrentText(input),
      activeElement: describeActiveElement(),
      execCommandSupported: execInsertTextSupported(),
      documentHasFocus: document.hasFocus(),
      conversationTurns: `responseBlocks=${responseBlockCount}`,
      notes,
    };
  }
}
