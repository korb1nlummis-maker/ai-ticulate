/**
 * A lightweight, module-level execution trace. The flow (AppController →
 * Orchestrator → AIBridge → SiteAdapter) appends timestamped steps as it runs.
 * On a failure (or success), the full trace is included in the diagnostics —
 * so one capture shows exactly where and how the flow broke.
 */
export type TraceEntry = { t: number; step: string; detail?: string };

const MAX_ENTRIES = 200;
let entries: TraceEntry[] = [];
let startTime = 0;

/** Begin a fresh trace (call at the start of each user-initiated action). */
export function traceReset(): void {
  entries = [];
  startTime = Date.now();
}

/** Record a step. `detail` is optional extra context. */
export function trace(step: string, detail?: string): void {
  if (startTime === 0) startTime = Date.now();
  entries.push({ t: Date.now() - startTime, step, detail });
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
}

/** The trace as readable multi-line text. */
export function formatTrace(): string {
  if (entries.length === 0) return '(no trace recorded)';
  return entries
    .map((e) => `  +${e.t}ms  ${e.step}${e.detail ? ' — ' + e.detail : ''}`)
    .join('\n');
}
