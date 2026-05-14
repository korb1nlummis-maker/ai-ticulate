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
