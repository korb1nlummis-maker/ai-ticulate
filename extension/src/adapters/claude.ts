import { AdapterDiagnostics, SiteAdapter } from './types.js';
import {
  findLatestMessageTextStructurally,
  insertTextIntoEditable,
  looksLikeNonSendButton,
} from './dom-utils.js';
import {
  describeActiveElement,
  execInsertTextSupported,
  readInputCurrentText,
} from './diag-utils.js';
import { trace } from '../trace.js';

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
      document.querySelector<HTMLElement>('[data-testid="chat-input"] [contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[data-testid="chat-input"] .ProseMirror') ??
      document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]') ??
      document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="prompt" i]') ??
      (() => {
        const ci = document.querySelector<HTMLElement>('[data-testid="chat-input"]');
        return ci && ci.isContentEditable ? ci : null;
      })() ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    const candidate =
      // Most specific: Claude's known aria-labels.
      document.querySelector<HTMLButtonElement>('button[aria-label="Send message"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]') ??
      // Broader: the composer's submit control.
      document.querySelector<HTMLButtonElement>('button[type="submit"]') ??
      // Last resort: the final button in the composer form/fieldset.
      document.querySelector<HTMLButtonElement>('fieldset button:last-of-type') ??
      document.querySelector<HTMLButtonElement>('form button:last-of-type');
    // Never return a button whose aria-label indicates a non-send action
    // (e.g. "Add files, connectors, and more") — that would mis-send.
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
    trace('ClaudeAdapter.setInputValue', 'inputFound=' + (input ? 'yes' : 'no'));
    if (!input) throw new Error('ClaudeAdapter: input not found');

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const landed = await insertTextIntoEditable(input, text);
    if (!landed) {
      throw new Error('ClaudeAdapter: could not type text into the input editor');
    }
  }

  clickSend(): void {
    const input = this.findInput();
    const btn = this.findSendButton();
    trace(
      'ClaudeAdapter.clickSend',
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
      throw new Error('ClaudeAdapter: cannot send — no input or send button found');
    }
  }

  getLatestResponseText(): string {
    const via = (label: string, result: string): string => {
      trace('ClaudeAdapter.getLatestResponseText', label + ' returnedLen=' + result.length);
      return result;
    };
    const paragraphs = Array.from(
      document.querySelectorAll<HTMLElement>('.font-claude-response-body'),
    );
    if (paragraphs.length > 0) {
      // The latest assistant turn = all response paragraphs that appear AFTER
      // the last user message in document order.
      const userMsgs = document.querySelectorAll<HTMLElement>('[data-testid="user-message"]');
      const lastUser = userMsgs[userMsgs.length - 1] ?? null;
      let latest = paragraphs;
      if (lastUser) {
        latest = paragraphs.filter(
          (p) =>
            (lastUser.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        );
      }
      const chosen = latest.length > 0 ? latest : paragraphs;

      // Read the tightest common ancestor of the latest paragraphs, so any
      // marker headings (rendered from markdown) between paragraphs are also
      // captured — but never go so high that we'd include the user message.
      let container: HTMLElement | null = chosen[0] ?? null;
      if (container) {
        while (
          container.parentElement &&
          !chosen.every((p) => container!.contains(p))
        ) {
          container = container.parentElement;
        }
        // Safety: if the container also swallowed the user message, it's too
        // high — fall back to concatenating just the paragraph texts.
        if (lastUser && container && container.contains(lastUser)) {
          return via(
            'via=font-claude-response-body(paragraphs) count=' + chosen.length,
            chosen
              .map((p) => p.textContent?.trim() ?? '')
              .filter((t) => t.length > 0)
              .join('\n'),
          );
        }
        const text = container?.textContent?.trim() ?? '';
        if (text.length > 0) {
          return via('via=font-claude-response-body count=' + chosen.length, text);
        }
      }
      // Fallback: concatenate the chosen paragraph texts.
      return via(
        'via=font-claude-response-body(paragraphs) count=' + chosen.length,
        chosen
          .map((p) => p.textContent?.trim() ?? '')
          .filter((t) => t.length > 0)
          .join('\n'),
      );
    }

    // Older guessed selectors, kept as a secondary fallback.
    for (const sel of ['[data-testid="assistant-message"]', '.font-claude-message']) {
      const els = document.querySelectorAll<HTMLElement>(sel);
      if (els.length > 0) {
        const last = els[els.length - 1];
        const text = (last?.textContent ?? '').trim();
        if (text.length > 0) return via('via=' + sel, text);
      }
    }

    const structural = findLatestMessageTextStructurally();
    return via(structural.length > 0 ? 'via=structural' : 'via=none', structural);
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

  diagnose(): AdapterDiagnostics {
    const input = this.findInput();
    const sendButton = this.findSendButton();
    // responseContainer: reuse the real selector getLatestResponseText relies on.
    const responseEl = document.querySelector('.font-claude-response-body');
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
    // Always dump the stable chat-input anchor's structure if present.
    const chatInputEl = document.querySelector('[data-testid="chat-input"]');
    if (chatInputEl) {
      notes.push(
        '[data-testid="chat-input"] outerHTML (first 1200): ' +
          chatInputEl.outerHTML.slice(0, 1200),
      );
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
    const userMessageCount = document.querySelectorAll('[data-testid="user-message"]').length;
    const responseBlockCount = document.querySelectorAll('.font-claude-response-body').length;
    return {
      site: this.name,
      inputFound: input !== null,
      sendButtonFound: sendButton !== null,
      responseContainerFound: responseEl !== null,
      inputCurrentText: readInputCurrentText(input),
      activeElement: describeActiveElement(),
      execCommandSupported: execInsertTextSupported(),
      documentHasFocus: document.hasFocus(),
      conversationTurns: `userMessages=${userMessageCount} responseBlocks=${responseBlockCount}`,
      notes,
    };
  }
}
