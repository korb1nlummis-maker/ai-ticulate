# ai-ticulate Browser Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete ai-ticulate product: a Manifest V3 browser extension that injects a friendly panel into claude.ai / chatgpt.com / gemini.google.com, takes a vague user request, runs a multi-turn refinement exchange by typing crafted meta-prompts into the user's own AI chat and parsing the responses, and helps the user send a far better final prompt. No backend, no API keys, no accounts.

**Architecture:** Pure client-side. A content script bootstraps four layers: **site adapters** (per-site DOM knowledge behind a stable interface), the **AI bridge** (the `sendAndAwaitResponse` primitive built on an adapter), the **orchestrator** (a state machine driving the multi-turn flow, using a **meta-prompt template library** and a **response parser**), and the **React panel UI**. All LLM work happens in the user's own AI session.

**Tech Stack:** WXT (Manifest V3 framework), TypeScript (strict), React (panel UI), Vitest + happy-dom (tests). Targets Chrome / Firefox / Edge. pnpm.

**Working-directory convention:** All commands assume `cwd = extension/` unless stated otherwise. The repo root is `d:/ai-ticulate/`.

**File structure:**
```
ai-ticulate/
└── extension/
    ├── package.json
    ├── wxt.config.ts
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── entrypoints/
    │   ├── content/
    │   │   └── index.tsx          # content script: bootstraps everything, mounts UI
    │   └── options/               # settings page (Task 13)
    ├── src/
    │   ├── adapters/
    │   │   ├── types.ts           # SiteAdapter interface
    │   │   ├── chatgpt.ts
    │   │   ├── claude.ts
    │   │   ├── gemini.ts
    │   │   ├── fake.ts            # in-memory adapter for tests
    │   │   └── registry.ts        # pick adapter by hostname
    │   ├── bridge/
    │   │   └── ai-bridge.ts       # sendAndAwaitResponse primitive
    │   ├── prompts/
    │   │   └── templates.ts       # meta-prompt template library
    │   ├── parser/
    │   │   └── response-parser.ts # AI response text -> structured data
    │   ├── orchestrator/
    │   │   ├── task-tracker.ts
    │   │   └── orchestrator.ts    # the state machine
    │   ├── content/
    │   │   └── app.tsx            # AppController + mountApp
    │   ├── settings.ts
    │   └── ui/
    │       ├── Panel.tsx
    │       ├── Launcher.tsx
    │       ├── RequestInput.tsx
    │       ├── QuestionsView.tsx
    │       ├── OptionsView.tsx
    │       └── styles.css
    └── tests/
        ├── helpers/
        │   ├── load-fixture.ts
        │   └── render.tsx
        └── ... (mirrors src/)
```

---

## Task 1: Scaffold the WXT extension project

**Files:**
- Create: `extension/package.json`, `extension/wxt.config.ts`, `extension/tsconfig.json`, `extension/vitest.config.ts`, `extension/.gitignore`
- Create: `extension/entrypoints/content/index.tsx`
- Create: `extension/tests/smoke.test.ts`

- [ ] **Step 1: Create the extension directory and init**

From repo root:
```bash
mkdir extension
cd extension
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add react react-dom
pnpm add -D wxt @wxt-dev/module-react typescript @types/react @types/react-dom vitest happy-dom
```

- [ ] **Step 3: Replace `package.json`**

```json
{
  "name": "@ai-ticulate/extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "postinstall": "wxt prepare"
  }
}
```

Then run `pnpm install` once so the `postinstall` (`wxt prepare`) generates the `.wxt/` types directory.

- [ ] **Step 4: Create `wxt.config.ts`**

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ai-ticulate',
    description: 'Get more out of your AI — a smart prompt-crafting layer inside your AI chat.',
    permissions: ['storage'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
    ],
  },
});
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "entrypoints/**/*", "tests/**/*", "wxt.config.ts"]
}
```

> Note: WXT generates `.wxt/tsconfig.json` during `wxt prepare`. If `pnpm install` hasn't run the postinstall yet, run `pnpm exec wxt prepare` manually before typechecking.

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'happy-dom',
  },
});
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
.wxt/
.output/
*.log
coverage/
```

- [ ] **Step 8: Create a minimal content script entrypoint**

Create `extension/entrypoints/content/index.tsx`:

```tsx
export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  main() {
    console.log('[ai-ticulate] content script loaded');
  },
});
```

(`defineContentScript` is a WXT global — no import needed; WXT's generated types provide it.)

- [ ] **Step 9: Write a smoke test**

Create `extension/tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs the test environment', () => {
    expect(1 + 1).toBe(2);
  });
  it('has a DOM available (happy-dom)', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    expect(div.textContent).toBe('hello');
  });
});
```

- [ ] **Step 10: Run test + typecheck + build**

```bash
pnpm exec wxt prepare
pnpm test
pnpm typecheck
pnpm build
```

Expected: smoke test passes (2 tests), typecheck clean, `pnpm build` produces `.output/chrome-mv3/` with a `manifest.json`.

- [ ] **Step 11: Commit**

```bash
cd /d/ai-ticulate
git add extension/
git commit -m "feat(extension): scaffold WXT + React + TypeScript project"
```

- [ ] **Step 12: Update CAPTAINS_LOG.md**

Append under the `## 2026-05-14` section (after the existing entries):

```markdown
### Extension Task 1 complete — WXT scaffold

- `extension/` initialized with WXT (Manifest V3 framework) + React + TypeScript + Vitest.
- Host permissions scoped to chatgpt.com / claude.ai / gemini.google.com only.
- Minimal content script logs a load marker; `pnpm build` produces a loadable unpacked extension.
- Why WXT: it's the current best-maintained MV3 framework — auto-generates the manifest, handles cross-browser quirks, content-script registration, HMR. A build tool, not infrastructure — consistent with the project's zero-infra principle.
- Commit: <hash>
```

Commit the log: `git add CAPTAINS_LOG.md && git commit -m "chore: log extension Task 1"`

---

## Task 2: SiteAdapter interface + registry + fake adapter

**Files:**
- Create: `extension/src/adapters/types.ts`
- Create: `extension/src/adapters/fake.ts`
- Create: `extension/src/adapters/registry.ts`
- Create: `extension/src/adapters/chatgpt.ts`, `claude.ts`, `gemini.ts` (stubs)
- Create: `extension/tests/adapters/registry.test.ts`
- Create: `extension/tests/adapters/fake.test.ts`

- [ ] **Step 1: Define the SiteAdapter interface**

Create `extension/src/adapters/types.ts`:

```ts
/**
 * A SiteAdapter encapsulates everything site-specific about ONE AI chat site.
 * One adapter per site (chatgpt.com, claude.ai, gemini.google.com). When a site
 * redesigns, only its adapter changes.
 */
export interface SiteAdapter {
  /** Human-readable site name, e.g. "ChatGPT". */
  readonly name: string;

  /** True if the adapter's required elements are present and the page looks ready. */
  isReady(): boolean;

  /** Set the chat input box's value to the given text. */
  setInputValue(text: string): void;

  /** Trigger sending the current input (click send / press enter as appropriate). */
  clickSend(): void;

  /**
   * The text of the latest assistant response currently visible.
   * Returns '' if there is no assistant response yet.
   */
  getLatestResponseText(): string;

  /**
   * True if the latest assistant response has finished generating
   * (not still streaming). Adapters detect this via site-specific signals
   * (e.g. the "stop generating" control disappearing).
   */
  isResponseComplete(): boolean;
}
```

- [ ] **Step 2: Write the failing test for the fake adapter**

Create `extension/tests/adapters/fake.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('FakeAdapter', () => {
  it('is ready by default and reports its name', () => {
    const a = new FakeAdapter();
    expect(a.isReady()).toBe(true);
    expect(a.name).toBe('Fake');
  });

  it('stores the input value that was set', () => {
    const a = new FakeAdapter();
    a.setInputValue('hello world');
    expect(a.inputValue).toBe('hello world');
  });

  it('on clickSend, queues the input as a sent message and clears the input', () => {
    const a = new FakeAdapter();
    a.setInputValue('a question');
    a.clickSend();
    expect(a.inputValue).toBe('');
    expect(a.sentMessages).toEqual(['a question']);
  });

  it('lets a test script the next response and its completion', () => {
    const a = new FakeAdapter();
    a.setInputValue('q');
    a.clickSend();
    expect(a.isResponseComplete()).toBe(false);
    a.scriptResponse('the answer', { complete: true });
    expect(a.getLatestResponseText()).toBe('the answer');
    expect(a.isResponseComplete()).toBe(true);
  });
});
```

- [ ] **Step 3: Run — should fail**

```bash
pnpm test tests/adapters/fake.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the fake adapter**

Create `extension/src/adapters/fake.ts`:

```ts
import { SiteAdapter } from './types.js';

/**
 * In-memory adapter for tests. Lets a test drive the "AI" deterministically:
 * setInputValue/clickSend record sent messages; scriptResponse sets what the
 * "AI" replied and whether it's done.
 */
export class FakeAdapter implements SiteAdapter {
  readonly name = 'Fake';
  inputValue = '';
  sentMessages: string[] = [];
  private responseText = '';
  private complete = false;
  private ready = true;

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  setInputValue(text: string): void {
    this.inputValue = text;
  }

  clickSend(): void {
    this.sentMessages.push(this.inputValue);
    this.inputValue = '';
    this.responseText = '';
    this.complete = false;
  }

  getLatestResponseText(): string {
    return this.responseText;
  }

  isResponseComplete(): boolean {
    return this.complete;
  }

  /** Test helper: script what the AI "replied" to the last sent message. */
  scriptResponse(text: string, opts: { complete: boolean }): void {
    this.responseText = text;
    this.complete = opts.complete;
  }
}
```

- [ ] **Step 5: Run — should pass**

```bash
pnpm test tests/adapters/fake.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing test for the registry**

Create `extension/tests/adapters/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickAdapter } from '../../src/adapters/registry.js';

describe('pickAdapter', () => {
  it('returns the ChatGPT adapter for chatgpt.com', () => {
    expect(pickAdapter('chatgpt.com')?.name).toBe('ChatGPT');
  });
  it('returns the Claude adapter for claude.ai', () => {
    expect(pickAdapter('claude.ai')?.name).toBe('Claude');
  });
  it('returns the Gemini adapter for gemini.google.com', () => {
    expect(pickAdapter('gemini.google.com')?.name).toBe('Gemini');
  });
  it('returns null for an unsupported host', () => {
    expect(pickAdapter('example.com')).toBeNull();
  });
});
```

- [ ] **Step 7: Run — should fail**

```bash
pnpm test tests/adapters/registry.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 8: Create stub adapters (filled in by Tasks 3-5)**

Create `extension/src/adapters/chatgpt.ts`:

```ts
import { SiteAdapter } from './types.js';

// Selectors filled in / hardened in Task 3.
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';
  isReady(): boolean {
    return false;
  }
  setInputValue(_text: string): void {
    throw new Error('ChatGPTAdapter.setInputValue not yet implemented');
  }
  clickSend(): void {
    throw new Error('ChatGPTAdapter.clickSend not yet implemented');
  }
  getLatestResponseText(): string {
    return '';
  }
  isResponseComplete(): boolean {
    return false;
  }
}
```

Create `extension/src/adapters/claude.ts` and `extension/src/adapters/gemini.ts` identically, with class names `ClaudeAdapter` / `GeminiAdapter` and `name` `'Claude'` / `'Gemini'`, and matching error messages.

- [ ] **Step 9: Implement the registry**

Create `extension/src/adapters/registry.ts`:

```ts
import { SiteAdapter } from './types.js';
import { ChatGPTAdapter } from './chatgpt.js';
import { ClaudeAdapter } from './claude.js';
import { GeminiAdapter } from './gemini.js';

