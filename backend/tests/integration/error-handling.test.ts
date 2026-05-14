import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('error handling', () => {
  it('returns 400 with details for invalid request body on /pretalk/next', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalPrompt: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_request');
  });

  it('returns 500 with generic message when a route throws — no exception details leaked', async () => {
    // StubLLM with no canned responses → throws "no canned response matched"
    const app = createApp(new StubLLM({}));
    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalPrompt: 'hello', contextSummary: '', qaHistory: [] }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
    // Critical: do NOT leak the underlying error message to clients.
    expect(body.message).not.toContain('no canned response');
    expect(body.message).not.toContain('StubLLM');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/no/such/route');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
  });
});
