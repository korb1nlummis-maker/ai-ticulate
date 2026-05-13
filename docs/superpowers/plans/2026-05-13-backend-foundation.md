# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a working HTTP API for the ai-ticulate backend providing the three core LLM endpoints (`/pretalk/next`, `/variants/generate`, `/context/summarize`) plus a swappable LLM provider abstraction and a file-based prompt template library. All tests pass; `curl` against a running server returns real LLM-generated responses.

**Architecture:** Node.js + TypeScript HTTP server using Hono. All LLM calls go through a single `LLMClient` interface; the default implementation calls Anthropic's Claude Haiku 4.5 via the official SDK. Prompts live as versioned markdown files with YAML frontmatter. Each service is a stateless function — the route layer handles HTTP, the service layer handles the business logic. No auth, rate limiting, or persistence in this plan — that arrives in Plan 2.

**Tech Stack:** Node.js 20+, TypeScript 5+, Hono, Vitest, Anthropic SDK (`@anthropic-ai/sdk`), Zod, Pino (logging), pnpm.

**File structure (monorepo — extension comes later in `extension/`):**

```
ai-ticulate/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── prompts/
│   │   ├── pretalk-next.md
│   │   ├── variants-generate.md
│   │   └── context-summarize.md
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── llm/
│   │   │   ├── types.ts
│   │   │   ├── anthropic.ts
│   │   │   └── stub.ts
│   │   ├── prompts/
│   │   │   └── loader.ts
│   │   ├── services/
│   │   │   ├── pretalk.ts
│   │   │   ├── variants.ts
│   │   │   └── context.ts
│   │   └── routes/
│   │       ├── pretalk.ts
│   │       ├── variants.ts
│   │       ├── context.ts
│   │       └── health.ts
│   └── tests/
│       ├── unit/
│       └── integration/
└── docs/superpowers/...
```

**Working-directory convention:** All commands below assume `cwd = backend/` unless otherwise noted.

---

## Task 1: Initialize the backend project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.gitignore`
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/health.ts`
- Create: `backend/tests/integration/health.test.ts`

- [ ] **Step 1: Create the directory and init the package**

Run from project root:

```bash
mkdir backend
cd backend
pnpm init
```

Then replace the generated `package.json` with:

```json
{
  "name": "@ai-ticulate/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add hono @hono/node-server @anthropic-ai/sdk zod pino
pnpm add -D typescript tsx vitest @types/node
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
```

- [ ] **Step 5: Create `backend/.gitignore`**

```
node_modules/
dist/
.env
*.log
coverage/
```

- [ ] **Step 6: Write the failing test for /health**

Create `backend/tests/integration/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { app } from '../../src/server.js';

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 7: Run the test — it should fail (no server file yet)**

```bash
pnpm test
```

Expected: FAIL — `Cannot find module '../../src/server.js'` or similar.

- [ ] **Step 8: Create the `/health` route**

Create `backend/src/routes/health.ts`:

```ts
import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/health', (c) => c.json({ status: 'ok' }));
```

- [ ] **Step 9: Create the server entry point**

Create `backend/src/server.ts`:

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { healthRoute } from './routes/health.js';

export const app = new Hono();

app.route('/', healthRoute);

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port }, ({ port }) => {
    console.log(`Listening on http://localhost:${port}`);
  });
}
```

- [ ] **Step 10: Run the test again — it should pass**

```bash
pnpm test
```

Expected: PASS — 1 test passing.

- [ ] **Step 11: Manually verify the server runs**

```bash
pnpm dev
```

In another terminal:

```bash
curl http://localhost:3000/health
```

Expected output: `{"status":"ok"}`

Stop the dev server with Ctrl-C.

- [ ] **Step 12: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold Hono server with /health endpoint"
```

- [ ] **Step 13: Update CAPTAINS_LOG.md**

Append at the top of the `## 2026-05-13` section (or under a new date if a day has passed) a new sub-section:

```markdown
### Backend Task 1 complete — Hono skeleton + /health
- Created `backend/` directory with pnpm workspace conventions.
- Picked Hono as the HTTP framework. Why: lightweight, modern, deploys equally to Node / Bun / Cloudflare Workers / Vercel — keeps hosting decisions deferred to a later phase.
- Vitest for tests. ESM-only TypeScript config.
- Commit: <hash>
```

Commit the log update:

```bash
git add CAPTAINS_LOG.md
git commit -m "chore: log backend Task 1"
```

---

## Task 2: Environment configuration with Zod validation

**Files:**
- Create: `backend/src/config.ts`
- Create: `backend/.env.example`
- Create: `backend/tests/unit/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns parsed config when all required env vars are set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.PORT = '4000';
    process.env.NODE_ENV = 'development';

    const cfg = loadConfig();

    expect(cfg.anthropicApiKey).toBe('sk-ant-test');
    expect(cfg.port).toBe(4000);
    expect(cfg.nodeEnv).toBe('development');
  });

  it('defaults PORT to 3000 and NODE_ENV to development', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    delete process.env.PORT;
    delete process.env.NODE_ENV;

    const cfg = loadConfig();

    expect(cfg.port).toBe(3000);
    expect(cfg.nodeEnv).toBe('development');
  });

  it('throws a clear error if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => loadConfig()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
```

- [ ] **Step 2: Run the test — should fail**

```bash
pnpm test tests/unit/config.test.ts
```

Expected: FAIL — `Cannot find module '../../src/config.js'`.

- [ ] **Step 3: Implement `config.ts`**

Create `backend/src/config.ts`:

```ts
import { z } from 'zod';

const ConfigSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = {
  anthropicApiKey: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
};

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid config — ${issues}`);
  }
  return {
    anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
  };
}
```

- [ ] **Step 4: Run the test — should pass**

```bash
pnpm test tests/unit/config.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Create `.env.example`**

