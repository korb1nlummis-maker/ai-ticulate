import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('POST /context/summarize', () => {
  it('returns 200 with a structured summary on valid input', async () => {
    const canned = JSON.stringify({
      topic: 'ad campaign',
      inferred_user_role: 'marketing manager',
      prior_decisions: ['chose Google Ads'],
      active_goal: 'launch first campaign',
    });
    const app = createApp(new StubLLM({ 'Google Ads': canned }));

    const res = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatHistory: 'User: setting up Google Ads for our SaaS' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { topic: string; inferredUserRole: string };
    expect(body.topic).toBe('ad campaign');
    expect(body.inferredUserRole).toBe('marketing manager');
  });

  it('returns 400 with details when chatHistory is missing', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
  });

  it('returns 400 when chatHistory exceeds 100k chars', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatHistory: 'x'.repeat(100_001) }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
  });

  it('returns 500 with JSON envelope when the service throws', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatHistory: 'unmatched chat content here' }),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('internal_error');
    expect(body.message).not.toContain('no canned response');
  });
});