/**
 * Pick the SiteAdapter for a given hostname. Returns null if the host is
 * not a supported AI site.
 */
export function pickAdapter(hostname: string): SiteAdapter | null {
  if (hostname.endsWith('chatgpt.com')) return new ChatGPTAdapter();
  if (hostname.endsWith('claude.ai')) return new ClaudeAdapter();
  if (hostname.endsWith('gemini.google.com')) return new GeminiAdapter();
  return null;
}
```

- [ ] **Step 10: Run all tests + typecheck**

```bash
pnpm test && pnpm typecheck
```
Expected: registry tests pass (4), fake tests pass (4), smoke (2). Typecheck clean.

- [ ] **Step 11: Commit**

```bash
cd /d/ai-ticulate
git add extension/src/adapters/ extension/tests/adapters/
git commit -m "feat(extension): SiteAdapter interface, registry, fake adapter, adapter stubs"
```

- [ ] **Step 12: Update CAPTAINS_LOG.md**

```markdown
### Extension Task 2 complete — SiteAdapter interface + registry

- `SiteAdapter` interface: the stable contract every site adapter implements (`isReady`, `setInputValue`, `clickSend`, `getLatestResponseText`, `isResponseComplete`).
- `FakeAdapter` — in-memory, test-drivable adapter. `scriptResponse()` lets tests deterministically simulate the AI replying. This is what makes the bridge + orchestrator testable without a real browser.
- `pickAdapter(hostname)` registry. Stub ChatGPT/Claude/Gemini adapters created (real DOM logic lands in Tasks 3-5).
- Commit: <hash>
```

Commit the log.

---

## Task 3: ChatGPT site adapter

**Files:**
- Create: `extension/tests/helpers/load-fixture.ts`
- Modify: `extension/src/adapters/chatgpt.ts`
- Create: `extension/tests/adapters/chatgpt.test.ts`
- Create: `extension/tests/fixtures/chatgpt-snapshot.html`

> **Context for the implementer:** You are writing DOM logic for chatgpt.com. You do NOT have live access to inspect the current site. Write the adapter using **resilient heuristics based on stable attributes** (roles, `aria-label`, element types) rather than brittle generated class names. Then build a representative HTML fixture that exercises those heuristics and test against it. A manual verification step against the live site is flagged at the end — that's expected and is the user's responsibility, like Plan 1's live API tests.

- [ ] **Step 1: Create the shared fixture loader**

Create `extension/tests/helpers/load-fixture.ts`. It reads an HTML fixture file and installs its `<body>` content into the global test `document` using `DOMParser` (which does not execute scripts) and `importNode` — no `innerHTML`, safe and explicit:

```ts
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load an HTML fixture file (path relative to the tests/ directory) and
 * install its <body> content into the global test document. Uses DOMParser
 * (no script execution) + importNode — never innerHTML.
 */
export function loadFixture(relativePathFromTests: string): void {
  const testsDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const html = readFileSync(join(testsDir, relativePathFromTests), 'utf8');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const imported = Array.from(parsed.body.childNodes).map((n) =>
    document.importNode(n, true),
  );
  document.body.replaceChildren(...imported);
}
```

- [ ] **Step 2: Create a representative HTML fixture**

Create `extension/tests/fixtures/chatgpt-snapshot.html` — a complete `<!DOCTYPE html>` document representing the relevant parts of chatgpt.com's chat page. Include:
- A `<textarea id="prompt-textarea" data-testid="prompt-textarea">` serving as the prompt input.
- A send `<button data-testid="send-button" aria-label="Send prompt">`.
- A conversation area with TWO assistant messages, each a container with `data-message-author-role="assistant"`. The first contains text `first assistant message`; the second (last) contains text `second assistant message`.
- NO "stop generating" button present (representing the completed state). The stop button, when present, is `<button data-testid="stop-button">`.

- [ ] **Step 3: Write the failing test**

Create `extension/tests/adapters/chatgpt.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadFixture } from '../helpers/load-fixture.js';
import { ChatGPTAdapter } from '../../src/adapters/chatgpt.js';

describe('ChatGPTAdapter', () => {
  beforeEach(() => {
    loadFixture('fixtures/chatgpt-snapshot.html');
  });

  it('isReady() is true when input and send button are present', () => {
    expect(new ChatGPTAdapter().isReady()).toBe(true);
  });

  it('isReady() is false when the input is missing', () => {
    document.querySelector('#prompt-textarea')?.remove();
    expect(new ChatGPTAdapter().isReady()).toBe(false);
  });

  it('setInputValue writes into the input element', () => {
    const a = new ChatGPTAdapter();
    a.setInputValue('hello from ai-ticulate');
    const input = document.querySelector('#prompt-textarea') as HTMLTextAreaElement | null;
    expect(input?.value ?? input?.textContent ?? '').toContain('hello from ai-ticulate');
  });

  it('getLatestResponseText returns the last assistant message text', () => {
    expect(new ChatGPTAdapter().getLatestResponseText()).toContain('second assistant message');
  });

  it('isResponseComplete is true when no stop-button is present', () => {
    expect(new ChatGPTAdapter().isResponseComplete()).toBe(true);
  });

  it('isResponseComplete is false while a stop-button is present', () => {
    const stop = document.createElement('button');
    stop.setAttribute('data-testid', 'stop-button');
    document.body.appendChild(stop);
    expect(new ChatGPTAdapter().isResponseComplete()).toBe(false);
  });
});
```

- [ ] **Step 4: Run — should fail**

```bash
pnpm test tests/adapters/chatgpt.test.ts
```
Expected: FAIL (adapter returns stub values / throws).

- [ ] **Step 5: Implement the ChatGPT adapter**

Replace `extension/src/adapters/chatgpt.ts`:

```ts
import { SiteAdapter } from './types.js';

