import { trace } from '../trace.js';

/**
 * Structural heuristic to find the latest assistant response text when
 * specific selectors fail. Conversation UIs (ChatGPT, Claude, Gemini) render
 * the newest assistant turn last. We look for "message-like" blocks: elements
 * with substantial text that are a tight wrapper around that text (no single
 * child holds essentially all of it — so it's a real content boundary, not an
 * outer layout div), excluding our own injected panel. The last such block in
 * document order is the latest turn (the assistant's response).
 *
 * This is a best-effort fallback. It is not perfect, but it degrades far more
 * gracefully than a hard-coded class name when a site redesigns.
 */
export function findLatestMessageTextStructurally(): string {
  const root = document.querySelector('main') ?? document.body;
  if (!root) return '';

  const MIN_TEXT = 25;
  const candidates: HTMLElement[] = [];

  const all = root.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    // Skip our own UI.
    if (el.id === 'ai-ticulate-root' || el.closest('#ai-ticulate-root')) continue;
    // Skip non-content tags (script/style/etc.) and anything inside one — a
    // <script>'s textContent is code, not a chat message.
    const tag = el.tagName.toUpperCase();
    if (
      tag === 'SCRIPT' ||
      tag === 'STYLE' ||
      tag === 'NOSCRIPT' ||
      tag === 'TEMPLATE' ||
      tag === 'SVG' ||
      tag === 'HEAD' ||
      el.closest('script, style, noscript, template, svg')
    ) {
      continue;
    }
    // Skip form controls / inputs.
    if (
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLInputElement ||
      el.isContentEditable
    ) {
      continue;
    }
    const text = (el.textContent ?? '').trim();
    if (text.length < MIN_TEXT) continue;
    // "Tight wrapper": no single child element contains ~all of this text.
    let childHoldsMost = false;
    for (const child of Array.from(el.children)) {
      const childText = (child.textContent ?? '').trim();
      if (childText.length >= text.length * 0.95) {
        childHoldsMost = true;
        break;
      }
    }
    if (childHoldsMost) continue;
    candidates.push(el);
  }

  if (candidates.length === 0) return '';
  // The latest assistant turn is the last message-like block in document order.
  const last = candidates[candidates.length - 1];
  return (last?.textContent ?? '').trim();
}

/**
 * Words that, when present in a button's aria-label, indicate the button is
 * NOT the chat "send" control (e.g. "Add files, connectors, and more"). Used
 * by every adapter's findSendButton() to reject a wrong fall-through match.
 */
const NON_SEND_LABEL_WORDS = [
  'add',
  'file',
  'attach',
  'connector',
  'model',
  'voice',
  'menu',
  'sidebar',
  'copy',
  'retry',
  'share',
  'pin',
  'settings',
];

export function looksLikeNonSendButton(btn: Element): boolean {
  const label = (btn.getAttribute('aria-label') ?? '').toLowerCase();
  return NON_SEND_LABEL_WORDS.some((w) => label.includes(w));
}

/**
 * Insert text into a contenteditable editor (TipTap/ProseMirror on Claude, etc.)
 * as reliably as possible. `execCommand('insertText')` is the correct method —
 * it fires a trusted `beforeinput` the editor processes through its real
 * pipeline — but it is flaky: if the editor isn't fully focus-settled it
 * silently no-ops. So we focus, let focus settle, try execCommand, verify the
 * text actually landed in the DOM, and RETRY up to a handful of times.
 *
 * Async because the retries need real time between attempts for focus/render
 * to settle. Returns true if the text appears to have landed.
 *
 * Do NOT reintroduce a synthetic-paste strategy — a constructed ClipboardEvent
 * cannot carry clipboard data and it breaks the subsequent execCommand.
 */
export async function insertTextIntoEditable(el: HTMLElement, text: string): Promise<boolean> {
  // Compare with whitespace normalized — editors like TipTap/ProseMirror split
  // text on \n into separate <p> elements, and textContent re-concatenates them
  // without the newline separator, so a strict substring check incorrectly fails.
  const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const targetNorm = norm(text);
  const targetHead = targetNorm.slice(0, 80);
  const landed = (): boolean => {
    const current = norm(el.textContent ?? '');
    if (current.includes(targetNorm)) return true;
    return targetHead.length > 0 && current.includes(targetHead);
  };
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
  const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  trace('insert: start', 'targetTag=' + el.tagName.toLowerCase());

  const MAX_ATTEMPTS = 6;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    el.focus();
    await tick(); // let focus + the editor's own cursor placement settle

    let execSupported = true;
    try {
      document.execCommand('insertText', false, text);
    } catch {
      execSupported = false; // e.g. the happy-dom test environment
    }
    await tick(); // let the editor process the beforeinput + DOM mutation
    trace(
      'insert: attempt ' + (attempt + 1),
      'execSupported=' + execSupported + ' landed=' + landed(),
    );
    if (!execSupported) break; // no point retrying where execCommand doesn't exist

    if (landed()) {
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
      );
      trace('insert: done', 'result=true');
      return true;
    }
    await pause(120); // brief settle before the next attempt
  }

  // Fallback: direct textContent. TipTap/ProseMirror may revert this via its
  // MutationObserver, but it's the last resort and worth a final shot
  // (and it's what makes this function work in the test DOM).
  el.focus();
  el.textContent = text;
  el.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
  );
  await tick();
  trace('insert: textContent fallback', 'landed=' + landed());
  const result = landed();
  trace('insert: done', 'result=' + result);
  return result;
}
