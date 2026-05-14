import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs the test environment', () => {
    expect(1 + 1).toBe(2);
  });
  it('has a DOM available (happy-dom)', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div.textContent).toBe('hello');
  });
});