```bash
# Copy to .env and fill in real values
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
NODE_ENV=development
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/config.ts backend/.env.example backend/tests/unit/config.test.ts
git commit -m "feat(backend): config loader with Zod validation"
```

- [ ] **Step 7: Update CAPTAINS_LOG.md**

Append:

```markdown
### Backend Task 2 complete — Config loader
- Env vars validated via Zod. Missing required vars throw at startup with a clear message — fail fast, not on first request.
- Commit: <hash>
```

Commit the log.

---

## Task 3: LLM provider abstraction (interface + Anthropic + stub)

**Files:**
- Create: `backend/src/llm/types.ts`
- Create: `backend/src/llm/anthropic.ts`
- Create: `backend/src/llm/stub.ts`
- Create: `backend/tests/unit/llm.stub.test.ts`

- [ ] **Step 1: Define the LLMClient interface**

Create `backend/src/llm/types.ts`:

```ts
import { z } from 'zod';

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LLMCompleteOptions = {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type LLMResponse = {
  text: string;
};

export interface LLMClient {
  complete(opts: LLMCompleteOptions): Promise<LLMResponse>;
}

/**
 * Parse a JSON string against a Zod schema. Used by services that expect
 * the LLM to return structured output. Throws if the LLM returned
 * malformed JSON or JSON that fails schema validation.
 */
export function parseJsonResponse<T>(text: string, schema: z.ZodSchema<T>): T {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
```

- [ ] **Step 2: Write the failing test for the stub**

Create `backend/tests/unit/llm.stub.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { StubLLM } from '../../src/llm/stub.js';

describe('StubLLM', () => {
  it('returns the canned response matching the last user message', async () => {
    const llm = new StubLLM({
      'hello': 'hi there',
      'what time': 'noon',
    });

    const res = await llm.complete({
      messages: [
        { role: 'system', content: 'be brief' },
        { role: 'user', content: 'hello' },
      ],
    });

    expect(res.text).toBe('hi there');
  });

  it('throws if no canned response matches', async () => {
    const llm = new StubLLM({ 'hello': 'hi' });
    await expect(
      llm.complete({ messages: [{ role: 'user', content: 'unmatched' }] }),
    ).rejects.toThrow(/no canned response/i);
  });

  it('matches by substring of the user message', async () => {
    const llm = new StubLLM({ 'pretalk': '{"question":"what next?","chips":["a","b"],"done":false}' });
    const res = await llm.complete({
      messages: [{ role: 'user', content: 'please run pretalk for me' }],
    });
    expect(res.text).toContain('what next?');
  });
});
```

- [ ] **Step 3: Run the test — should fail**

```bash
pnpm test tests/unit/llm.stub.test.ts
```

Expected: FAIL — `Cannot find module '../../src/llm/stub.js'`.

- [ ] **Step 4: Implement the stub**

Create `backend/src/llm/stub.ts`:

```ts
import { LLMClient, LLMCompleteOptions, LLMResponse } from './types.js';

/**
 * Substring-matching canned-response LLM for tests. Keys are matched
 * against the last user message; first matching key wins.
 */
export class StubLLM implements LLMClient {
  constructor(private readonly cannedResponses: Record<string, string>) {}

  async complete(opts: LLMCompleteOptions): Promise<LLMResponse> {
    const lastUserMsg = [...opts.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      throw new Error('StubLLM: no user message in conversation');
    }
    for (const [key, response] of Object.entries(this.cannedResponses)) {
      if (lastUserMsg.content.includes(key)) {
        return { text: response };
      }
    }
    throw new Error(`StubLLM: no canned response matched user message: ${lastUserMsg.content.slice(0, 60)}`);
  }
}
```

- [ ] **Step 5: Run the test — should pass**

```bash
pnpm test tests/unit/llm.stub.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 6: Implement the Anthropic client**

Create `backend/src/llm/anthropic.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { LLMClient, LLMCompleteOptions, LLMResponse } from './types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 1024;

export class AnthropicLLM implements LLMClient {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(opts: LLMCompleteOptions): Promise<LLMResponse> {
    const systemMessages = opts.messages.filter((m) => m.role === 'system').map((m) => m.content);
    const conversation = opts.messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: opts.temperature ?? 0.7,
      system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
      messages: conversation.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AnthropicLLM: no text content in response');
    }
    return { text: textBlock.text };
  }
}
```

> **Note for the agent:** No unit test for `AnthropicLLM` here — that would require either mocking the SDK (brittle) or hitting the real API (slow + costs money). It is exercised by the integration smoke test in Task 10.

- [ ] **Step 7: Commit**

```bash
git add backend/src/llm/ backend/tests/unit/llm.stub.test.ts
git commit -m "feat(backend): LLMClient interface, AnthropicLLM impl, StubLLM for tests"
```

- [ ] **Step 8: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 3 complete — LLM provider abstraction
- Single `LLMClient` interface. `AnthropicLLM` is the production implementation (Claude Haiku 4.5 / model id `claude-haiku-4-5-20251001`).
- `StubLLM` enables fast deterministic unit tests of services without hitting the real API.
- `parseJsonResponse()` helper handles the common case where the LLM returns JSON wrapped in markdown code fences.
- Decision: NOT mocking the Anthropic SDK at the unit level. Integration test in Task 10 hits real API once per CI run. Reason: SDK-mocking unit tests are brittle and test the mock rather than the integration.
- Commit: <hash>
```

Commit the log.

---

## Task 4: Prompt template loader