/**
 * Adapter for chatgpt.com. Uses resilient heuristics: prefers stable
 * attributes (id, data-testid, aria-label, author-role) over generated
 * class names. If ChatGPT redesigns, this is the only file that changes.
 */
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';

  private findInput(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('#prompt-textarea') ??
      document.querySelector<HTMLElement>('[data-testid="prompt-textarea"]') ??
      document.querySelector<HTMLElement>('main textarea') ??
      document.querySelector<HTMLElement>('main [contenteditable="true"]')
    );
  }

  private findSendButton(): HTMLButtonElement | null {
    return (
      document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label="Send prompt"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label*="Send" i]')
    );
  }

  isReady(): boolean {
    return this.findInput() !== null && this.findSendButton() !== null;
  }

  setInputValue(text: string): void {
    const input = this.findInput();
    if (!input) throw new Error('ChatGPTAdapter: input not found');
    if (input instanceof HTMLTextAreaElement) {
      input.value = text;
    } else {
      input.textContent = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  clickSend(): void {
    const btn = this.findSendButton();
    if (!btn) throw new Error('ChatGPTAdapter: send button not found');
    btn.click();
  }

  getLatestResponseText(): string {
    const messages = document.querySelectorAll<HTMLElement>(
      '[data-message-author-role="assistant"]',
    );
    const last = messages[messages.length - 1];
    return last?.textContent?.trim() ?? '';
  }

  isResponseComplete(): boolean {
    // While generating, ChatGPT shows a stop-button. Absent => complete.
    const stop =
      document.querySelector('[data-testid="stop-button"]') ??
      document.querySelector('button[aria-label*="Stop" i]');
    return stop === null;
  }
}
```

- [ ] **Step 6: Run — should pass**

```bash
pnpm test tests/adapters/chatgpt.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 7: Run full suite + typecheck**

```bash
pnpm test && pnpm typecheck
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
cd /d/ai-ticulate
git add extension/src/adapters/chatgpt.ts extension/tests/adapters/chatgpt.test.ts extension/tests/fixtures/chatgpt-snapshot.html extension/tests/helpers/load-fixture.ts
git commit -m "feat(extension): ChatGPT site adapter with snapshot tests"
```

- [ ] **Step 9: Update CAPTAINS_LOG.md**

```markdown
### Extension Task 3 complete — ChatGPT adapter

- `ChatGPTAdapter` implemented with resilient heuristics: tries stable attributes (`#prompt-textarea`, `data-testid`, `aria-label`, `data-message-author-role`) with fallback chains, never brittle generated class names.
- Shared `loadFixture` test helper installs HTML fixtures into the test document via `DOMParser` + `importNode` (no innerHTML — safe and explicit).
- Tested against a representative frozen HTML fixture (`tests/fixtures/chatgpt-snapshot.html`).
- **Manual live verification still required:** the fixture is a best-effort representation; the adapter must be confirmed against the real chatgpt.com once before release. Tracked as a pre-release checklist item.
- Commit: <hash>
```

Commit the log.

---

## Task 4: Claude site adapter

**Files:**
- Modify: `extension/src/adapters/claude.ts`
- Create: `extension/tests/adapters/claude.test.ts`
- Create: `extension/tests/fixtures/claude-snapshot.html`

Mirror Task 3 exactly, for claude.ai, reusing the `loadFixture` helper. Differences in the heuristics:

- **Input:** claude.ai uses a `div[contenteditable="true"]`. Fixture: a `<div contenteditable="true" aria-label="Write your prompt to Claude" class="ProseMirror">`. Adapter `findInput()` fallback chain: `div.ProseMirror[contenteditable="true"]` → `[contenteditable="true"][aria-label*="prompt" i]` → `main [contenteditable="true"]`.
- **Send button:** `<button aria-label="Send message">`. Adapter chain: `button[aria-label="Send message"]` → `button[aria-label*="Send" i]`.
- **Assistant messages:** fixture uses `<div data-testid="assistant-message">` containers (two; last contains `second assistant message`). Adapter `getLatestResponseText()` chain: `[data-testid="assistant-message"]` → `.font-claude-message`, take last.
- **Completion:** Claude shows a stop control while streaming — `button[aria-label*="Stop" i]`. Absent => complete.

Write `extension/src/adapters/claude.ts` following the EXACT same structure as `ChatGPTAdapter` (private `findInput`/`findSendButton`, `isReady`, `setInputValue`, `clickSend`, `getLatestResponseText`, `isResponseComplete`). Claude's input is contenteditable, so `setInputValue` uses the `textContent` + `input` event path (keeping the same `instanceof HTMLTextAreaElement` guard as ChatGPT is fine and harmless).

Create `extension/tests/fixtures/claude-snapshot.html` and `extension/tests/adapters/claude.test.ts` mirroring Task 3's test exactly via `loadFixture('fixtures/claude-snapshot.html')` (6 tests: isReady true; isReady false when input removed — find+remove the `[contenteditable="true"]`; setInputValue writes; getLatestResponseText returns last assistant text containing `second assistant message`; isResponseComplete true with no stop button; false with a `<button aria-label="Stop">` appended).

Steps: write fixture → write failing test → run (fail) → implement adapter → run (pass) → full suite + typecheck → commit (`feat(extension): Claude site adapter with snapshot tests`) → captain's log entry (`### Extension Task 4 complete — Claude adapter`, same shape as Task 3's, noting the contenteditable/ProseMirror specifics and the manual-verification caveat).

---

## Task 5: Gemini site adapter

**Files:**
- Modify: `extension/src/adapters/gemini.ts`
- Create: `extension/tests/adapters/gemini.test.ts`
- Create: `extension/tests/fixtures/gemini-snapshot.html`

Mirror Task 3 exactly, for gemini.google.com, reusing the `loadFixture` helper. Differences:

- **Input:** Gemini uses a `div[contenteditable="true"]` inside a `rich-textarea` web component. Fixture: `<rich-textarea><div contenteditable="true" aria-label="Enter a prompt here"></div></rich-textarea>`. Adapter `findInput()` chain: `rich-textarea [contenteditable="true"]` → `[contenteditable="true"][aria-label*="prompt" i]` → `main [contenteditable="true"]`.
- **Send button:** `<button aria-label="Send message">`. Adapter chain: `button[aria-label="Send message"]` → `button[aria-label*="Send" i]`.
- **Assistant messages:** fixture uses `<message-content class="model-response-text">` elements (two; last contains `second assistant message`). Adapter `getLatestResponseText()` chain: `message-content` → `.model-response-text`, take last.
- **Completion:** Gemini shows a stop button while generating — `button[aria-label*="Stop" i]`. Absent => complete.

`setInputValue` uses the contenteditable path. Same structure as the other two adapters.

Create the fixture and the 6-test file mirroring Task 3 via `loadFixture('fixtures/gemini-snapshot.html')` (for "isReady false when input missing", remove the `[contenteditable="true"]` element). Steps identical: fixture → failing test → run → implement → run → suite+typecheck → commit (`feat(extension): Gemini site adapter with snapshot tests`) → captain's log (`### Extension Task 5 complete — Gemini adapter` + a note that all three adapters now exist).

---

## Task 6: AI bridge — the `sendAndAwaitResponse` primitive

**Files:**
- Create: `extension/src/bridge/ai-bridge.ts`
- Create: `extension/tests/bridge/ai-bridge.test.ts`

This is the technical heartbeat: type a message, send it, wait for the response to finish, return its text.

- [ ] **Step 1: Write the failing test**

Create `extension/tests/bridge/ai-bridge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

describe('AIBridge.sendAndAwaitResponse', () => {
  it('sends the text and resolves with the completed response', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 1000 });

    const promise = bridge.sendAndAwaitResponse('what is 2+2?');
    setTimeout(() => adapter.scriptResponse('thinking...', { complete: false }), 10);
    setTimeout(() => adapter.scriptResponse('the answer is 4', { complete: true }), 30);

    const result = await promise;
    expect(result).toBe('the answer is 4');
    expect(adapter.sentMessages).toEqual(['what is 2+2?']);
  });

  it('rejects if the response never completes before the timeout', async () => {
    const adapter = new FakeAdapter();
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 50 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/timed out/i);
  });

  it('rejects if the adapter is not ready', async () => {
    const adapter = new FakeAdapter();
    adapter.setReady(false);
    const bridge = new AIBridge(adapter, { pollIntervalMs: 5, timeoutMs: 100 });
    await expect(bridge.sendAndAwaitResponse('q')).rejects.toThrow(/not ready/i);
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test tests/bridge/ai-bridge.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the bridge**

Create `extension/src/bridge/ai-bridge.ts`:

```ts
import { SiteAdapter } from '../adapters/types.js';

export type AIBridgeOptions = {
  /** How often to poll for response completion, in ms. */
  pollIntervalMs: number;
  /** Max time to wait for a response to complete, in ms. */
  timeoutMs: number;
};

const DEFAULT_OPTIONS: AIBridgeOptions = {
  pollIntervalMs: 400,
  timeoutMs: 120_000,
};

/**
 * The AI bridge: the one core primitive the whole product is built on.
 * Types a message into the user's AI chat, sends it, waits for the response
 * to finish generating, and returns the response text.
 */
export class AIBridge {
  private readonly options: AIBridgeOptions;

  constructor(
    private readonly adapter: SiteAdapter,
    options: Partial<AIBridgeOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async sendAndAwaitResponse(text: string): Promise<string> {
    if (!this.adapter.isReady()) {
      throw new Error(`AIBridge: adapter "${this.adapter.name}" is not ready`);
    }

    this.adapter.setInputValue(text);
    this.adapter.clickSend();

    const startedAt = Date.now();
    return new Promise<string>((resolve, reject) => {
      const poll = (): void => {
        if (Date.now() - startedAt > this.options.timeoutMs) {
          reject(new Error('AIBridge: response timed out'));
          return;
        }
        if (this.adapter.isResponseComplete()) {
          const responseText = this.adapter.getLatestResponseText();
          if (responseText.length > 0) {
            resolve(responseText);
            return;
          }
        }
        setTimeout(poll, this.options.pollIntervalMs);
      };
      // Give the site a tick to register the send before the first poll.
      setTimeout(poll, this.options.pollIntervalMs);
    });
  }
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test tests/bridge/ai-bridge.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Full suite + typecheck, then commit**

```bash
pnpm test && pnpm typecheck
cd /d/ai-ticulate
git add extension/src/bridge/ extension/tests/bridge/
git commit -m "feat(extension): AI bridge — sendAndAwaitResponse primitive"
```

- [ ] **Step 6: Update CAPTAINS_LOG.md**

```markdown
### Extension Task 6 complete — AI bridge

- `AIBridge.sendAndAwaitResponse(text)` — the technical heartbeat. Sets the input, sends, polls `isResponseComplete()` until done (or timeout), returns the response text.
- Completion detection: poll-based, driven by the adapter's `isResponseComplete()` (which checks for the site's stop-generating control). Configurable poll interval + timeout; defaults 400ms / 120s.
- Fully tested against `FakeAdapter` — deterministic, no real browser needed: happy path, timeout, adapter-not-ready.
- Commit: <hash>
```

Commit the log.

---

## Task 7: Meta-prompt template library

**Files:**
- Create: `extension/src/prompts/templates.ts`
- Create: `extension/tests/prompts/templates.test.ts`

These are the "prebuilt nuance" — the crafted prompt text the extension wraps around the user's input. Each template instructs the AI what to do AND how to format its reply so the parser (Task 8) can read it.

> **Design note:** the format markers (`### QUESTION`, `### SUGGESTIONS`, `### OPTION n`, `### STATUS`) are the contract between these templates and the Task 8 parser. Keep them exactly consistent.

- [ ] **Step 1: Write the failing test**

Create `extension/tests/prompts/templates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildRefinePrompt,
  buildOptionsPrompt,
  buildFinalizePrompt,
} from '../../src/prompts/templates.js';

describe('meta-prompt templates', () => {
  it('buildRefinePrompt embeds the user request and asks for parseable output', () => {
    const p = buildRefinePrompt('build me a website');
    expect(p).toContain('build me a website');
    expect(p).toContain('### QUESTION');
    expect(p).toContain('### STATUS');
  });

  it('buildOptionsPrompt embeds the goal summary and asks for exactly 5 options', () => {
    const p = buildOptionsPrompt({
      goalSummary: 'a portfolio website for a photographer',
      answers: ['audience: potential clients', 'style: minimal'],
    });
    expect(p).toContain('a portfolio website for a photographer');
    expect(p).toContain('5');
    expect(p).toContain('### OPTION');
  });

  it('buildFinalizePrompt passes the chosen prompt through for sending as-is', () => {
    const chosen = 'Design a minimal portfolio site for a wedding photographer...';
    expect(buildFinalizePrompt(chosen)).toContain('Design a minimal portfolio site');
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test tests/prompts/templates.test.ts
```

- [ ] **Step 3: Implement the templates**

Create `extension/src/prompts/templates.ts`:

```ts
/**
 * Meta-prompt templates — the "prebuilt nuance". These produce the text the
 * extension types into the user's AI chat. Each asks the AI to respond in a
 * format the response parser (parser/response-parser.ts) can read. The format
 * markers (### QUESTION, ### SUGGESTIONS, ### OPTION n, ### STATUS) are a
 * contract — keep them in sync with the parser.
 */

const FORMAT_RULES = `
Format your reply EXACTLY like this so a tool can read it:
- If you need to ask clarifying questions, output one or more blocks:
  ### QUESTION
  <the question, one short sentence>
  ### SUGGESTIONS
  <2-5 short suggested answers, one per line>
- After your questions (or if you need none), output:
  ### STATUS
  ready
  (use "ready" if you have enough to proceed, otherwise "need-more")
Do not output anything else outside these blocks.
`.trim();

export function buildRefinePrompt(userRequest: string): string {
  return `I want help getting a great result from you. My request is:

"${userRequest}"

Before answering it, help me sharpen it. Ask me any clarifying questions you need to understand my goal, audience, constraints, and what a great result looks like. Ask only what genuinely matters — at most 4 questions.

${FORMAT_RULES}`;
}

export function buildOptionsPrompt(input: {
  goalSummary: string;
  answers: string[];
}): string {
  const answersBlock =
    input.answers.length > 0
      ? `Here is what I've told you so far:\n${input.answers.map((a) => `- ${a}`).join('\n')}`
      : 'I have not answered any clarifying questions yet.';

  return `My goal: ${input.goalSummary}

${answersBlock}

Now give me 5 distinct, detailed prompt options I could send you to get a great result. Each option should be a complete, ready-to-send prompt — more specific and richer than my original request. Make the 5 genuinely different in angle, not the same prompt at 5 lengths. Where a useful detail could be personalized, leave a blank like [___].

Format your reply EXACTLY like this:
### OPTION 1
<the full prompt text>
### OPTION 2
<the full prompt text>
### OPTION 3
<the full prompt text>
### OPTION 4
<the full prompt text>
### OPTION 5
<the full prompt text>
Do not output anything else.`;
}

export function buildFinalizePrompt(chosenPrompt: string): string {
  return chosenPrompt;
}
```

- [ ] **Step 4: Run — should pass; full suite + typecheck**

```bash
pnpm test && pnpm typecheck
```

- [ ] **Step 5: Commit + log**

```bash
cd /d/ai-ticulate
git add extension/src/prompts/ extension/tests/prompts/
git commit -m "feat(extension): meta-prompt template library"
```

Captain's log:
```markdown
### Extension Task 7 complete — Meta-prompt template library

- Three meta-prompt builders: `buildRefinePrompt` (vague request -> AI asks clarifying questions), `buildOptionsPrompt` (goal + answers -> AI produces 5 distinct option prompts with [___] blanks), `buildFinalizePrompt` (passes the chosen prompt through as-is).
- The `### QUESTION` / `### SUGGESTIONS` / `### OPTION n` / `### STATUS` markers are the contract between these templates and the Task 8 parser — they tell the user's AI to format replies so the extension can read them off the page.
- Conceptual basis: the v1 backend prompts, rewritten as meta-prompts the user's own AI executes.
- Commit: <hash>
```

---

## Task 8: Response parser

**Files:**
- Create: `extension/src/parser/response-parser.ts`
- Create: `extension/tests/parser/response-parser.test.ts`

Turns the AI's raw reply text (read off the page) into structured data. Implemented as a **line-by-line scanner** — simple, debuggable, no intricate regex.

- [ ] **Step 1: Write the failing test**

Create `extension/tests/parser/response-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseResponse } from '../../src/parser/response-parser.js';

describe('parseResponse', () => {
  it('parses clarifying questions with suggestions and need-more status', () => {
    const raw = `### QUESTION
Who is the website for?
### SUGGESTIONS
Potential clients
Friends and family
My employer
### QUESTION
What style do you want?
### SUGGESTIONS
Minimal
Bold and colorful
### STATUS
need-more`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]!.question).toBe('Who is the website for?');
      expect(result.questions[0]!.suggestions).toEqual([
        'Potential clients',
        'Friends and family',
        'My employer',
      ]);
      expect(result.status).toBe('need-more');
    }
  });

  it('parses a ready status with no questions', () => {
    const result = parseResponse(`### STATUS\nready`);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(0);
      expect(result.status).toBe('ready');
    }
  });

  it('parses 5 options', () => {
    const raw = `### OPTION 1
First option text
### OPTION 2
Second option text
### OPTION 3
Third option text
### OPTION 4
Fourth option text
### OPTION 5
Fifth option text [___]`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toBe('First option text');
      expect(result.options[4]).toContain('[___]');
    }
  });

  it('returns kind "unknown" when no recognizable markers are present', () => {
    expect(parseResponse('Just some normal prose.').kind).toBe('unknown');
  });

  it('tolerates extra prose around the markers', () => {
    const raw = `Sure! Here you go:

### OPTION 1
A
### OPTION 2
B
### OPTION 3
C
### OPTION 4
D
### OPTION 5
E

Let me know if you want changes.`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toBe('A');
      expect(result.options[4]).toBe('E');
    }
  });

  it('handles multi-line option bodies', () => {
    const raw = `### OPTION 1
line one
line two
### OPTION 2
B
### OPTION 3
C
### OPTION 4
D
### OPTION 5
E`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options[0]).toBe('line one\nline two');
    }
  });
});
```

- [ ] **Step 2: Run — should fail**

```bash
pnpm test tests/parser/response-parser.test.ts
```

- [ ] **Step 3: Implement the parser (line-by-line scanner)**

Create `extension/src/parser/response-parser.ts`:

```ts
export type ParsedQuestion = { question: string; suggestions: string[] };

