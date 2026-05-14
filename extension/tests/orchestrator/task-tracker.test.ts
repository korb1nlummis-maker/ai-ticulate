import { describe, it, expect } from 'vitest';
import { TaskTracker } from '../../src/orchestrator/task-tracker.js';

describe('TaskTracker', () => {
  it('starts with the original request as the goal summary', () => {
    const t = new TaskTracker('build me a website');
    expect(t.goalSummary).toBe('build me a website');
    expect(t.answers).toEqual([]);
  });

  it('records answered questions', () => {
    const t = new TaskTracker('build me a website');
    t.recordAnswer('Who is it for?', 'Potential clients');
    t.recordAnswer('What style?', 'Minimal');
    expect(t.answers).toEqual([
      'Who is it for? — Potential clients',
      'What style? — Minimal',
    ]);
  });

  it('can refine the goal summary as understanding improves', () => {
    const t = new TaskTracker('build me a website');
    t.refineGoal('a minimal portfolio website for a photographer');
    expect(t.goalSummary).toBe('a minimal portfolio website for a photographer');
  });

  it('produces a snapshot for use in meta-prompts', () => {
    const t = new TaskTracker('build me a website');
    t.recordAnswer('Who is it for?', 'Clients');
    const snap = t.snapshot();
    expect(snap.goalSummary).toBe('build me a website');
    expect(snap.answers).toEqual(['Who is it for? — Clients']);
  });
});
