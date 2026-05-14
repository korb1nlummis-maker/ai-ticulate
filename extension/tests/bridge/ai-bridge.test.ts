import { describe, it, expect } from 'vitest';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('AIBridge.sendAndAwaitResponse', () => {
  it('sends the text and resolves with the completed response', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 1000, sendDelayMs: 1 });

    const promise = bridge.sendAndAwaitResponse('what is 2+2?');
    setTimeout(() => adapter.scriptResponse('thinking...', { complete: false }), 10);
    setTimeout(() => adapter.scriptResponse('the answer is 4', { complete: true }), 30);

    const result = await promise;
    expect(result).toBe('the answer is 4');
    expect(adapter.sentMessages).toEqual(['what is 2+2?']);
  });

  it('rejects if the response never completes before the timeout', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 50, sendDelayMs: 1 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/timed out/i);
  });

  it('rejects if the adapter is not ready', async () => {
    const adapter = new FakeAdapter();
    adapter.setReady(false);
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 100, sendDelayMs: 1 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/not ready/i);
  });

  it('rejects early when the AI completes but produces no readable response', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, {
      pollIntervalMs: 5,
      timeoutMs: 5000,
      emptyResponseGraceMs: 40,
      sendDelayMs: 1,
    });

    const promise = bridge.sendAndAwaitResponse('q');
    // The adapter reports "done" but the page shows nothing readable.
    setTimeout(() => adapter.scriptResponse('', { complete: true }), 10);

    await expect(promise).rejects.toThrow(/no readable response/i);
  });

  it('does not resolve with our own sent prompt echoed back', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, {
      pollIntervalMs: 5,
      timeoutMs: 5000,
      emptyResponseGraceMs: 40,
      sendDelayMs: 1,
    });

    const promise = bridge.sendAndAwaitResponse('please summarise this meeting note');
    // The "page" briefly shows our own sent prompt as the latest block.
    setTimeout(
      () =>
        adapter.scriptResponse('please summarise this meeting note', { complete: true }),
      10,
    );

    // The echo must NOT resolve the promise — it falls through to the
    // empty-response-grace path instead.
    await expect(promise).rejects.toThrow(/no readable response/i);
  });

  it('does not resolve with a stale prior response left in the DOM', async () => {
    const adapter = new FakeAdapter();
    // Simulate a previous completed turn still visible in the DOM.
    adapter.scriptResponse('OLD stale response', { complete: true });

    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 1000, sendDelayMs: 1 });
    const promise = bridge.sendAndAwaitResponse('a new question');

    // The new turn completes a bit later with fresh text.
    setTimeout(() => adapter.scriptResponse('the NEW response', { complete: true }), 30);

    const result = await promise;
    expect(result).toBe('the NEW response');
    expect(result).not.toBe('OLD stale response');
  });
});