**Files:**
- Create: `backend/prompts/pretalk-next.md`
- Create: `backend/prompts/variants-generate.md`
- Create: `backend/prompts/context-summarize.md`
- Create: `backend/src/prompts/loader.ts`
- Create: `backend/tests/unit/prompts.loader.test.ts`

- [ ] **Step 1: Create the three prompt template files**

Create `backend/prompts/pretalk-next.md`:

```markdown
---
name: pretalk-next
description: Generate the next clarifying question and predicted answer chips during the pre-talk loop
model: claude-haiku-4-5
temperature: 0.7
---

You are ai-ticulate's pre-talk assistant. The user has given you a vague prompt they want to send to an AI. Your job is to ask one short, friendly follow-up question that will help clarify their intent — and predict 3-5 likely answers as tap-able chips.

# User's original prompt
{{original_prompt}}

# Context summary from their existing chat (may be empty)
{{context_summary}}

# Q&A history so far (may be empty)
{{qa_history}}

# Your task

Generate the next question. If you've gathered enough context (typically after 2-4 turns), return done: true and no question.

Respond with ONLY valid JSON, no commentary, no markdown fences:

{
  "question": "your follow-up question, short and conversational",
  "chips": ["predicted answer 1", "predicted answer 2", "predicted answer 3"],
  "allow_fill_in": true,
  "done": false
}

If done, return:

{
  "question": "",
  "chips": [],
  "allow_fill_in": false,
  "done": true
}
```

Create `backend/prompts/variants-generate.md`:

```markdown
---
name: variants-generate
description: Generate 5 detailed variants of the user's prompt, some with fill-in blanks
model: claude-haiku-4-5
temperature: 0.8
---

You are ai-ticulate's variant generator. Given a user's original prompt plus the pre-talk Q&A history and any context summary, produce 5 detailed, distinct variants of their prompt. Each should be more specific and richer than the original.

# User's original prompt
{{original_prompt}}

# Context summary (may be empty)
{{context_summary}}

# Q&A history
{{qa_history}}

# Requirements

- 5 variants total. Each has a distinct character / angle. NOT 5 versions of the same approach at different lengths.
- 2 or 3 of them should contain fill-in blank slots written as `[___]` or `[brief hint]`. The user will fill these in to personalize. Blanks should be for genuinely useful customization points, not filler.
- Each variant must read as a complete, ready-to-send prompt.

# Output

Respond with ONLY valid JSON, no commentary, no markdown fences:

{
  "variants": [
    { "id": "1", "text": "...", "label": "short label e.g. 'with analogies'" },
    { "id": "2", "text": "..." , "label": "..." },
    ...
  ]
}
```

Create `backend/prompts/context-summarize.md`:

```markdown
---
name: context-summarize
description: Summarize the user's existing AI chat history into a structured context the pre-talk service can use
model: claude-haiku-4-5
temperature: 0.3
---

You are ai-ticulate's context summarizer. The user is on an AI chat site (chatgpt.com, claude.ai, or gemini.google.com) and has had some prior conversation. Summarize the relevant context.

# Raw chat history (most recent messages, may be truncated)
{{chat_history}}

# Your task

Extract the gist for use by another model that will ask the user follow-up questions. Be specific where possible (mention their role, their goal, the domain). NEVER copy specific names, emails, passwords, or other personal identifiers — refer to them generically.

Respond with ONLY valid JSON, no commentary, no markdown fences:

{
  "topic": "what they've been discussing",
  "inferred_user_role": "e.g. marketing manager, software engineer, student — or null if unclear",
  "prior_decisions": ["any choices they've already made"],
  "active_goal": "what they seem to be trying to achieve in this session"
}

If the chat history is empty or has no relevant context, return all fields as null / empty arrays.
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/unit/prompts.loader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadPrompt, renderPrompt } from '../../src/prompts/loader.js';

describe('prompts/loader', () => {
  it('loads pretalk-next and parses frontmatter', () => {
    const p = loadPrompt('pretalk-next');
    expect(p.name).toBe('pretalk-next');
    expect(p.model).toBe('claude-haiku-4-5');
    expect(p.template).toContain('{{original_prompt}}');
  });

  it('renders a template by substituting {{vars}}', () => {
    const rendered = renderPrompt('pretalk-next', {
      original_prompt: 'help me write an email',
      context_summary: '',
      qa_history: '',
    });
    expect(rendered).toContain('help me write an email');
    expect(rendered).not.toContain('{{original_prompt}}');
  });

  it('throws on unknown prompt name', () => {
    expect(() => loadPrompt('nonexistent')).toThrow(/nonexistent/);
  });

  it('throws if a required variable is missing from render', () => {
    expect(() =>
      renderPrompt('pretalk-next', { original_prompt: 'x' } as Record<string, string>),
    ).toThrow(/context_summary|qa_history/);
  });
});
```

- [ ] **Step 3: Run the test — should fail**

```bash
pnpm test tests/unit/prompts.loader.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the loader**

Create `backend/src/prompts/loader.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROMPTS_DIR = join(__dirname, '../../prompts');

export type PromptTemplate = {
  name: string;
  description: string;
  model: string;
  temperature: number;
  template: string;
};

const cache = new Map<string, PromptTemplate>();

