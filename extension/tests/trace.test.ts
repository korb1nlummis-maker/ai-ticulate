import { describe, it, expect, beforeEach } from 'vitest';
import { trace, traceReset, formatTrace } from '../src/trace.js';

describe('execution trace', () => {
  beforeEach(() => {
    traceReset();
  });

  it('traceReset clears previously recorded entries', () => {
    trace('step one');
    trace('step two');
    expect(formatTrace()).not.toBe('(no trace recorded)');
    traceReset();
    expect(formatTrace()).toBe('(no trace recorded)');
  });

  it('trace appends entries that formatTrace renders', () => {
    trace('AppController.submitRequest', 'hello world');
    trace('Orchestrator.start');
    const text = formatTrace();
    expect(text).toContain('AppController.submitRequest — hello world');
    expect(text).toContain('Orchestrator.start');
    // Two entries -> two lines.
    expect(text.split('\n')).toHaveLength(2);
  });

  it('formatTrace reports when nothing has been recorded', () => {
    expect(formatTrace()).toBe('(no trace recorded)');
  });

  it('caps retained entries at MAX_ENTRIES (200)', () => {
    for (let i = 0; i < 250; i++) trace('step ' + i);
    const lines = formatTrace().split('\n');
    expect(lines.length).toBeLessThanOrEqual(200);
    // The most recent entries are kept; the oldest are dropped.
    expect(formatTrace()).toContain('step 249');
    expect(formatTrace()).not.toContain('step 0 ');
  });

  it('each rendered line carries a relative timestamp', () => {
    trace('a step');
    expect(formatTrace()).toMatch(/^\s+\+\d+ms\s+a step$/);
  });
});
