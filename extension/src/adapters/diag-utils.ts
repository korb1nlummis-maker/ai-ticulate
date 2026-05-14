/**
 * Shared helpers for the richer point-in-time snapshot every adapter's
 * `diagnose()` builds. Read-only DOM inspection — never mutates the page.
 */

/**
 * Describe `document.activeElement` as a short tag string — is focus where we
 * expect it? Notes explicitly when it's `null` or the `<body>`.
 */
export function describeActiveElement(): string {
  const el = document.activeElement;
  if (!el) return 'null (no active element)';
  const tag = el.tagName.toLowerCase();
  if (tag === 'body') return 'body (focus not in any control)';
  const cls = el.getAttribute('class') ?? '';
  const testId = el.getAttribute('data-testid') ?? '';
  const desc = `<${tag} class="${cls}" data-testid="${testId}">`;
  return desc.slice(0, 120);
}

/** Whether `document.queryCommandSupported('insertText')` returns true. */
export function execInsertTextSupported(): boolean {
  try {
    return document.queryCommandSupported('insertText');
  } catch {
    return false;
  }
}

/**
 * The current text of the chat input, trimmed and capped at 200 chars.
 * Handles a null input and both contenteditable and textarea/input elements.
 */
export function readInputCurrentText(input: HTMLElement | null): string {
  if (!input) return '';
  const raw =
    input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement
      ? input.value
      : (input.textContent ?? '');
  return raw.trim().slice(0, 200);
}
