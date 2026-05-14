import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('POST /pretalk/next', () => {
  it('returns 200 with the service result on valid input', async () => {
    const canned = JSON.stringify({
      question: 'What kind of email?',
      chips: ['work', 'personal'],
      allow_fill_in: true,
      done: false,
    });
    const app = createApp(new StubLLM({ 'help me write an email': canned }));

    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me write an email',
        contextSummary: '',
        qaHistory: [],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { question: string; chips: string[] };
    expect(body.question).toBe('What kind of email?');
    expect(body.chips).toEqual(['work', 'personal']);
  });

  it('returns 400 with details on invalid request body', async () => {
    const app = createApp(new StubLLM({}));

    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalPrompt: '' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details: unknown };
    expect(body.error).toBe('invalid_request');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('returns 500 with JSON envelope when the service throws', async () => {
    // No canned response → StubLLM throws "no canned response matched"
    const app = createApp(new StubLLM({}));

    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'unmatched prompt',
        contextSummary: '',
        qaHistory: [],
      }),
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('internal_error');
    // Do NOT leak underlying exception details to the client.
    expect(body.message).not.toContain('no canned response');
  });
});