export type ParsedResponse =
  | { kind: 'questions'; questions: ParsedQuestion[]; status: 'ready' | 'need-more' }
  | { kind: 'options'; options: string[] }
  | { kind: 'unknown'; raw: string };

/** Marker classification for a single line. */
type MarkerType =
  | 'option'
  | 'question'
  | 'suggestions'
  | 'status'
  | 'other-marker'
  | 'content';

function classify(line: string): MarkerType {
  const t = line.trim();
  if (/^###\s*OPTION\s*\d+\s*$/i.test(t)) return 'option';
  if (/^###\s*QUESTION\s*$/i.test(t)) return 'question';
  if (/^###\s*SUGGESTIONS\s*$/i.test(t)) return 'suggestions';
  if (/^###\s*STATUS\s*$/i.test(t)) return 'status';
  if (/^###/.test(t)) return 'other-marker';
  return 'content';
}

/**
 * Parse the AI's raw reply text into structured data. The AI was instructed
 * (by the meta-prompt templates) to use ### QUESTION / ### SUGGESTIONS /
 * ### OPTION n / ### STATUS markers. This scanner is deliberately tolerant of
 * extra prose around the markers, since models sometimes add a greeting.
 */
export function parseResponse(raw: string): ParsedResponse {
  const lines = raw.split(/\r?\n/);
  const markers = lines.map(classify);

  const hasOptions = markers.some((m) => m === 'option');
  const hasQuestionsOrStatus = markers.some(
    (m) => m === 'question' || m === 'status',
  );

  if (hasOptions) {
    return { kind: 'options', options: scanOptions(lines, markers) };
  }
  if (hasQuestionsOrStatus) {
    return scanQuestions(lines, markers);
  }
  return { kind: 'unknown', raw };
}

function scanOptions(lines: string[], markers: MarkerType[]): string[] {
  const options: string[] = [];
  let current: string[] | null = null;

  const flush = (): void => {
    if (current !== null) {
      const text = current.join('\n').trim();
      if (text.length > 0) options.push(text);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const marker = markers[i]!;
    if (marker === 'option') {
      flush();
      current = [];
    } else if (marker !== 'content') {
      // Any non-option marker ends the current option block.
      flush();
      current = null;
    } else if (current !== null) {
      current.push(lines[i]!);
    }
  }
  flush();
  return options;
}

function scanQuestions(lines: string[], markers: MarkerType[]): ParsedResponse {
  const questions: ParsedQuestion[] = [];
  let status: 'ready' | 'need-more' = 'need-more';

  type Mode = 'none' | 'question' | 'suggestions' | 'status';
  let mode: Mode = 'none';
  let currentQuestion: string[] = [];
  let currentSuggestions: string[] = [];

  const flushQuestion = (): void => {
    const q = currentQuestion.join(' ').trim();
    if (q.length > 0) {
      questions.push({
        question: q,
        suggestions: currentSuggestions
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      });
    }
    currentQuestion = [];
    currentSuggestions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const marker = markers[i]!;
    if (marker === 'question') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'question';
    } else if (marker === 'suggestions') {
      mode = 'suggestions';
    } else if (marker === 'status') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'status';
    } else if (marker === 'option' || marker === 'other-marker') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'none';
    } else {
      // content line
      if (mode === 'question') {
        currentQuestion.push(lines[i]!);
      } else if (mode === 'suggestions') {
        currentSuggestions.push(lines[i]!);
      } else if (mode === 'status') {
        const t = lines[i]!.trim().toLowerCase();
        if (t === 'ready') status = 'ready';
        else if (t === 'need-more') status = 'need-more';
      }
    }
  }
  if (mode === 'question' || mode === 'suggestions') flushQuestion();

  return { kind: 'questions', questions, status };
}
```

- [ ] **Step 4: Run — iterate until all 6 tests pass**

```bash
pnpm test tests/parser/response-parser.test.ts
```

- [ ] **Step 5: Full suite + typecheck + commit + log**

```bash
pnpm test && pnpm typecheck
cd /d/ai-ticulate
git add extension/src/parser/ extension/tests/parser/
git commit -m "feat(extension): response parser — AI reply text to structured data"
```

Captain's log:
```markdown
### Extension Task 8 complete — Response parser

- `parseResponse(raw)` turns the AI's raw reply (read off the page) into structured data: `{kind:'questions', questions, status}` | `{kind:'options', options}` | `{kind:'unknown', raw}`.
- Implemented as a line-by-line scanner (classify each line as a marker or content, then walk a small state machine) — simple and debuggable, no intricate regex.
- Tolerant of extra prose around the markers — models sometimes add a greeting/sign-off, and the scanner ignores it. Handles multi-line option bodies.
- `unknown` kind is the graceful-degradation path: if the AI didn't follow the format, the orchestrator can fall back to showing the raw text.
- Commit: <hash>
```

---

## Task 9: Task tracker

**Files:**
- Create: `extension/src/orchestrator/task-tracker.ts`
- Create: `extension/tests/orchestrator/task-tracker.test.ts`

Holds the evolving understanding of what the user is trying to accomplish.

- [ ] **Step 1: Write the failing test**

Create `extension/tests/orchestrator/task-tracker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TaskTracker } from '../../src/orchestrator/task-tracker.js';

describe('TaskTracker', () => {
  it('starts with the original request as the goal summary', () => {
    const t = new TaskTracker('build me a website');
    expect(t.goalSummary).toBe('build me a website');
    expect(t.answers).toEqual([]);
  });

  it('records answered questions', () => {
    const t = new TaskTracker('build me a website');
    t.recordAnswer('Who is it for?', 'Potential clients');
    t.recordAnswer('What style?', 'Minimal');
    expect(t.answers).toEqual([
      'Who is it for? — Potential clients',
      'What style? — Minimal',
    ]);
  });

  it('can refine the goal summary as understanding improves', () => {
    const t = new TaskTracker('build me a website');
    t.refineGoal('a minimal portfolio website for a photographer');
    expect(t.goalSummary).toBe('a minimal portfolio website for a photographer');
  });

  it('produces a snapshot for use in meta-prompts', () => {
    const t = new TaskTracker('build me a website');
    t.recordAnswer('Who is it for?', 'Clients');
    const snap = t.snapshot();
    expect(snap.goalSummary).toBe('build me a website');
    expect(snap.answers).toEqual(['Who is it for? — Clients']);
  });
});
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Implement**

Create `extension/src/orchestrator/task-tracker.ts`:

```ts
export type TaskSnapshot = {
  goalSummary: string;
  answers: string[];
};

/**
 * Holds the evolving understanding of what the user is trying to accomplish.
 * Fed into meta-prompts so context compounds across turns.
 */
export class TaskTracker {
  private _goalSummary: string;
  private _answers: string[] = [];

  constructor(originalRequest: string) {
    this._goalSummary = originalRequest;
  }

  get goalSummary(): string {
    return this._goalSummary;
  }

  get answers(): string[] {
    return [...this._answers];
  }

  recordAnswer(question: string, answer: string): void {
    this._answers.push(`${question} — ${answer}`);
  }

  refineGoal(newSummary: string): void {
    this._goalSummary = newSummary;
  }

  snapshot(): TaskSnapshot {
    return { goalSummary: this._goalSummary, answers: [...this._answers] };
  }
}
```

- [ ] **Step 4: Run — pass; full suite + typecheck; commit + log**

```bash
pnpm test && pnpm typecheck
cd /d/ai-ticulate
git add extension/src/orchestrator/task-tracker.ts extension/tests/orchestrator/task-tracker.test.ts
git commit -m "feat(extension): task tracker"
```

Captain's log:
```markdown
### Extension Task 9 complete — Task tracker

- `TaskTracker` holds the evolving goal understanding: the goal summary (refinable as understanding improves) and the list of answered clarifying questions.
- `snapshot()` feeds into meta-prompts so context compounds across turns.
- Commit: <hash>
```

---

## Task 10: Orchestrator state machine

**Files:**
- Create: `extension/src/orchestrator/orchestrator.ts`
- Create: `extension/tests/orchestrator/orchestrator.test.ts`

Ties together bridge + templates + parser + task tracker. Drives the multi-turn flow.

- [ ] **Step 1: Write the failing test**

Create `extension/tests/orchestrator/orchestrator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/orchestrator/orchestrator.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

function makeOrchestrator() {
  const adapter = new FakeAdapter();
  const bridge = new AIBridge(adapter, { pollIntervalMs: 2, timeoutMs: 1000 });
  const orch = new Orchestrator(bridge);
  return { adapter, orch };
}

describe('Orchestrator', () => {
  it('starts in idle, moves to refining on start()', async () => {
    const { adapter, orch } = makeOrchestrator();
    expect(orch.state).toBe('idle');

    const startPromise = orch.start('build me a website');
    setTimeout(() => {
      adapter.scriptResponse(
        `### QUESTION\nWho is it for?\n### SUGGESTIONS\nClients\nFriends\n### STATUS\nneed-more`,
        { complete: true },
      );
    }, 5);
    const result = await startPromise;
    expect(orch.state).toBe('refining');
    expect(result.kind).toBe('questions');
  });

  it('moves to presenting-options once the AI returns 5 options', async () => {
    const { adapter, orch } = makeOrchestrator();
    const startP = orch.start('build me a website');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await startP;

    const optsP = orch.requestOptions();
    setTimeout(() => {
      adapter.scriptResponse(
        `### OPTION 1\nA\n### OPTION 2\nB\n### OPTION 3\nC\n### OPTION 4\nD\n### OPTION 5\nE`,
        { complete: true },
      );
    }, 5);
    const result = await optsP;
    expect(result.kind).toBe('options');
    expect(orch.state).toBe('presenting-options');
  });

  it('finalize() sends the chosen prompt and moves to done', async () => {
    const { adapter, orch } = makeOrchestrator();
    const startP = orch.start('build a website');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await startP;

    const finalizeP = orch.finalize('Design a minimal portfolio site for a photographer');
    setTimeout(
      () => adapter.scriptResponse('Here is your website plan...', { complete: true }),
      5,
    );
    const finalText = await finalizeP;
    expect(
      adapter.sentMessages.some((m) => m.includes('Design a minimal portfolio site')),
    ).toBe(true);
    expect(finalText).toContain('Here is your website plan');
    expect(orch.state).toBe('done');
  });

  it('recordAnswer before start() throws', () => {
    const { orch } = makeOrchestrator();
    expect(() => orch.recordAnswer('q', 'a')).toThrow(/start/i);
  });
});
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Implement the orchestrator**

