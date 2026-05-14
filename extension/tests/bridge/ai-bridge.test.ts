import { describe, it, expect } from 'vitest';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('AIBridge.sendAndAwaitResponse', () => {
  it('sends the text and resolves with the completed response', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 1000 });

    const promise = bridge.sendAndAwaitResponse('what is 2+2?');
    setTimeout(() => adapter.scriptResponse('thinking...', { complete: false }), 10);
    setTimeout(() => adapter.scriptResponse('the answer is 4', { complete: true }), 30);

    const result = await promise;
    expect(result).toBe('the answer is 4');
    expect(adapter.sentMessages).toEqual(['what is 2+2?']);
  });

  it('rejects if the response never completes before the timeout', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 50 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/timed out/i);
  });

  it('rejects if the adapter is not ready', async () => {
    const adapter = new FakeAdapter();
    adapter.setReady(false);
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 100 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/not ready/i);
  });
});
