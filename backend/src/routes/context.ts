import { Hono } from 'hono';
import { z } from 'zod';
import { summarizeContext } from '../services/context.js';
import { LLMClient } from '../llm/types.js';

const RequestSchema = z.object({
  chatHistory: z.string().max(100_000),
});

export function contextRoute(llm: LLMClient): Hono {
  const r = new Hono();
  r.post('/context/summarize', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_request', details: parsed.error.issues }, 400);
    }
    const result = await summarizeContext(llm, parsed.data);
    return c.json(result);
  });
  return r;
}