Create `extension/src/orchestrator/orchestrator.ts`:

```ts
import { AIBridge } from '../bridge/ai-bridge.js';
import { TaskTracker } from './task-tracker.js';
import { parseResponse, ParsedResponse } from '../parser/response-parser.js';
import {
  buildRefinePrompt,
  buildOptionsPrompt,
  buildFinalizePrompt,
} from '../prompts/templates.js';

export type OrchestratorState =
  | 'idle'
  | 'refining'
  | 'presenting-options'
  | 'finalizing'
  | 'done';

/**
 * Drives the multi-turn refinement flow. Owns the state machine and the
 * task tracker; uses the AI bridge to talk to the user's AI and the parser
 * to read the replies.
 */
export class Orchestrator {
  private _state: OrchestratorState = 'idle';
  private tracker: TaskTracker | null = null;

  constructor(private readonly bridge: AIBridge) {}

  get state(): OrchestratorState {
    return this._state;
  }

  /** Begin: send the refine meta-prompt for the user's vague request. */
  async start(userRequest: string): Promise<ParsedResponse> {
    this.tracker = new TaskTracker(userRequest);
    this._state = 'refining';
    const raw = await this.bridge.sendAndAwaitResponse(buildRefinePrompt(userRequest));
    return parseResponse(raw);
  }

  /** Record a user's answer to a clarifying question. */
  recordAnswer(question: string, answer: string): void {
    if (!this.tracker) throw new Error('Orchestrator: start() must be called first');
    this.tracker.recordAnswer(question, answer);
  }

  /** Ask the AI for the 5 detailed option prompts. */
  async requestOptions(): Promise<ParsedResponse> {
    if (!this.tracker) throw new Error('Orchestrator: start() must be called first');
    const snap = this.tracker.snapshot();
    const raw = await this.bridge.sendAndAwaitResponse(
      buildOptionsPrompt({ goalSummary: snap.goalSummary, answers: snap.answers }),
    );
    const parsed = parseResponse(raw);
    this._state = 'presenting-options';
    return parsed;
  }

  /** Send the user's chosen final prompt and return the AI's real answer. */
  async finalize(chosenPrompt: string): Promise<string> {
    this._state = 'finalizing';
    const answer = await this.bridge.sendAndAwaitResponse(buildFinalizePrompt(chosenPrompt));
    this._state = 'done';
    return answer;
  }

  reset(): void {
    this._state = 'idle';
    this.tracker = null;
  }
}
```

