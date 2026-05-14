import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/orchestrator/orchestrator.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

function makeOrchestrator() {
  const adapter = new FakeAdapter();
  const bridge = new AIBridge(adapter, { pollIntervalMs: 2, timeoutMs: 1000 });
  const orch = new Orchestrator(bridge);
  return { adapter, orch };
}

describe('Orchestrator', () => {
  it('starts in idle, moves to refining on start()', async () => {
    const { adapter, orch } = makeOrchestrator();
    expect(orch.state).toBe('idle');

    const startPromise = orch.start('build me a website');
    setTimeout(() => {
      adapter.scriptResponse(
        `### QUESTION\nWho is it for?\n### SUGGESTIONS\nClients\nFriends\n### STATUS\nneed-more`,
        { complete: true },
      );
    }, 5);
    const result = await startPromise;
    expect(orch.state).toBe('refining');
    expect(result.kind).toBe('questions');
  });

  it('moves to presenting-options once the AI returns 5 options', async () => {
    const { adapter, orch } = makeOrchestrator();
    const startP = orch.start('build me a website');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await startP;

    const optsP = orch.requestOptions();
    setTimeout(() => {
      adapter.scriptResponse(
        `### OPTION 1\nA\n### OPTION 2\nB\n### OPTION 3\nC\n### OPTION 4\nD\n### OPTION 5\nE`,
        { complete: true },
      );
    }, 5);
    const result = await optsP;
    expect(result.kind).toBe('options');
    expect(orch.state).toBe('presenting-options');
  });

  it('finalize() sends the chosen prompt and moves to done', async () => {
    const { adapter, orch } = makeOrchestrator();
    const startP = orch.start('build a website');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await startP;

    const finalizeP = orch.finalize('Design a minimal portfolio site for a photographer');
    setTimeout(
      () => adapter.scriptResponse('Here is your website plan...', { complete: true }),
      5,
    );
    const finalText = await finalizeP;
    expect(
      adapter.sentMessages.some((m) => m.includes('Design a minimal portfolio site')),
    ).toBe(true);
    expect(finalText).toContain('Here is your website plan');
    expect(orch.state).toBe('done');
  });

  it('recordAnswer before start() throws', () => {
    const { orch } = makeOrchestrator();
    expect(() => orch.recordAnswer('q', 'a')).toThrow(/start/i);
  });
});
