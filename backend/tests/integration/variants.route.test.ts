import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('POST /variants/generate', () => {
  it('returns 200 with 5 variants on valid input', async () => {
    const canned = JSON.stringify({
      variants: [
        { id: '1', text: 'V1 [___]', label: 'a' },
        { id: '2', text: 'V2', label: 'b' },
        { id: '3', text: 'V3 [___]', label: 'c' },
        { id: '4', text: 'V4', label: 'd' },
        { id: '5', text: 'V5', label: 'e' },
      ],
    });
    const app = createApp(new StubLLM({ 'help me write': canned }));

    const res = await app.request('/variants/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me write an email to my boss',
        contextSummary: '',
        qaHistory: [],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.variants).toHaveLength(5);
  });

  it('returns 400 with details on invalid body', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/variants/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalPrompt: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_request');
  });

  it('returns 500 with JSON envelope when the service throws', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/variants/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'unmatched',
        contextSummary: '',
        qaHistory: [],
      }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
    expect(body.message).not.toContain('no canned response');
  });
});