- [ ] **Step 4: Run — iterate to green; full suite + typecheck; commit + log**

```bash
pnpm test && pnpm typecheck
cd /d/ai-ticulate
git add extension/src/orchestrator/orchestrator.ts extension/tests/orchestrator/orchestrator.test.ts
git commit -m "feat(extension): orchestrator state machine"
```

Captain's log:
```markdown
### Extension Task 10 complete — Orchestrator state machine

- `Orchestrator` ties the engine together: `start()` (send refine meta-prompt), `recordAnswer()`, `requestOptions()` (get the 5 options), `finalize()` (send the chosen prompt, return the AI's real answer).
- State machine: idle -> refining -> presenting-options -> finalizing -> done.
- Fully tested with `FakeAdapter` + `AIBridge` — the whole engine is verifiable without a real browser. **Milestone: the headless engine is complete.** Tasks 11-13 put a UI on it and wire it into the page.
- Commit: <hash>
```

---

## Task 11: Panel UI components

**Files:**
- Create: `extension/src/ui/styles.css`
- Create: `extension/src/ui/Launcher.tsx`
- Create: `extension/src/ui/RequestInput.tsx`
- Create: `extension/src/ui/QuestionsView.tsx`
- Create: `extension/src/ui/OptionsView.tsx`
- Create: `extension/src/ui/Panel.tsx`
- Create: `extension/tests/helpers/render.tsx`
- Create: `extension/tests/ui/Panel.test.tsx`

The friendly face. React components. Keep them presentational — they receive data + callbacks as props; the content script (Task 12) wires them to the orchestrator. Render in the DOM with React; never assign HTML strings.

- [ ] **Step 1: Create the test render helper**

Create `extension/tests/helpers/render.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import type { ReactElement } from 'react';

export function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    getByPlaceholderText(re: RegExp): Element {
      const el = [...container.querySelectorAll('input,textarea')].find((e) =>
        re.test((e as HTMLInputElement).placeholder),
      );
      if (!el) throw new Error(`no element with placeholder ${re}`);
      return el;
    },
    getAllByRole(role: string): HTMLElement[] {
      if (role === 'button') return [...container.querySelectorAll('button')];
      return [...container.querySelectorAll<HTMLElement>(`[role="${role}"]`)];
    },
  };
}
```

- [ ] **Step 2: Write a component test (failing)**

Create `extension/tests/ui/Panel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '../helpers/render.js';
import { Panel } from '../../src/ui/Panel.js';

describe('Panel', () => {
  it('shows the request input in the idle state', () => {
    const { getByPlaceholderText } = render(
      <Panel
        view={{ kind: 'idle' }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(getByPlaceholderText(/what do you want/i)).toBeTruthy();
  });

  it('shows 5 options and fires onPickOption when one is clicked', () => {
    const onPick = vi.fn();
    const { getAllByRole } = render(
      <Panel
        view={{ kind: 'options', options: ['A', 'B', 'C', 'D', 'E'] }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={onPick}
        onClose={vi.fn()}
      />,
    );
    const optionButtons = getAllByRole('button').filter((b) =>
      ['A', 'B', 'C', 'D', 'E'].includes(b.textContent ?? ''),
    );
    expect(optionButtons).toHaveLength(5);
    optionButtons[2]!.click();
    expect(onPick).toHaveBeenCalledWith('C');
  });
});
```

- [ ] **Step 3: Run — should fail**

```bash
pnpm test tests/ui/Panel.test.tsx
```

- [ ] **Step 4: Implement the components**

Create `extension/src/ui/styles.css` — a small self-contained stylesheet. A fixed-position panel (right side, ~380px wide, full height, high `z-index: 2147483000`), clean neutral light styling, every class prefixed `.ait-` to avoid clashing with host-page CSS. Include styles for `.ait-panel`, `.ait-header`, `.ait-launcher`, `.ait-option`, `.ait-chip`, `.ait-textarea`, `.ait-button`, `.ait-error`, `.ait-preview`.