export function loadPrompt(name: string): PromptTemplate {
  const cached = cache.get(name);
  if (cached) return cached;

  let raw: string;
  try {
    raw = readFileSync(join(PROMPTS_DIR, `${name}.md`), 'utf8');
  } catch {
    throw new Error(`Prompt not found: ${name}`);
  }

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Prompt ${name} missing frontmatter`);
  }
  const [, fm, body] = fmMatch;

  const fmFields: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fmFields[m[1]] = m[2].trim();
  }

  const tpl: PromptTemplate = {
    name: fmFields.name ?? name,
    description: fmFields.description ?? '',
    model: fmFields.model ?? 'claude-haiku-4-5',
    temperature: Number(fmFields.temperature ?? '0.7'),
    template: body.trim(),
  };
  cache.set(name, tpl);
  return tpl;
}

export function renderPrompt(name: string, vars: Record<string, string>): string {
  const tpl = loadPrompt(name);
  const required = [...tpl.template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  const missing = required.filter((k) => !(k in vars));
  if (missing.length > 0) {
    throw new Error(`renderPrompt(${name}): missing variables ${missing.join(', ')}`);
  }
  return tpl.template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}
```

- [ ] **Step 5: Run the test — should pass**

```bash
pnpm test tests/unit/prompts.loader.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/prompts/ backend/src/prompts/ backend/tests/unit/prompts.loader.test.ts
git commit -m "feat(backend): prompt template loader + 3 initial templates"
```

- [ ] **Step 7: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 4 complete — Prompt template library
- Three initial templates: pretalk-next, variants-generate, context-summarize. Markdown with YAML-lite frontmatter (name, description, model, temperature) + body with `{{var}}` placeholders.
- Loader caches parsed templates. Render-time check: if a template uses `{{foo}}` and the caller didn't pass `foo`, throw — fail loudly, not silently with empty strings.
- Reasoning: prompts are first-class code per the design spec. Stored in `backend/prompts/`, versioned in git, diffable. CI prompt-regression gate (Plan 3) will operate on these files.
- Commit: <hash>
```

---

## Task 5: Pre-talk service (stub LLM)

**Files:**
- Create: `backend/src/services/pretalk.ts`
- Create: `backend/src/routes/pretalk.ts`
- Modify: `backend/src/server.ts` — register the route
- Create: `backend/tests/unit/services.pretalk.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/services.pretalk.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runPretalk } from '../../src/services/pretalk.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('runPretalk', () => {
  it('returns the parsed question and chips from the LLM', async () => {
    const canned = JSON.stringify({
      question: 'What kind of email?',
      chips: ['work', 'personal', 'apology'],
      allow_fill_in: true,
      done: false,
    });
    const llm = new StubLLM({ 'help me write an email': canned });

    const res = await runPretalk(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [],
    });

    expect(res.question).toBe('What kind of email?');
    expect(res.chips).toEqual(['work', 'personal', 'apology']);
    expect(res.allowFillIn).toBe(true);
    expect(res.done).toBe(false);
  });

  it('signals done when LLM returns done:true', async () => {
    const canned = JSON.stringify({ question: '', chips: [], allow_fill_in: false, done: true });
    const llm = new StubLLM({ 'enough context': canned });

    const res = await runPretalk(llm, {
      originalPrompt: 'enough context',
      contextSummary: '',
      qaHistory: [{ q: 'q1', a: 'a1' }],
    });

    expect(res.done).toBe(true);
  });

  it('throws on malformed JSON from the LLM', async () => {
    const llm = new StubLLM({ 'broken': 'not json at all' });
    await expect(
      runPretalk(llm, { originalPrompt: 'broken', contextSummary: '', qaHistory: [] }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test — should fail**

```bash
pnpm test tests/unit/services.pretalk.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `backend/src/services/pretalk.ts`:

```ts
import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';

export type QATurn = { q: string; a: string };

export type PretalkInput = {
  originalPrompt: string;
  contextSummary: string;
  qaHistory: QATurn[];
};

export type PretalkOutput = {
  question: string;
  chips: string[];
  allowFillIn: boolean;
  done: boolean;
};

const ResponseSchema = z.object({
  question: z.string(),
  chips: z.array(z.string()),
  allow_fill_in: z.boolean(),
  done: z.boolean(),
});

function formatQaHistory(qa: QATurn[]): string {
  if (qa.length === 0) return '(none yet)';
  return qa.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join('\n');
}

export async function runPretalk(llm: LLMClient, input: PretalkInput): Promise<PretalkOutput> {
  const tpl = loadPrompt('pretalk-next');
  const userMessage = renderPrompt('pretalk-next', {
    original_prompt: input.originalPrompt,
    context_summary: input.contextSummary || '(none)',
    qa_history: formatQaHistory(input.qaHistory),
  });

  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  const parsed = parseJsonResponse(response.text, ResponseSchema);
  return {
    question: parsed.question,
    chips: parsed.chips,
    allowFillIn: parsed.allow_fill_in,
    done: parsed.done,
  };
}
```

- [ ] **Step 4: Run the test — should pass**

```bash
pnpm test tests/unit/services.pretalk.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Wire up the HTTP route**

Create `backend/src/routes/pretalk.ts`:

```ts
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
```

- [ ] **Step 6: Update `server.ts` to register the route**

Replace `backend/src/server.ts` with:

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { healthRoute } from './routes/health.js';
import { pretalkRoute } from './routes/pretalk.js';
import { loadConfig } from './config.js';
import { AnthropicLLM } from './llm/anthropic.js';
import { LLMClient } from './llm/types.js';

export function createApp(llm: LLMClient): Hono {
  const app = new Hono();
  app.route('/', healthRoute);
  app.route('/', pretalkRoute(llm));
  return app;
}

// Default export for the test suite — uses a real config + real LLM.
// Tests that need a stub LLM should call createApp(stub) directly.
const config = process.env.NODE_ENV === 'test' ? null : loadConfig();
export const app = createApp(
  config ? new AnthropicLLM(config.anthropicApiKey) : ({} as LLMClient),
);

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = loadConfig();
  serve({ fetch: app.fetch, port: cfg.port }, ({ port }) => {
    console.log(`Listening on http://localhost:${port}`);
  });
}
```

> **Note on the conditional config:** In test mode the default `app` export is created with a no-op LLM. Tests should always construct their own app via `createApp(stubLLM)` rather than relying on the module-level export. The existing `/health` test still works because it doesn't touch the LLM.

- [ ] **Step 7: Run all tests — should pass**

```bash
pnpm test
```

Expected: PASS — all tests green.

- [ ] **Step 8: Commit**

```bash
git add backend/src/ backend/tests/unit/services.pretalk.test.ts
git commit -m "feat(backend): /pretalk/next endpoint with stub-LLM tests"
```

- [ ] **Step 9: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 5 complete — /pretalk/next endpoint (stub LLM)
- Service: `runPretalk()` is stateless — takes original prompt + context summary + Q&A history, returns next question + chips + done flag.
- Route: Zod-validated request body, max history length 20 turns.
- Server refactored: `createApp(llm)` factory so tests can inject a stub.
- Commit: <hash>
```

---

## Task 6: Wire the real LLM to /pretalk/next (env-gated integration test)

**Files:**
- Create: `backend/tests/integration/pretalk.live.test.ts`
- Modify: `backend/.env.example` (already has key)

- [ ] **Step 1: Write the env-gated integration test**

Create `backend/tests/integration/pretalk.live.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runPretalk } from '../../src/services/pretalk.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('pretalk live LLM', () => {
  it('returns a structurally valid response for a vague prompt', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const res = await runPretalk(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [],
    });

    expect(typeof res.question).toBe('string');
    expect(Array.isArray(res.chips)).toBe(true);
    expect(typeof res.done).toBe('boolean');
    if (!res.done) {
      expect(res.question.length).toBeGreaterThan(0);
      expect(res.chips.length).toBeGreaterThanOrEqual(2);
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run the integration test (with a real key in your `.env`)**

```bash
# In one shell, with ANTHROPIC_API_KEY set:
pnpm test tests/integration/pretalk.live.test.ts
```

Expected: PASS. If the test fails because `parseJsonResponse` fails, that's a real signal that the prompt isn't reliably producing valid JSON — go fix the prompt template before proceeding.

- [ ] **Step 3: Manual curl verification**

In one terminal:

```bash
pnpm dev
```

In another:

```bash
curl -X POST http://localhost:3000/pretalk/next \
  -H 'content-type: application/json' \
  -d '{"originalPrompt":"help me write an email","contextSummary":"","qaHistory":[]}'
```

Expected: JSON response with a `question`, a `chips` array, `allow_fill_in`, and `done`.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integration/pretalk.live.test.ts
git commit -m "test(backend): env-gated live LLM integration test for pretalk"
```

- [ ] **Step 5: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 6 complete — Real LLM verified end-to-end
- Live integration test passes against real Anthropic API.
- Live tests env-gated on ANTHROPIC_API_KEY (skipped in CI without secret).
- Manual curl test confirmed: vague prompt → structurally valid pre-talk response with question + chips.
- Commit: <hash>
```

---

## Task 7: Variant generation service

**Files:**
- Create: `backend/src/services/variants.ts`
- Create: `backend/src/routes/variants.ts`
- Modify: `backend/src/server.ts` — register variants route
- Create: `backend/tests/unit/services.variants.test.ts`
- Create: `backend/tests/integration/variants.live.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `backend/tests/unit/services.variants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../src/services/variants.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('generateVariants', () => {
  it('returns 5 variants with ids and text', async () => {
    const canned = JSON.stringify({
      variants: [
        { id: '1', text: 'Variant one [___]', label: 'analogies' },
        { id: '2', text: 'Variant two', label: 'story' },
        { id: '3', text: 'Variant three [___]', label: 'specifics' },
        { id: '4', text: 'Variant four', label: 'comparison' },
        { id: '5', text: 'Variant five', label: 'briefing' },
      ],
    });
    const llm = new StubLLM({ 'help me write an email': canned });

    const res = await generateVariants(llm, {
      originalPrompt: 'help me write an email',
      contextSummary: '',
      qaHistory: [{ q: 'kind?', a: 'work' }],
    });

    expect(res.variants).toHaveLength(5);
    expect(res.variants[0].text).toContain('Variant one');
  });

  it('throws if the LLM returns fewer than 5 variants', async () => {
    const canned = JSON.stringify({ variants: [{ id: '1', text: 'only one', label: 'x' }] });
    const llm = new StubLLM({ 'short': canned });
    await expect(
      generateVariants(llm, { originalPrompt: 'short', contextSummary: '', qaHistory: [] }),
    ).rejects.toThrow(/5/);
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test tests/unit/services.variants.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the service**

Create `backend/src/services/variants.ts`:

```ts
import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';
import type { QATurn } from './pretalk.js';

export type VariantsInput = {
  originalPrompt: string;
  contextSummary: string;
  qaHistory: QATurn[];
};

export type Variant = { id: string; text: string; label: string };
export type VariantsOutput = { variants: Variant[] };

const ResponseSchema = z.object({
  variants: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        label: z.string(),
      }),
    )
    .length(5, 'must return exactly 5 variants'),
});

