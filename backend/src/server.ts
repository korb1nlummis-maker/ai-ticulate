import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { healthRoute } from './routes/health.js';

export const app = new Hono();

app.route('/', healthRoute);

const entryArg = process.argv[1];
const isEntryPoint =
  entryArg !== undefined && import.meta.url === pathToFileURL(entryArg).href;

if (isEntryPoint) {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port }, ({ port }) => {
    console.log(`Listening on http://localhost:${port}`);
  });
}