Create `extension/src/ui/Launcher.tsx`:

```tsx
type LauncherProps = { onClick: () => void };

export function Launcher({ onClick }: LauncherProps) {
  return (
    <button className="ait-launcher" onClick={onClick} aria-label="Open ai-ticulate">
      ✨
    </button>
  );
}
```

Create `extension/src/ui/RequestInput.tsx` — a controlled `<textarea className="ait-textarea" placeholder="What do you want to ask your AI?">` plus a submit `<button className="ait-button">`. On submit, calls `onSubmit(text)` prop if text is non-empty. Manages its own input state with `useState`.

Create `extension/src/ui/QuestionsView.tsx` — props: `questions: {question: string; suggestions: string[]}[]`, `onSubmit: (answers: {question: string; answer: string}[]) => void`. Renders each question with its `suggestions` as clickable `.ait-chip` buttons (clicking a chip sets that question's answer) plus a free-text `<input>`. A "Continue" button collects every question's current answer and calls `onSubmit`. Manage answers in a `useState` array keyed by question index.

Create `extension/src/ui/OptionsView.tsx` — props: `options: string[]`, `onPick: (finalPrompt: string) => void`. Renders each option as a `.ait-option` button. If an option string contains `[___]`, instead render it with inline `<input>` fields in place of each `[___]` occurrence; a "Use this" button substitutes the input values into the blanks and calls `onPick` with the filled string. Options without blanks call `onPick(option)` directly on click. Substitute blanks by splitting the option string on `[___]` and interleaving input values — never build HTML strings.

Create `extension/src/ui/Panel.tsx`:

```tsx
import { RequestInput } from './RequestInput.js';
import { QuestionsView } from './QuestionsView.js';
import { OptionsView } from './OptionsView.js';
import './styles.css';

export type PanelView =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'questions'; questions: { question: string; suggestions: string[] }[] }
  | { kind: 'options'; options: string[] }
  | { kind: 'done'; finalAnswerPreview: string }
  | { kind: 'error'; message: string };

export type PanelProps = {
  view: PanelView;
  onSubmitRequest: (text: string) => void;
  onAnswerQuestions: (answers: { question: string; answer: string }[]) => void;
  onPickOption: (finalPrompt: string) => void;
  onClose: () => void;
};

export function Panel(props: PanelProps) {
  const { view } = props;
  return (
    <div className="ait-panel">
      <div className="ait-header">
        <span>ai-ticulate</span>
        <button className="ait-button" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </div>
      {view.kind === 'idle' && <RequestInput onSubmit={props.onSubmitRequest} />}
      {view.kind === 'loading' && <p>{view.message}</p>}
      {view.kind === 'questions' && (
        <QuestionsView questions={view.questions} onSubmit={props.onAnswerQuestions} />
      )}
      {view.kind === 'options' && (
        <OptionsView options={view.options} onPick={props.onPickOption} />
      )}
      {view.kind === 'done' && (
        <div>
          <p>Sent! Your AI is answering the refined prompt.</p>
          <p className="ait-preview">{view.finalAnswerPreview}</p>
        </div>
      )}
      {view.kind === 'error' && <p className="ait-error">{view.message}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Run the component test — iterate to green**

```bash
pnpm test tests/ui/Panel.test.tsx
```

- [ ] **Step 6: Full suite + typecheck + commit + log**

```bash
pnpm test && pnpm typecheck
cd /d/ai-ticulate
git add extension/src/ui/ extension/tests/ui/ extension/tests/helpers/render.tsx
git commit -m "feat(extension): React panel UI components"
```

Captain's log:
```markdown
### Extension Task 11 complete — Panel UI components

- Presentational React components: `Launcher` (✨ button), `RequestInput`, `QuestionsView` (chips + free text), `OptionsView` (5 options, inline [___] fill-in inputs), `Panel` (container, switches on `view.kind`).
- Components are pure props-in/callbacks-out — no orchestrator coupling. Task 12 wires them to the engine. All rendering via React — no HTML-string assignment anywhere.
- Scoped `.ait-` CSS class prefix so panel styles never clash with the host page.
- Commit: <hash>
```

---

## Task 12: Content script — wire engine + UI into the page

**Files:**
- Create: `extension/src/content/app.tsx`
- Modify: `extension/entrypoints/content/index.tsx`
- Create: `extension/tests/content/app.test.tsx`

This is the integration task: on a supported page, pick the adapter, build the bridge + orchestrator, mount the Panel, and connect UI callbacks to orchestrator methods.

- [ ] **Step 1: Write the integration test (failing)**

Create `extension/tests/content/app.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { AppController } from '../../src/content/app.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { FakeAdapter } from '../../src/adapters/fake.js';

function setup() {
  const adapter = new FakeAdapter();
  const bridge = new AIBridge(adapter, { pollIntervalMs: 2, timeoutMs: 1000 });
  const controller = new AppController(bridge);
  return { adapter, controller };
}

describe('AppController', () => {
  it('starts idle and transitions to a questions view after submitting a request', async () => {
    const { adapter, controller } = setup();
    expect(controller.view.kind).toBe('idle');

    const p = controller.submitRequest('build me a website');
    setTimeout(() => {
      adapter.scriptResponse(
        `### QUESTION\nWho is it for?\n### SUGGESTIONS\nClients\n### STATUS\nneed-more`,
        { complete: true },
      );
    }, 5);
    await p;
    expect(controller.view.kind).toBe('questions');
  });

  it('shows an error view if the bridge throws', async () => {
    const { adapter, controller } = setup();
    adapter.setReady(false); // bridge throws "not ready"
    await controller.submitRequest('anything');
    expect(controller.view.kind).toBe('error');
  });

  it('notifies subscribers on view change', async () => {
    const { adapter, controller } = setup();
    let calls = 0;
    controller.subscribe(() => {
      calls++;
    });
    const p = controller.submitRequest('x');
    setTimeout(() => adapter.scriptResponse(`### STATUS\nready`, { complete: true }), 5);
    await p;
    expect(calls).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — should fail**

- [ ] **Step 3: Implement `AppController` + `mountApp`**

Create `extension/src/content/app.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import { AIBridge } from '../bridge/ai-bridge.js';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { ParsedResponse } from '../parser/response-parser.js';
import { Panel, PanelView } from '../ui/Panel.js';
import { Launcher } from '../ui/Launcher.js';

type Subscriber = () => void;

/**
 * Owns the panel view state and wraps the orchestrator. UI callbacks call
 * these methods; each maps the orchestrator's ParsedResponse to the next
 * PanelView, and catches thrown errors into a calm error view.
 */
export class AppController {
  private _view: PanelView = { kind: 'idle' };
  private subscribers: Subscriber[] = [];
  private orchestrator: Orchestrator;
  open = false;

  constructor(bridge: AIBridge) {
    this.orchestrator = new Orchestrator(bridge);
  }

  get view(): PanelView {
    return this._view;
  }

  subscribe(fn: Subscriber): void {
    this.subscribers.push(fn);
  }

  private notify(): void {
    for (const fn of this.subscribers) fn();
  }

  private setView(v: PanelView): void {
    this._view = v;
    this.notify();
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.notify();
  }

  private mapResponse(parsed: ParsedResponse): PanelView {
    if (parsed.kind === 'questions') {
      if (parsed.questions.length === 0 && parsed.status === 'ready') {
        return { kind: 'loading', message: 'Getting your 5 options…' };
      }
      return { kind: 'questions', questions: parsed.questions };
    }
    if (parsed.kind === 'options') {
      return { kind: 'options', options: parsed.options };
    }
    return {
      kind: 'error',
      message: "The AI's reply could not be read. Try again, or send your prompt as-is.",
    };
  }

  async submitRequest(text: string): Promise<void> {
    this.setView({ kind: 'loading', message: 'Asking your AI to help sharpen this…' });
    try {
      const parsed = await this.orchestrator.start(text);
      const next = this.mapResponse(parsed);
      this.setView(next);
      if (next.kind === 'loading') {
        await this.fetchOptions();
      }
    } catch (err) {
      this.setView({ kind: 'error', message: errorMessage(err) });
    }
  }

  async answerQuestions(answers: { question: string; answer: string }[]): Promise<void> {
    try {
      for (const a of answers) this.orchestrator.recordAnswer(a.question, a.answer);
      this.setView({ kind: 'loading', message: 'Getting your 5 options…' });
      await this.fetchOptions();
    } catch (err) {
      this.setView({ kind: 'error', message: errorMessage(err) });
    }
  }

  private async fetchOptions(): Promise<void> {
    const parsed = await this.orchestrator.requestOptions();
    this.setView(this.mapResponse(parsed));
  }

  async pickOption(finalPrompt: string): Promise<void> {
    this.setView({ kind: 'loading', message: 'Sending your refined prompt…' });
    try {
      const answer = await this.orchestrator.finalize(finalPrompt);
      this.setView({ kind: 'done', finalAnswerPreview: answer.slice(0, 280) });
    } catch (err) {
      this.setView({ kind: 'error', message: errorMessage(err) });
    }
  }

  close(): void {
    this.setOpen(false);
  }
}

function errorMessage(err: unknown): string {
  // Never leak raw internals; give the user a calm, actionable message.
  if (err instanceof Error && /not ready/i.test(err.message)) {
    return "Couldn't find the chat box on this page yet. Wait for the page to finish loading and try again.";
  }
  if (err instanceof Error && /timed out/i.test(err.message)) {
    return 'Your AI took too long to respond. Try again.';
  }
  return 'Something went wrong. Try again, or send your prompt as-is.';
}

/** Mount the panel + launcher into a host element on the page. */
export function mountApp(bridge: AIBridge, container: HTMLElement): AppController {
  const controller = new AppController(bridge);
  const root = createRoot(container);

  const renderAll = (): void => {
    root.render(
      <>
        <Launcher onClick={() => controller.setOpen(!controller.open)} />
        {controller.open && (
          <Panel
            view={controller.view}
            onSubmitRequest={(t) => void controller.submitRequest(t)}
            onAnswerQuestions={(a) => void controller.answerQuestions(a)}
            onPickOption={(p) => void controller.pickOption(p)}
            onClose={() => controller.close()}
          />
        )}
      </>,
    );
  };

  controller.subscribe(renderAll);
  renderAll();
  return controller;
}
```

- [ ] **Step 4: Wire the content script entrypoint**

Replace `extension/entrypoints/content/index.tsx`:

```tsx
import { pickAdapter } from '../../src/adapters/registry.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { mountApp } from '../../src/content/app.js';

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  main() {
    const adapter = pickAdapter(location.hostname);
    if (!adapter) {
      console.log('[ai-ticulate] no adapter for this host');
      return;
    }
    const host = document.createElement('div');
    host.id = 'ai-ticulate-root';
    document.body.appendChild(host);
    const bridge = new AIBridge(adapter);
    mountApp(bridge, host);
    console.log(`[ai-ticulate] mounted on ${adapter.name}`);
  },
});
```

- [ ] **Step 5: Run integration test — iterate to green**

```bash
pnpm test tests/content/app.test.tsx
```

- [ ] **Step 6: Full suite + typecheck + build + commit + log**

```bash
pnpm test && pnpm typecheck && pnpm build
cd /d/ai-ticulate
git add extension/src/content/ extension/entrypoints/ extension/tests/content/
git commit -m "feat(extension): content script wires engine + UI into the page"
```

Captain's log:
```markdown
### Extension Task 12 complete — Content script integration

- `AppController` owns the panel view state + wraps the orchestrator. Maps each `ParsedResponse` to the next `PanelView`; catches errors into a calm, actionable error view (graceful degradation, never a broken page or leaked internals).
- `mountApp()` renders `<Panel>` + `<Launcher>` and re-renders on controller state changes.
- Content script entrypoint: picks the adapter for the host, builds the bridge, mounts the app. **Milestone: the extension is functionally complete end-to-end** — `pnpm build` produces a loadable unpacked extension.
- Commit: <hash>
```

---

## Task 13: Settings, polish, and pre-release verification

**Files:**
- Create: `extension/src/settings.ts`
- Create: `extension/tests/settings.test.ts`
- Create: `extension/entrypoints/options/index.html`, `extension/entrypoints/options/main.tsx`
- Create: `extension/README.md`

- [ ] **Step 1: Settings module (TDD)**

Write `extension/tests/settings.test.ts` first. Mock `chrome.storage.local` with a simple in-memory object assigned to `globalThis.chrome` in a `beforeEach` (an object with `get` returning a Promise of the store and `set` merging into it). Test: `getSettings()` returns defaults when storage is empty; `saveSettings()` then `getSettings()` round-trips; a partial `saveSettings()` merges with existing values.

Then create `extension/src/settings.ts`:

```ts
export type Settings = {
  panelSide: 'left' | 'right';
  autoOpenOnLoad: boolean;
};

const DEFAULTS: Settings = {
  panelSide: 'right',
  autoOpenOnLoad: false,
};

const KEY = 'ai-ticulate-settings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  const raw = stored[KEY];
  if (raw && typeof raw === 'object') {
    return { ...DEFAULTS, ...(raw as Partial<Settings>) };
  }
  return { ...DEFAULTS };
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const next: Settings = { ...current, ...partial };
  await chrome.storage.local.set({ [KEY]: next });
}
```

Run the settings test to green.

- [ ] **Step 2: Options page**

Create a minimal WXT options entrypoint: `extension/entrypoints/options/index.html` (a basic HTML doc with a `<div id="root">` and a `<script type="module" src="./main.tsx">`) and `extension/entrypoints/options/main.tsx` (a small React page that reads settings via `getSettings()`, shows a panel-side `<select>` and an auto-open `<input type="checkbox">`, and writes via `saveSettings()` on change). Keep it minimal and functional.

- [ ] **Step 3: README**

Create `extension/README.md`:
- What ai-ticulate is (2-3 sentences).
- Build: `pnpm install && pnpm build`.
- Load unpacked: `chrome://extensions` → enable Developer mode → Load unpacked → select `extension/.output/chrome-mv3`.
- The **pre-release manual verification checklist**:
  ```
  ## Pre-release manual verification
  The site adapters were built against representative HTML fixtures, not the
  live sites. Before any release, load the unpacked extension and verify on each:
  - [ ] chatgpt.com — launcher appears; submit a request; meta-prompt is typed + sent; response is read back; questions/5 options parse and render; finalize sends the chosen prompt
  - [ ] claude.ai — same
  - [ ] gemini.google.com — same
  If an adapter is broken by a site change, only that adapter file needs updating.
  ```

- [ ] **Step 4: Full suite + typecheck + build (both browsers)**

```bash
pnpm test && pnpm typecheck && pnpm build && pnpm build:firefox
```
Expected: all tests pass, typecheck clean, both Chrome and Firefox builds produce output under `.output/`.

- [ ] **Step 5: Commit + log**

```bash
cd /d/ai-ticulate
git add extension/
git commit -m "feat(extension): settings, options page, README + pre-release checklist"
```

Captain's log:
```markdown
### Extension Task 13 complete — Settings, polish, pre-release docs

- `settings.ts` — typed wrapper over `chrome.storage.local` (panel side, auto-open). Minimal options page to edit them.
- `README.md` with build/load instructions and the pre-release manual verification checklist (the adapters need one real-site confirmation before release — same shape of deferred verification as Plan 1's live API tests).
- Chrome + Firefox builds both produce loadable output.

### ai-ticulate Extension COMPLETE — the product is built

All 13 tasks done. ai-ticulate is a working Manifest V3 browser extension:
- Injects a launcher + panel into chatgpt.com / claude.ai / gemini.google.com
- Takes a vague request, sends crafted meta-prompts into the user's own AI chat, parses the replies, runs a multi-turn refinement, helps the user send a far better final prompt
- Zero backend, zero API keys, zero accounts, zero cost — pure client-side
- Engine (adapters, bridge, templates, parser, task tracker, orchestrator) fully unit-tested with a deterministic FakeAdapter; UI components tested; integration tested

**Outstanding before release:** manual verification of the three site adapters against the live sites (see extension/README.md checklist). The adapters use resilient heuristics + fixture tests, but real-DOM confirmation is the one thing that can't be done headless.

**Next:** load it unpacked, run the verification checklist, fix any adapter selectors that drifted, then ship.
```

Commit the log.

---

## Plan Self-Review

After all 13 tasks:
1. **All tests pass:** `pnpm test` green; `pnpm typecheck` clean; `pnpm build` + `pnpm build:firefox` both succeed.
2. **Spec coverage** against `docs/superpowers/specs/2026-05-14-ai-ticulate-extension-design.md`:
   - §4.1 site adapters — Tasks 2-5 ✅
   - §4.2 AI bridge — Task 6 ✅
   - §4.3 meta-prompt templates + parser — Tasks 7-8 ✅
   - §4.4 orchestrator + task tracker — Tasks 9-10 ✅
   - §5 UI — Tasks 11-12 ✅
   - §6 tech stack (WXT/TS/React/Vitest) — Task 1 ✅
3. **No backend, no API keys, no accounts, no billing** anywhere in `extension/` — verify.
4. **Captain's log** — every task has an entry with the *why*.
5. **The one honest gap:** site adapters are fixture-tested, not live-tested. Documented in the README checklist and the captain's log — the deliberate, disclosed equivalent of Plan 1's env-gated live tests.