function formatQaHistory(qa: QATurn[]): string {
  if (qa.length === 0) return '(none)';
  return qa.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join('\n');
}

export async function generateVariants(llm: LLMClient, input: VariantsInput): Promise<VariantsOutput> {
  const tpl = loadPrompt('variants-generate');
  const userMessage = renderPrompt('variants-generate', {
    original_prompt: input.originalPrompt,
    context_summary: input.contextSummary || '(none)',
    qa_history: formatQaHistory(input.qaHistory),
  });

  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  return parseJsonResponse(response.text, ResponseSchema);
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test tests/unit/services.variants.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Add the route**

Create `backend/src/routes/variants.ts`:

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { generateVariants } from '../services/variants.js';
import { LLMClient } from '../llm/types.js';

const RequestSchema = z.object({
  originalPrompt: z.string().min(1).max(10_000),
  contextSummary: z.string().max(20_000).default(''),
  qaHistory: z
    .array(z.object({ q: z.string(), a: z.string() }))
    .max(20)
    .default([]),
});

export function variantsRoute(llm: LLMClient): Hono {
  const r = new Hono();
  r.post('/variants/generate', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_request', details: parsed.error.issues }, 400);
    }
    const result = await generateVariants(llm, parsed.data);
    return c.json(result);
  });
  return r;
}
```

- [ ] **Step 6: Register the route in `server.ts`**

Modify `backend/src/server.ts` — in `createApp`, add:

```ts
import { variantsRoute } from './routes/variants.js';
```

And in the function body, after `app.route('/', pretalkRoute(llm));` add:

```ts
app.route('/', variantsRoute(llm));
```

- [ ] **Step 7: Add a live integration test**

Create `backend/tests/integration/variants.live.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../src/services/variants.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('variants live LLM', () => {
  it('returns 5 distinct variants for a realistic prompt', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const res = await generateVariants(llm, {
      originalPrompt: 'explain machine learning',
      contextSummary: 'User is a marketing manager curious about ML for work.',
      qaHistory: [
        { q: 'What level of detail?', a: 'enough to discuss with my team' },
        { q: 'What examples would help?', a: 'ad targeting and content personalization' },
      ],
    });

    expect(res.variants).toHaveLength(5);
    for (const v of res.variants) {
      expect(v.text.length).toBeGreaterThan(20);
    }
    const distinctTexts = new Set(res.variants.map((v) => v.text));
    expect(distinctTexts.size).toBe(5);
  }, 60_000);
});
```

- [ ] **Step 8: Run all tests — should pass**

```bash
pnpm test
```

Expected: PASS — all tests green (live tests run if `ANTHROPIC_API_KEY` is set).

- [ ] **Step 9: Manual curl verification**

```bash
pnpm dev
```

```bash
curl -X POST http://localhost:3000/variants/generate \
  -H 'content-type: application/json' \
  -d '{"originalPrompt":"explain machine learning","contextSummary":"User is a marketing manager.","qaHistory":[{"q":"what level?","a":"enough to discuss with my team"}]}'
