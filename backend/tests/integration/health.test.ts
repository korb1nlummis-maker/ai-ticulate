import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
