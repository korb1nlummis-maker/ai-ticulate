import { describe, it, expect } from 'vitest';
import { AppController } from '../../src/content/app.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

function setup() {
  const adapter = new FakeAdapter();
  const bridge = new AIBridge(adapter, { pollIntervalMs: 2, timeoutMs: 1000 });
  const controller = new AppController(bridge);
  return { adapter, controller };
}

describe('AppController', () => {
  it('starts idle and transitions to a questions view after submitting a request', async () => {
    const { adapter, controller } = setup();
    expect(controller.view.kind).toBe('idle');

    const p = controller.submitRequest('build me a website');
    setTimeout(() => {
      adapter.scriptResponse(
        `### QUESTION\nWho is it for?\n### SUGGESTIONS\nClients\n### STATUS\nneed-more`,
        { complete: true },
      );
    }, 5);
    await p;
    expect(controller.view.kind).toBe('questions');
  });

  it('shows an error view if the bridge throws', async () => {
    const { adapter, controller } = setup();
    adapter.setReady(false); // bridge throws "not ready"
    await controller.submitRequest('anything');
    expect(controller.view.kind).toBe('error');
  });

  it('notifies subscribers on view change', async () => {
    const { adapter, controller } = setup();
    let calls = 0;
    controller.subscribe(() => {
      calls++;
    });
    const p = controller.submitRequest('x');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await p;
    expect(calls).toBeGreaterThan(0);
  });
});
