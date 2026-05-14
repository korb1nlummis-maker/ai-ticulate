import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { healthRoute } from './routes/health.js';
import { pretalkRoute } from './routes/pretalk.js';
import { variantsRoute } from './routes/variants.js';
import { contextRoute } from './routes/context.js';
import { loadConfig } from './config.js';
import { AnthropicLLM } from './llm/anthropic.js';
import { LLMClient } from './llm/types.js';

export function createApp(llm: LLMClient): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    // Task 9 will replace this with proper structured logging.
    console.error('[unhandled error]', err);
    return c.json({ error: 'internal_error', message: 'Something went wrong.' }, 500);
  });

  app.route('/', healthRoute);
  app.route('/', pretalkRoute(llm));
  app.route('/', variantsRoute(llm));
  app.route('/', contextRoute(llm));
  return app;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const cfg = loadConfig();
  const llm = new AnthropicLLM(cfg.anthropicApiKey, cfg.anthropicModel);
  const app = createApp(llm);
  serve({ fetch: app.fetch, port: cfg.port }, ({ port }) => {
    console.log(`Listening on http://localhost:${port}`);
  });
}