```

Expected: JSON with 5 distinct variants, 2-3 of which contain `[___]` blanks.

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/variants.ts backend/src/routes/variants.ts backend/src/server.ts backend/tests/
git commit -m "feat(backend): /variants/generate endpoint"
```

- [ ] **Step 11: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 7 complete — /variants/generate endpoint
- Strict schema: LLM MUST return exactly 5 variants — Zod enforces this and the service throws if violated. Better to fail loudly than ship a 4-variant response and confuse the UI.
- Each variant has `id`, `text`, `label`. Some contain `[___]` blanks for fill-in.
- Manual curl test against live LLM produced 5 distinctly-flavored variants for "explain machine learning" with 2 fill-in blanks. Quality looks good.
- Commit: <hash>
```

---

## Task 8: Context extraction service

**Files:**
- Create: `backend/src/services/context.ts`
- Create: `backend/src/routes/context.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/unit/services.context.test.ts`
- Create: `backend/tests/integration/context.live.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `backend/tests/unit/services.context.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeContext } from '../../src/services/context.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('summarizeContext', () => {
  it('returns a structured summary from the LLM', async () => {
    const canned = JSON.stringify({
      topic: 'machine learning for marketing',
      inferred_user_role: 'marketing manager',
      prior_decisions: ['decided to use AI for content'],
      active_goal: 'understand ML enough to brief the team',
    });
    const llm = new StubLLM({ 'chat history': canned });

    const res = await summarizeContext(llm, { chatHistory: 'chat history goes here' });

    expect(res.topic).toBe('machine learning for marketing');
    expect(res.inferredUserRole).toBe('marketing manager');
    expect(res.priorDecisions).toEqual(['decided to use AI for content']);
    expect(res.activeGoal).toContain('understand ML');
  });

  it('handles null role gracefully', async () => {
    const canned = JSON.stringify({
      topic: null,
      inferred_user_role: null,
      prior_decisions: [],
      active_goal: null,
    });
    const llm = new StubLLM({ 'empty': canned });
    const res = await summarizeContext(llm, { chatHistory: 'empty' });
    expect(res.topic).toBeNull();
    expect(res.inferredUserRole).toBeNull();
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test tests/unit/services.context.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the service**

Create `backend/src/services/context.ts`:

```ts
import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';

export type ContextInput = { chatHistory: string };

export type ContextOutput = {
  topic: string | null;
  inferredUserRole: string | null;
  priorDecisions: string[];
  activeGoal: string | null;
};

const ResponseSchema = z.object({
  topic: z.string().nullable(),
  inferred_user_role: z.string().nullable(),
  prior_decisions: z.array(z.string()),
  active_goal: z.string().nullable(),
});

const MAX_HISTORY_CHARS = 30_000;

