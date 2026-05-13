import { Hono } from 'hono';
import { z } from 'zod';
import { runPretalk } from '../services/pretalk.js';
import { LLMClient } from '../llm/types.js';

const RequestSchema = z.object({
  originalPrompt: z.string().min(1).max(10_000),
  contextSummary: z.string().max(20_000).default(''),
  qaHistory: z
    .array(z.object({ q: z.string(), a: z.string() }))
    .max(20)
    .default([]),
});

export function pretalkRoute(llm: LLMClient): Hono {
  const r = new Hono();
  r.post('/pretalk/next', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_request', details: parsed.error.issues }, 400);
    }
    const result = await runPretalk(llm, parsed.data);
    return c.json(result);
  });
  return r;
}
