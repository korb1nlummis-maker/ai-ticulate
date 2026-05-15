import { describe, it, expect } from 'vitest';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('FakeAdapter', () => {
  it('is ready by default and reports its name', () => {
    const a = new FakeAdapter();
    expect(a.isReady()).toBe(true);
    expect(a.name).toBe('Fake');
  });

  it('stores the input value that was set', async () => {
    const a = new FakeAdapter();
    await a.setInputValue('hello world');
    expect(a.inputValue).toBe('hello world');
  });

  it('on clickSend, queues the input as a sent message and clears the input', async () => {
    const a = new FakeAdapter();
    await a.setInputValue('a question');
    a.clickSend();
    expect(a.inputValue).toBe('');
    expect(a.sentMessages).toEqual(['a question']);
  });

  it('lets a test script the next response and its completion', async () => {
    const a = new FakeAdapter();
    await a.setInputValue('q');
    a.clickSend();
    expect(a.isResponseComplete()).toBe(false);
    a.scriptResponse('the answer', { complete: true });
    expect(a.getLatestResponseText()).toBe('the answer');
    expect(a.isResponseComplete()).toBe(true);
  });

  it('getResponseSignal starts at 0 and increments on each completed turn', () => {
    const a = new FakeAdapter();
    expect(a.getResponseSignal()).toBe(0);
    a.scriptResponse('first', { complete: true });
    expect(a.getResponseSignal()).toBe(1);
    a.scriptResponse('second', { complete: true });
    expect(a.getResponseSignal()).toBe(2);
  });

  it('getResponseSignal increments even when the new turn text equals the previous turn text', () => {
    // This is the same-length-as-baseline case that motivated the
    // signal-based bridge resolution: two identical responses must still be
    // detected as two distinct turns.
    const a = new FakeAdapter();
    a.scriptResponse('IDENTICAL', { complete: true });
    a.scriptResponse('IDENTICAL', { complete: true });
    expect(a.getResponseSignal()).toBe(2);
  });

  it('getResponseSignal does not increment for streaming (complete:false) updates', () => {
    const a = new FakeAdapter();
    a.scriptResponse('thinking...', { complete: false });
    a.scriptResponse('still thinking...', { complete: false });
    expect(a.getResponseSignal()).toBe(0);
    a.scriptResponse('done', { complete: true });
    expect(a.getResponseSignal()).toBe(1);
  });
});