export async function summarizeContext(llm: LLMClient, input: ContextInput): Promise<ContextOutput> {
  const tpl = loadPrompt('context-summarize');
  const trimmed = input.chatHistory.slice(-MAX_HISTORY_CHARS);

  const userMessage = renderPrompt('context-summarize', { chat_history: trimmed });
  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  const parsed = parseJsonResponse(response.text, ResponseSchema);
  return {
    topic: parsed.topic,
    inferredUserRole: parsed.inferred_user_role,
    priorDecisions: parsed.prior_decisions,
    activeGoal: parsed.active_goal,
  };
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test tests/unit/services.context.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Add the route**

Create `backend/src/routes/context.ts`:

```ts
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
```

- [ ] **Step 6: Register the route in `server.ts`**

In `createApp`, add:

```ts
import { contextRoute } from './routes/context.js';
// ...
app.route('/', contextRoute(llm));
```

- [ ] **Step 7: Add a live integration test**

Create `backend/tests/integration/context.live.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeContext } from '../../src/services/context.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('context live LLM', () => {
  it('extracts a sensible topic and inferred role from realistic chat history', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const history = `
User: I'm setting up a Google Ads campaign for our SaaS product.
Assistant: Great. What's the product and target audience?
User: It's a project management tool for engineering teams of 50-200 people.
Assistant: Got it. Have you defined your keywords?
User: Yes — "agile project tracking", "engineering project management", etc.
Assistant: For B2B SaaS like this...
`.trim();

    const res = await summarizeContext(llm, { chatHistory: history });

    expect(res.topic).toBeTruthy();
    expect(res.topic?.toLowerCase()).toMatch(/ads|marketing|campaign|saas/);
    expect(res.inferredUserRole).toBeTruthy();
  }, 30_000);
});
```

- [ ] **Step 8: Run all tests — should pass**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 9: Manual curl verification**

```bash
curl -X POST http://localhost:3000/context/summarize \
  -H 'content-type: application/json' \
  -d "{\"chatHistory\":\"User: I'm setting up a Google Ads campaign for our SaaS product targeting engineering teams.\"}"
```

Expected: JSON with `topic`, `inferred_user_role`, `prior_decisions`, `active_goal` all populated sensibly.

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/context.ts backend/src/routes/context.ts backend/src/server.ts backend/tests/
git commit -m "feat(backend): /context/summarize endpoint"
```

- [ ] **Step 11: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 8 complete — /context/summarize endpoint
- Service caps chat history input at 30,000 chars before sending to LLM. Hard limit at route level: 100,000 chars (anything longer rejected with 400).
- Returns null fields when chat is empty — Zod schema allows nulls explicitly.
- Live test confirms LLM picks up "Google Ads campaign for SaaS" topic and "marketing/founder" role from realistic chat. Prompt working.
- Commit: <hash>
```

---

## Task 9: Logging + centralized error handling

**Files:**
- Create: `backend/src/logger.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/integration/error-handling.test.ts`

- [ ] **Step 1: Write the failing test for error handling**

Create `backend/tests/integration/error-handling.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { StubLLM } from '../../src/llm/stub.js';

describe('error handling', () => {
  it('returns 400 with details for invalid request body', async () => {
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

  it('returns 500 with a generic message when the LLM throws', async () => {
    const failingLLM = new StubLLM({}); // no canned responses → throws "no canned response"
    const app = createApp(failingLLM);
    const res = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalPrompt: 'hello', contextSummary: '', qaHistory: [] }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
    // Do NOT leak the underlying exception message to the client.
    expect(body.message).not.toContain('no canned response');
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp(new StubLLM({}));
    const res = await app.request('/no/such/route');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — should fail (the 500 test will fail because errors currently bubble unhandled)**

```bash
pnpm test tests/integration/error-handling.test.ts
```

Expected: at least one FAIL.

- [ ] **Step 3: Create the logger**

Create `backend/src/logger.ts`:

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
```

If `pino-pretty` isn't installed yet:

```bash
pnpm add -D pino-pretty
```

- [ ] **Step 4: Add the error middleware to `server.ts`**

Modify `backend/src/server.ts` — update `createApp` to install the middleware. Full file:

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { healthRoute } from './routes/health.js';
import { pretalkRoute } from './routes/pretalk.js';
import { variantsRoute } from './routes/variants.js';
import { contextRoute } from './routes/context.js';
import { loadConfig } from './config.js';
import { AnthropicLLM } from './llm/anthropic.js';
import { LLMClient } from './llm/types.js';
import { logger } from './logger.js';

export function createApp(llm: LLMClient): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    logger.error({ err: err.message, stack: err.stack, path: c.req.path }, 'request error');
    return c.json({ error: 'internal_error', message: 'Something went wrong.' }, 500);
  });

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  app.route('/', healthRoute);
  app.route('/', pretalkRoute(llm));
  app.route('/', variantsRoute(llm));
  app.route('/', contextRoute(llm));

  return app;
}

const config = process.env.NODE_ENV === 'test' ? null : loadConfig();
export const app = createApp(
  config ? new AnthropicLLM(config.anthropicApiKey) : ({} as LLMClient),
);

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = loadConfig();
  serve({ fetch: app.fetch, port: cfg.port }, ({ port }) => {
    logger.info({ port }, 'server listening');
  });
}
```

- [ ] **Step 5: Run tests — should pass**

```bash
pnpm test
```

Expected: PASS — all green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/logger.ts backend/src/server.ts backend/package.json backend/tests/integration/error-handling.test.ts
git commit -m "feat(backend): pino logger + centralized error handling"
```

- [ ] **Step 7: Update CAPTAINS_LOG.md**

```markdown
### Backend Task 9 complete — Logging + error middleware
- Pino structured logging. Dev mode pretty-printed; prod mode JSON for log aggregators.
- `app.onError` catches everything bubbling from routes/services. Client sees generic "internal_error" — internal details only go to logs. This is the place to never leak stack traces to users.
- `app.notFound` returns clean 404 JSON.
- Test: stub LLM that throws → endpoint returns 500 with generic message; the thrown error's text is NOT in the client response.
- Commit: <hash>
```

---

## Task 10: End-to-end smoke test (real LLM, all three endpoints)

