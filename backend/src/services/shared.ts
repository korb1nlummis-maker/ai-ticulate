/**
 * Shared types and helpers across pre-talk, variants, and context services.
 */

export type QATurn = { q: string; a: string };

/**
 * Render Q&A turns as the string format embedded in prompts.
 * Empty array → "(none yet)" so prompt templates can show something sensible.
 */
export function formatQaHistory(qa: QATurn[]): string {
  if (qa.length === 0) return '(none yet)';
  return qa.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join('\n');
}
