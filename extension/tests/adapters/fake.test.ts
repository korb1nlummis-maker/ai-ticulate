import { describe, it, expect } from 'vitest';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('FakeAdapter', () => {
  it('is ready by default and reports its name', () => {
    const a = new FakeAdapter();
    expect(a.isReady()).toBe(true);
    expect(a.name).toBe('Fake');
  });

  it('stores the input value that was set', () => {
    const a = new FakeAdapter();
    a.setInputValue('hello world');
    expect(a.inputValue).toBe('hello world');
  });

  it('on clickSend, queues the input as a sent message and clears the input', () => {
    const a = new FakeAdapter();
    a.setInputValue('a question');
    a.clickSend();
    expect(a.inputValue).toBe('');
    expect(a.sentMessages).toEqual(['a question']);
  });

  it('lets a test script the next response and its completion', () => {
    const a = new FakeAdapter();
    a.setInputValue('q');
    a.clickSend();
    expect(a.isResponseComplete()).toBe(false);
    a.scriptResponse('the answer', { complete: true });
    expect(a.getLatestResponseText()).toBe('the answer');
    expect(a.isResponseComplete()).toBe(true);
  });
});
