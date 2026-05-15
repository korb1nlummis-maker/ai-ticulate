import { describe, it, expect, beforeEach } from 'vitest';
import {
  findLatestMessageTextStructurally,
  insertTextIntoEditable,
} from '../../src/adapters/dom-utils.js';

/**
 * Build a DOM with our own injected panel plus a couple of message-like blocks,
 * using document.createElement only (never innerHTML).
 */
function buildDom(): void {
  const main = document.createElement('main');

  // Our own injected panel — must be ignored by the structural heuristic.
  const ourPanelText =
    'ai-ticulate panel content that is quite long and substantial here';
  const ourPanel = document.createElement('div');
  ourPanel.id = 'ai-ticulate-root';
  const ourInner = document.createElement('div');
  ourInner.textContent = ourPanelText;
  ourPanel.appendChild(ourInner);
  main.appendChild(ourPanel);

  // First assistant-ish message block: a wrapper with two paragraphs.
  const msg1 = document.createElement('div');
  const p1a = document.createElement('p');
  p1a.textContent = 'This is the first assistant message in the conversation.';
  const p1b = document.createElement('p');
  p1b.textContent = 'It has a second paragraph too.';
  msg1.appendChild(p1a);
  msg1.appendChild(p1b);
  main.appendChild(msg1);

  // Second (latest) assistant message block: a wrapper whose direct children
  // are each short (< MIN_TEXT) so no single child holds the text and no child
  // is itself a candidate — the wrapper is the last candidate in doc order.
  const msg2 = document.createElement('div');
  const span2a = document.createElement('span');
  span2a.textContent = 'This is ';
  const span2b = document.createElement('span');
  span2b.textContent = 'the SECOND ';
  const span2c = document.createElement('span');
  span2c.textContent = 'assistant ';
  const span2d = document.createElement('span');
  span2d.textContent = 'message, ';
  const span2e = document.createElement('span');
  span2e.textContent = 'the latest turn.';
  msg2.appendChild(span2a);
  msg2.appendChild(span2b);
  msg2.appendChild(span2c);
  msg2.appendChild(span2d);
  msg2.appendChild(span2e);
  main.appendChild(msg2);

  document.body.replaceChildren(main);
}

describe('findLatestMessageTextStructurally', () => {
  beforeEach(() => {
    buildDom();
  });

  it('returns the last message-like block text', () => {
    const text = findLatestMessageTextStructurally();
    expect(text).toContain('SECOND assistant message');
    expect(text).toContain('the latest turn.');
    expect(text).not.toContain('first assistant message');
  });

  it('ignores our own #ai-ticulate-root panel', () => {
    const text = findLatestMessageTextStructurally();
    expect(text).not.toContain('ai-ticulate panel content');
  });

  it('returns empty string when there are no substantial blocks', () => {
    const main = document.createElement('main');
    const tiny = document.createElement('div');
    tiny.textContent = 'short';
    main.appendChild(tiny);
    document.body.replaceChildren(main);
    expect(findLatestMessageTextStructurally()).toBe('');
  });
});

describe('insertTextIntoEditable', () => {
  it('lands text into a contenteditable element', async () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.replaceChildren(div);
    const ok = await insertTextIntoEditable(div, 'hello world');
    expect(ok).toBe(true);
    expect(div.textContent ?? '').toContain('hello world');
  });

  it('considers text landed even when newlines are collapsed (TipTap <p>-splitting)', async () => {
    // Simulates TipTap/ProseMirror behavior: the inserted text contains \n\n
    // paragraph separators, but the editor renders each paragraph in its own
    // <p>, and textContent re-concatenates without the newline. The strict
    // substring check would falsely report landed=false; the normalized check
    // must report landed=true.
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.replaceChildren(div);
    const input = 'line one\n\nline two';
    const ok = await insertTextIntoEditable(div, input);
    expect(ok).toBe(true);
    // Sanity: the function did get text into the editor; the precise whitespace
    // representation is editor-dependent, so we only assert the normalized
    // content matches.
    const normalized = (div.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(normalized).toContain('line one');
    expect(normalized).toContain('line two');
  });
});