**Files:**
- Create: `backend/tests/integration/e2e.smoke.test.ts`

- [ ] **Step 1: Write the smoke test**

Create `backend/tests/integration/e2e.smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/server.js';
import { AnthropicLLM } from '../../src/llm/anthropic.js';

const liveKey = process.env.ANTHROPIC_API_KEY;
const describeLive = liveKey ? describe : describe.skip;

describeLive('e2e smoke', () => {
  it('runs the full flow: context summarize → pretalk → variants', async () => {
    const llm = new AnthropicLLM(liveKey!);
    const app = createApp(llm);

    // 1. Context summarize
    const ctxRes = await app.request('/context/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chatHistory: 'User: I run social media for a small bakery. Need help with engagement.',
      }),
    });
    expect(ctxRes.status).toBe(200);
    const ctxBody = await ctxRes.json();

    // 2. Pre-talk turn 1
    const ptRes = await app.request('/pretalk/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me come up with content ideas',
        contextSummary: JSON.stringify(ctxBody),
        qaHistory: [],
      }),
    });
    expect(ptRes.status).toBe(200);
    const ptBody = await ptRes.json();
    expect(typeof ptBody.question).toBe('string');
    expect(Array.isArray(ptBody.chips)).toBe(true);

    // 3. Variants (simulate enough Q&A)
    const vRes = await app.request('/variants/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalPrompt: 'help me come up with content ideas',
        contextSummary: JSON.stringify(ctxBody),
        qaHistory: [
          { q: ptBody.question, a: ptBody.chips[0] ?? 'casual / fun' },
          { q: 'Platform?', a: 'Instagram' },
          { q: 'Time available?', a: '1-2 hours per week' },
        ],
      }),
    });
    expect(vRes.status).toBe(200);
    const vBody = await vRes.json();
    expect(vBody.variants).toHaveLength(5);

    // Sanity-check: at least one variant references something specific from context
    const allText = vBody.variants.map((v: { text: string }) => v.text).join('\n');
    expect(allText.toLowerCase()).toMatch(/bakery|instagram|content|engagement/);
  }, 90_000);
});
```

- [ ] **Step 2: Run the smoke test**

```bash
pnpm test tests/integration/e2e.smoke.test.ts
```

Expected: PASS (with `ANTHROPIC_API_KEY` set). Real LLM call, ~30-60s total runtime.

- [ ] **Step 3: Verify the full suite is green**

```bash
pnpm test && pnpm typecheck
```

Expected: PASS for both.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integration/e2e.smoke.test.ts
git commit -m "test(backend): e2e smoke test covering all three endpoints"
```

- [ ] **Step 5: Update CAPTAINS_LOG.md — Plan 1 complete**

```markdown
### Backend Plan 1 COMPLETE 🎉 — Foundation shipped

All three core endpoints working end-to-end against the real Anthropic API:
- `POST /context/summarize` — extracts structured context from raw chat history
- `POST /pretalk/next` — next clarifying question + predicted chips
- `POST /variants/generate` — 5 detailed variants with fill-in blanks

**Tech stack landed:**
- Node.js + TypeScript + Hono + Vitest + Anthropic SDK + Zod + Pino
- pnpm; ESM-only modules
- File-based prompt templates with YAML frontmatter, versioned in git

**Tests:**
- Unit tests with `StubLLM` for fast, deterministic verification of service logic
- Live integration tests env-gated on `ANTHROPIC_API_KEY` — run in dev / CI-with-secret, skipped otherwise
- E2E smoke test exercises all three endpoints in sequence

**Decisions worth remembering:**
- Stateless services — client always carries the full Q&A history
- Generic error responses to clients; detailed errors only in logs
- Strict 5-variant requirement enforced at schema level; would rather fail loudly than ship a degraded UI

**Not in this plan (intentionally):**
- Auth, accounts, rate limiting, billing → Plan 2
- Quality eval harness (golden set + LLM-as-judge) → Plan 3
- Extension → Plan 4

**Next:** Pick up Plan 2 (Backend Production) when ready. The extension (Plan 4) can be built against this backend immediately for local testing.
```

- [ ] **Step 6: Commit the log update and push**

```bash
git add CAPTAINS_LOG.md
git commit -m "docs: log Plan 1 complete"
git push
```

---

## Plan 1 Self-Review

After completing all 10 tasks, verify:

1. **All tests pass:** `pnpm test` shows green for unit + integration; live tests skipped or passing depending on env.
2. **TypeScript clean:** `pnpm typecheck` reports no errors.
3. **Server starts:** `pnpm dev` starts cleanly, all three endpoints respond to manual `curl` requests with valid JSON.
4. **Captain's log:** Every task has an entry. Every entry has the *why*, not just the *what*.
5. **Git log:** Each task produced its own commit (`git log --oneline`).
6. **Spec mapping:** Each spec section in `docs/superpowers/specs/2026-05-13-ai-ticulate-design.md` that this plan claims to cover is actually implemented:
   - Section 6 architecture (extension + backend) — backend side: ✅ Hono server with the 5 documented service shapes (3 LLM endpoints done here; 2 remaining — auth, adaptation — in Plan 2).
   - Section 7 components, backend table — ✅ pre-talk, variants, context-extraction services + LLM client abstraction + prompt library.
   - Section 9 error handling, backend / LLM failures — ✅ centralized middleware; 500 with generic message; 400 for invalid body. Retries on malformed JSON and timeout fallbacks land in Plan 2 (paired with rate limiting).
   - Section 10.1 code correctness — ✅ unit + integration + Playwright (Playwright is for the extension, comes in Plan 4).

If anything above isn't true, fix it before moving on. Do not start Plan 2 until Plan 1 is genuinely green.
