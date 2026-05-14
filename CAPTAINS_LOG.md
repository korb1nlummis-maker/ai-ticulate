# Captain's Log — ai-ticulate

Append-only project journal. **Newest entries at the top.** Each entry timestamps a meaningful decision or build step, and captures both the **what** and the **why**, so future sessions can reference history and avoid repeating mistakes.

**Convention:**
- Date in ISO format: `YYYY-MM-DD`. Add `HH:MM` when multiple entries land the same day.
- Heading = short title. Body = what + why (the rationale matters; future-me needs it).
- Reversed decisions get a NEW entry. Never edit history.
- At the start of each session, read the latest entries before proposing changes.

---

## 2026-05-14 — ARCHITECTURE PIVOT: pure browser extension

### The pivot — no backend, no API keys, no accounts, free

The project owner course-corrected the architecture, hard and clearly:
- *"i dont want stripe etc this is a free tool to assist people who need help"*
- *"it should have no api points"*
- *"there is a way to build this without api keys. it just needs to be smart"*
- *"build the vision you see working best however that comes... you build this with my idea in mind"*

**The corrected design:** ai-ticulate is a Manifest V3 **browser extension and nothing else.** No backend server, no API keys, no accounts, no billing, no database. Free. The extension behaves like a human inside the user's existing AI chat (claude.ai / chatgpt.com / gemini.google.com): it types crafted "meta-prompt" text into the chat box and reads responses off the page. ALL LLM work happens in the user's own AI session on their own subscription. The extension is pure client-side intelligence: prompt-craft + DOM automation + parsing + state.

**What this means for the v1 backend work (Plan 1):** the `backend/` directory — Hono server, the three HTTP endpoints, `AnthropicLLM` client, config, logging — is **superseded**. It was built before the pivot, on the assumption of a hosted backend + company API key. That assumption is gone. The *conceptual* prompt-design work in `backend/prompts/*.md` carries forward as the basis for the extension's meta-prompt templates; the backend plumbing does not.

**Why the v1 work isn't wasted, exactly:** the subagent-driven build process, the captain's-log discipline, the testing patterns, and the prompt-engineering thinking all transfer. But honestly — a hosted backend was the wrong architecture for this product, and it's better to have learned that at Plan 1 than at Plan 4. The lesson is recorded in memory ([[keep-it-simple-no-infra]]): default to the leanest client-side approach.

**Actions taken:**
- New spec: `docs/superpowers/specs/2026-05-14-ai-ticulate-extension-design.md` (supersedes the 2026-05-13 backend spec, which stays in the repo as history).
- New plan: `docs/superpowers/plans/2026-05-14-extension.md` — 13 tasks, pure extension.
- `backend/` removed from the working tree. Fully recoverable from git history (it was merged to `main` at commit `5fd2269`) if any of it is ever needed.
- Old superseded plan `docs/superpowers/plans/2026-05-13-backend-foundation.md` left in place as history.

### Extension Task 1 complete — WXT scaffold

- `extension/` initialized with WXT (Manifest V3 framework) + React + TypeScript + Vitest.
- Host permissions scoped to chatgpt.com / claude.ai / gemini.google.com only.
- Minimal content script logs a load marker; `pnpm build` produces a loadable unpacked extension.
- Why WXT: it's the current best-maintained MV3 framework — auto-generates the manifest, handles cross-browser quirks, content-script registration, HMR. A build tool, not infrastructure — consistent with the project's zero-infra principle.
- Commit: e6dd9ab

### Extension Task 2 complete — SiteAdapter interface + registry

- `SiteAdapter` interface: the stable contract every site adapter implements (`isReady`, `setInputValue`, `clickSend`, `getLatestResponseText`, `isResponseComplete`).
- `FakeAdapter` — in-memory, test-drivable adapter. `scriptResponse()` lets tests deterministically simulate the AI replying. This is what makes the bridge + orchestrator testable without a real browser.
- `pickAdapter(hostname)` registry. Stub ChatGPT/Claude/Gemini adapters created (real DOM logic lands in Tasks 3-5).
- Commit: efbf037

### Extension Task 3 complete — ChatGPT adapter

- `ChatGPTAdapter` implemented with resilient heuristics: tries stable attributes (`#prompt-textarea`, `data-testid`, `aria-label`, `data-message-author-role`) with fallback chains, never brittle generated class names.
- Shared `loadFixture` test helper installs HTML fixtures into the test document via `DOMParser` + `importNode` (no innerHTML — safe and explicit).
- Tested against a representative frozen HTML fixture.
- **Manual live verification still required:** the fixture is a best-effort representation; the adapter must be confirmed against the real chatgpt.com once before release. Tracked as a pre-release checklist item.
- Commit: 689b158

### Extension Task 4 complete — Claude adapter

- `ClaudeAdapter` implemented with resilient heuristics: `div.ProseMirror[contenteditable]`, `aria-label`, `data-testid="assistant-message"` with fallback chains.
- Claude's input is contenteditable (not a textarea) — `setInputValue` writes `textContent` and dispatches an `input` event.
- Tested against a representative frozen HTML fixture, reusing the `loadFixture` helper.
- **Manual live verification still required** against the real claude.ai before release (pre-release checklist item).
- Commit: a394a2c

---

## 2026-05-14 — Backend Foundation execution wrap

### Backend Task 10 complete — E2E smoke test

- Added `backend/tests/integration/e2e.smoke.test.ts`. Chains all three endpoints in one flow: `/context/summarize` → `/pretalk/next` → `/variants/generate`, passing each step's output into the next, the way the real extension will.
- Env-gated like the other live tests — skipped without `ANTHROPIC_API_KEY`. Asserts structural validity at each step plus a sanity check that the final variants reference something specific from the seeded context (bakery / Instagram / content / engagement).
- Skipped on this run (no API key in environment).

### Backend Plan 1 COMPLETE — Foundation shipped

All 10 tasks of Plan 1 (Backend Foundation) are done. The backend now provides three working LLM-powered endpoints:
- `POST /context/summarize` — raw chat history → structured context summary
- `POST /pretalk/next` — vague prompt + context + Q&A history → next clarifying question + predicted chips
- `POST /variants/generate` — refined prompt + context + Q&A → exactly 5 detailed variants with fill-in blanks

**Stack landed:** Node 24 + TypeScript (ESM, strict, noUncheckedIndexedAccess) + Hono + Vitest + Anthropic SDK + Zod + Pino. pnpm. ~45 commits on `feat/plan-1-backend-foundation`.

**Architecture as built:**
- Thin extension / smart backend — all LLM calls server-side.
- `LLMClient` interface with `AnthropicLLM` (Claude Haiku 4.5) + `StubLLM` (tests). Model configurable via `ANTHROPIC_MODEL` env.
- Three-layer pattern per endpoint: route (Hono + Zod validation) → service (stateless `runXxx(llm, input)`) → LLM client. Shared `QATurn`/`formatQaHistory` in `services/shared.ts`.
- File-based prompt templates with YAML-lite frontmatter in `backend/prompts/`, loaded + cached + `{{var}}`-rendered by `prompts/loader.ts`. CRLF-safe.
- `createApp(llm)` factory — no module-level singleton; tests inject `StubLLM`.
- Centralized `app.onError` (structured Pino logging, generic client envelope, no stack-trace leakage) + JSON `app.notFound`.

**Tests:** 41 passing + 4 skipped. Unit tests use `StubLLM` (fast, deterministic). Route-integration tests cover 200/400/500 paths per endpoint. Live tests + e2e smoke test are env-gated on `ANTHROPIC_API_KEY` — they run in dev/CI-with-secret, skip gracefully otherwise.

**Deferred (intentionally, to later plans):**
- Auth, accounts, rate limiting, billing, BYO API key, adaptation tracking → Plan 2.
- Golden eval set + LLM-as-judge + CI prompt-regression gate → Plan 3.
- Browser extension + site adapters → Plan 4.

**Outstanding manual verification:** The live tests and e2e smoke test have never actually run against the real Anthropic API in this session (no `ANTHROPIC_API_KEY` available). Before relying on the backend, set `ANTHROPIC_API_KEY` in `backend/.env` and run `pnpm test` — all 4 env-gated tests should go green. Then `pnpm dev` + curl the three endpoints to eyeball real output quality.

**Next:** Plan 1 ready for final review + merge to `main`. Then Plan 2 (Backend Production).

### Backend Task 1 follow-up CORRECTION — test typecheck was never actually working

The final Plan 1 review caught that commit `c5e6eb1` ("typecheck tests folder", from the Task 1 follow-up) did NOT actually work. It removed `"tests"` from the tsconfig `exclude` array — but `exclude` only subtracts from `include`, and `include` was scoped to `src/**/*`, so test files were never in the TypeScript program. The earlier captain's log claim that "the whole tree is typechecked" was wrong.

**Actual fix:** added `backend/tsconfig.typecheck.json` that extends the base config, sets `rootDir: "."`, and includes both `src/**/*` and `tests/**/*`. The `typecheck` script now runs `tsc --noEmit -p tsconfig.typecheck.json`. The base `tsconfig.json` stays as the build config (src only).

Typechecking the tests folder for the first time **did surface real type errors** — 27 of them, all the same root cause: `await res.json()` returns `unknown` under modern TypeScript, and the route-integration + e2e tests were accessing `.error` / `.message` / `.question` / `.variants` etc. on those `unknown` values without typing them. Fixed by annotating each `res.json()` result with an explicit response-shape cast (e.g. `(await res.json()) as { error: string }`) in the 5 affected test files: `context.route.test.ts`, `e2e.smoke.test.ts`, `error-handling.test.ts`, `pretalk.route.test.ts`, `variants.route.test.ts`. No tsconfig strictness was loosened; no runtime behavior changed (test count still 41 passing + 4 skipped). Note: the originally-planned `vitest.config.ts` entry was dropped from `include` because no such file exists in the repo.

Lesson for future: a tsconfig change that claims to widen coverage must be verified by actually checking `tsc --listFilesOnly` includes the new files — not assumed. Verified here: `tsc --listFilesOnly -p tsconfig.typecheck.json` now lists all 15 test files.

Commit: `751dcdc`

## 2026-05-13 — Session 1: brainstorm → approved design

### Project conceived
Working name: **ai-ticulate**. Problem framed by the user: *"no one knows how to talk to AI or be detailed enough to get the most out of it."* The product idea: a tool that pre-talks with the user to gather context, then produces 5 detailed variants of the original question (some with fill-in blanks) the user can pick from. User stated the goal explicitly: *"give people more from their prompt — more details and context to get better responses."*

### Foundational decisions (in the order they were locked in)

1. **Default audience = everyday / AI-curious person.** Friendly, plain language, decides for them. Why: trying to serve everyone at launch produces averaged-out decisions that delight no one. Power users handled via adaptation, not separate UI.
2. **Adaptiveness = silent behavioral adaptation.** No onboarding quiz, no settings. App starts at "everyday person" defaults and silently expands what's shown based on observed behavior. Why: an onboarding quiz feels patronizing to power users and beginners often misjudge themselves; a slider is ignored by casuals. Silent works for everyone.
3. **Platform = browser extension v1 + mobile app v2.** Why: an extension rides the user's existing chatgpt.com / claude.ai / gemini.google.com login — solves the "link to my AI account" problem (which is otherwise unsolvable since user ChatGPT/Claude subscriptions can't be accessed by third-party apps; only paid API keys can, which is friction). Mobile arrives in v2 with voice input.
4. **AI connection model = hybrid.** Pre-talk + variant generation run on our backend with a cheap small model (Claude Haiku / GPT-4o-mini class). The *final* answer goes through the user's existing AI session via the extension. Power users can BYO API key. Why: lets us offer a generous free tier without burning money, and zero AI account setup is required for everyday users.
5. **On-page presence = "Sidekick" model.** ✨ button injected next to the host site's Send button. Opt-in per question (no auto-interception). Tap → popup overlay → pre-talk → variants → fills input box → user reviews and sends. Why: respects agency, never feels hijacked. Critically, the ✨ button also handles the "blank box, what do I even ask?" case.
6. **Pre-talk UX = "tap the chips."** Each follow-up question shows predicted answer chips + a "type my own" field. Why: matches the everyday-person audience by giving them scaffolding instead of a blank page. The same design philosophy that the main variants use, applied to the pre-talk itself.
7. **Variants = curated mix of 5 angles + 2-3 fill-in blanks.** Each variant has distinct character; 2-3 of them have `[___]` slots for personalization. Why: this is the unique design vocabulary of the product, per user's original pitch.
8. **Chat-context reading = on by default** with a transparent first-run notice. Why: user explicitly described this ("with context from the ai") in the original pitch. It's the killer feature; making it opt-in would mean most users never get the magic.
9. **Input modes v1 = text + chips only.** Voice arrives with mobile app v2. Why: voice on a desktop browser extension is mostly novelty; chip-tapping is already faster.
10. **MVP scope = Approach 2 (full pitch, 12-16 weeks).** Ship the complete vision: ChatGPT + Claude + Gemini, full feature set, accounts, paid tier, BYO key. Why (user's call): clean launch, one announcement, one positioning. Tradeoff acknowledged: longer time before first user feedback.

### Architecture decided

- **Thin extension, smart backend.** All LLM calls server-side. No API keys in the extension. Provider swaps don't require extension updates.
- **Site-adapter pattern.** One module per host site. A ChatGPT redesign only breaks the ChatGPT adapter; Claude/Gemini keep working. Remote feature flag can disable an adapter in &lt;60s.
- **Stateless pre-talk service.** Client carries Q&A history with each request. Horizontally scalable, no sticky sessions.
- **LLM provider abstraction** with a single `LLMClient` interface. Swapping Haiku ↔ 4o-mini is a config change.
- **Prompt templates as first-class versioned code.** CI regression gate on prompt changes.

### Components defined

- **Extension:** Content script (orchestrator), Site adapter (per site, isolated), Popup overlay (React: `PreTalkChips`, `VariantList`, `FillInVariant`, `Settings`), Service worker, Storage layer.
- **Backend:** Pre-talk (`POST /pretalk/next`), Variant generation (`POST /variants/generate`), Context extraction (`POST /context/summarize`), Auth & accounts, Adaptation tracking (`POST /adapt/event`).
- **Data:** Postgres (users, usage), Redis (rate limits, caches), Stripe (billing), external LLM provider.

### Quality strategy

Three layers, only one is about code:

1. **Code correctness** — unit + component + Playwright E2E + daily health check against live AI sites.
2. **Prompt quality** — golden eval set of ~200 vague prompts; LLM-as-judge compares baseline-answer vs our-variant-answer; ship gate: variant beats baseline ≥75% of the time; CI regression on every prompt template change.
3. **Real-world outcome** — behavioral funnel, variant pick rate (target &gt;70%), opt-in answer rating, and **clarification follow-up rate** as the cleanest proxy for "did we actually capture the user's intent."

### Guiding principles locked in

1. Never block the user from sending their original prompt.
2. Treat prompts like first-class versioned code.
3. Isolate each AI site as a swappable module.
4. Default to silent adaptation. Never label users.
5. Be friendly by default; expose power gradually.
6. Measure the mission, not just the code.

### Artifacts created this session

- **Design spec:** `docs/superpowers/specs/2026-05-13-ai-ticulate-design.md` — the source-of-truth design document.
- **This log:** `CAPTAINS_LOG.md` — maintained per user request; updated as work happens.
- **Brainstorm visuals:** preserved in `.superpowers/brainstorm/` for reference (welcome, platform, pre-talk flow, variants, extension style, decisions recap, architecture, components, dataflow, errors, testing).

### Git initialized + pushed to private GitHub

- Local git repo initialized at project root.
- Local commit identity set to `lummis` / `lummislummis@outlook.com` — scoped to this repo (`.git/config`), not the user's global git config.
- `.gitignore` created with `.superpowers/` included (the brainstorm working dir is local-only by design — visuals and session state shouldn't be committed).
- Initial commit `5d23ff6` covers: the design spec, this log, and the gitignore.
- Branch renamed `master` → `main` (modern default; matches GitHub's convention).
- Private repo created via `gh repo create ai-ticulate --private --source=. --push` under the user's GitHub account `korb1nlummis-maker`.
- Remote URL: `https://github.com/korb1nlummis-maker/ai-ticulate.git`.

**Why this matters:** From now on, every step is preserved in version control. The captain's log becomes the *human-readable* narrative; git history is the *machine-precise* record. Both should agree.

### Spec approved by user

User reviewed and approved the spec with "keep going" — design phase complete.

### Plan-of-plans decided

Scope of the spec is too big for a single implementation plan. Splitting into four sequential / parallel-where-possible plans, each producing **working, testable software on its own**:

1. **Plan 1 — Backend Foundation:** core LLM endpoints (`/pretalk/next`, `/variants/generate`, `/context/summarize`) + LLM provider abstraction + prompt template library. Ships as a backend a developer can curl.
2. **Plan 2 — Backend Production:** auth, rate limiting, billing, BYO API key, adaptation tracking. Ships as a production-ready backend.
3. **Plan 3 — Evaluation & Quality:** golden eval set, LLM-as-judge harness, CI prompt regression gate, telemetry funnel.
4. **Plan 4 — Extension v1:** Manifest V3 extension with 3 site adapters, popup overlay, end-to-end integration with backend.

Order: Plan 1 must ship first (extension depends on the API). 2 and 3 can run in parallel after that. 4 needs 1 + 2.

**Why this split:** A 50-task monolithic plan would be overwhelming and tends to drift. Four 10-15 task plans each have a clear finish line, and each can be reviewed / tested / shipped before the next starts.

### Plan 1 written: Backend Foundation

- File: `docs/superpowers/plans/2026-05-13-backend-foundation.md`
- 10 tasks, ~50 bite-sized steps total. Each task ends with a commit + a captain's log entry.
- Tech stack committed: **Node.js + TypeScript + Hono + Vitest + Anthropic SDK + Zod + Pino + pnpm**. ESM-only.
- LLM: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — fast, cheap, plenty smart for pre-talk + variant generation. Spec allows "Haiku / 4o-mini class."
- Hono picked for portability — runs equally on Node / Bun / Cloudflare Workers / Vercel. Defers the hosting decision.
- Plan self-reviewed against the spec: covers Sections 5 (backend half), 6, 7 (backend components), 9 (error middleware), 10.1 (code correctness). Sections explicitly deferred to Plans 2-4 noted in the plan's own self-review.
- Commit: `caad4da`

### Backend Task 1 complete — Hono skeleton + /health

- Created `backend/` subdirectory. Initialized as a pnpm package (`@ai-ticulate/backend`, private, ESM).
- Picked Hono as the HTTP framework. Why: lightweight, modern, runs equally on Node / Bun / Cloudflare Workers / Vercel — keeps hosting decisions deferred to a later phase.
- Vitest for tests. ESM-only TypeScript config (`tsconfig.json` with `moduleResolution: Bundler`).
- TDD applied: wrote the failing `/health` integration test first, confirmed it failed for the right reason (module not found), then implemented `routes/health.ts` and `server.ts` to make it pass.
- Manual curl verification of the running dev server returned `{"status":"ok"}`.
- Commit: `951e4ac`

### Backend Task 1 follow-up — Typecheck now covers tests; pnpm-workspace.yaml stays

Two follow-ups were planned from the Task 1 code review. Landed one, dropped the other based on empirical evidence:

1. **Landed:** Removed `"tests"` from the `tsconfig.json` exclude array. Why: `pnpm typecheck` previously did NOT typecheck test files, which silently allowed `any`-typed tests through. Now the whole tree is typechecked. Confirmed: `pnpm typecheck` still passes — test files are well-typed. Commit: `c5e6eb1`.

2. **Dropped:** Plan was to delete `backend/pnpm-workspace.yaml` as redundant with `package.json`'s `pnpm.onlyBuiltDependencies: ["esbuild"]`. **Empirically false on pnpm 11.1.1.** Deleting the workspace file caused `pnpm install` to emit `ERR_PNPM_IGNORED_BUILDS` for esbuild — pnpm 11 is NOT honoring the `package.json` block here. Worse, subsequent `pnpm typecheck` / `pnpm test` failed outright because pnpm's pre-script dep-status check re-runs install and exits non-zero. Restored the file and reverted. The two files were not actually redundant: `pnpm-workspace.yaml`'s `allowBuilds:` is the only one doing work; the `package.json` block is inert. Open question for a future cleanup: invert the original plan and remove the `pnpm` block from `package.json` instead. Deferred — not blocking Task 2.

### Backend Task 2 complete — Config loader

- `loadConfig()` validates all env vars via Zod at startup. Missing required vars throw with a clear message — fail fast, not on first request handling.
- `PORT` defaults to 3000, `NODE_ENV` to development; only `ANTHROPIC_API_KEY` is strictly required.
- Test isolation pattern: snapshot `process.env` before each test, restore after — avoids cross-test pollution since `loadConfig` reads directly from `process.env`.
- Commit: `7c28459`

### Backend Task 2 follow-up — Edge-case tests

Code review noted that the original 3 tests didn't lock in three edge-case behaviors that the Zod schema already handles correctly:
- `PORT="abc"` (non-numeric) → throws
- `NODE_ENV="staging"` (invalid enum) → throws
- Multiple invalid vars at once → all surfaced in one aggregated message

Tests added to document the contract. No production code change. All 6 config tests pass.

Commit: `ef731b1`

### Backend Task 3 complete — LLM provider abstraction

- Single `LLMClient` interface. All services depend on this — swapping LLM providers will be a one-line change in the server bootstrap, not a refactor.
- `AnthropicLLM` is the production implementation. Uses Claude Haiku 4.5 (model id `claude-haiku-4-5-20251001`) — fast and cheap, sufficient for pre-talk follow-up generation and variant production per the spec's "Haiku / 4o-mini class" guidance.
- `StubLLM` enables fast deterministic unit tests of services without hitting the real API. Substring-matches keys against the last user message; first matching key wins. Tests inject canned responses by user-message-substring.
- `parseJsonResponse()` helper handles the common case where LLMs wrap JSON output in markdown code fences. Strips fences, parses, validates with Zod.
- Decision: NOT writing unit tests that mock the Anthropic SDK. Reason: mocking SDKs produces tests that verify the mock, not the integration. The real assurance happens in Task 6+ via env-gated tests that call the live API.

Commit: `3e90b17`

### What happens next

- Pick execution approach for Plan 1 (subagent-driven recommended, inline as alternative).
- Each implementation task appends a new entry to this log: what was built, what was decided, what surprised us.
- Commit cadence: small, descriptive commits per logical unit of work. Log entry references the commit hash where useful.

### Backend Task 3 follow-up — Review fixes applied

Two Important issues from the Task 3 code review:

1. **`StubLLM` now uses longest-match-wins.** Iterating `Object.entries` in insertion order ("first matching key wins") was a real footgun: future shared stubs with keys like `{"pretalk": ..., "pretalk variants": ...}` would always hit the shorter key first. Sorting keys by length descending before matching makes the natural "more specific wins" semantics work without callers having to think about it. Test added to pin the behavior.
2. **`ANTHROPIC_MODEL` is now configurable via env.** Hardcoding the model snapshot meant production couldn't re-point at a newer Haiku or temporarily at Sonnet for evaluation without a deploy. Added to `ConfigSchema`, threaded through `Config` type. Wiring from `config.anthropicModel → AnthropicLLM(key, model)` happens in Task 5 when `createApp` is built — keeping LLM concerns out of the config layer.

Also added two missing edge-case tests to `StubLLM`: "throws on no user message" and "matches against the LAST user message, not the first."

Test counts: 6 StubLLM, 7 config, 1 health — 14 total.

Commit: `7aeabba`

### Backend Task 4 complete — Prompt template library

- Three initial templates: `pretalk-next`, `variants-generate`, `context-summarize`. Markdown with YAML-lite frontmatter (`name`, `description`, `model`, `temperature`) + body with `{{var}}` placeholders.
- Loader caches parsed templates in a module-level Map. First read parses + caches; subsequent reads of the same name are O(1).
- Render-time check: if a template uses `{{foo}}` and the caller didn't pass `foo`, throw — fail loudly, not silently with empty strings.
- Reasoning: prompts are first-class code per the design spec. Stored under `backend/prompts/`, versioned in git, diffable, and reviewable. The CI prompt-regression gate (Plan 3) will operate on these files via the loader.

Commit: `74a8b1a`

### Backend Task 4 follow-up — Review fixes applied

Two Important issues from the Task 4 code review:

1. **CRLF-safe frontmatter parsing.** The loader's frontmatter regex hard-coded `\n` line endings. On Windows with `core.autocrlf` enabled (the default), `.md` files arrive with CRLF and the regex fails — loader returns "missing frontmatter" for well-formed files. Normalizes to LF immediately after `readFileSync` now. Added `.gitattributes` to force LF on `backend/prompts/*.md` at the repo level as belt-and-braces.
2. **Placeholder regex widened to allow kebab-case and dotted names.** Previously `\w+` silently ignored `{{user-name}}` or `{{user.profile}}` — `matchAll` returned nothing, `replace` left the literal in the output, and `renderPrompt` failed to flag the missing var. Now `[\w.-]+`.

Added one regression test confirming a prompt file loads correctly on this machine (where Windows CRLF may be in play).

Test counts: 5 loader + 6 StubLLM + 7 config + 1 health = 19.

Commit: `e4aa621`

### Backend Task 5 complete — /pretalk/next endpoint + factory rewire

- `runPretalk(llm, input)` service — stateless. Takes original prompt + context summary + Q&A history, returns next question + chips + done flag. Client always carries the full Q&A history.
- Route `POST /pretalk/next` validates body with Zod (max prompt 10k chars, max history 20 turns), returns 400 with `details` on invalid input.
- Rewrote `server.ts` to a `createApp(llm)` factory pattern. Removed the previous module-level `app` export and the `{} as LLMClient` test-mode escape hatch — tests now always construct their own app via `createApp(stubLLM)`. This was a Task 3 follow-up review concern: the workaround would have hidden real LLM-injection bugs in tests.
- Existing health test migrated to the new factory pattern.
- `ANTHROPIC_MODEL` from config (Task 3 follow-up) now wired through: `new AnthropicLLM(cfg.anthropicApiKey, cfg.anthropicModel)` in the entry-point block.

Test counts: 3 pretalk + 5 loader + 6 StubLLM + 7 config + 1 health = 22 total.

Commit: `3125493`

### Backend Task 5 follow-up — Pattern fixes for Tasks 7/8

Two Important review findings, fixed before tasks 7 and 8 copy the pattern:

1. **Extracted `QATurn` + `formatQaHistory` to `backend/src/services/shared.ts`.** Both will be used by `variants` (Task 7) and `context` (Task 8) services. Keeping them file-private in `pretalk.ts` would have forced copy-paste or re-invention — a silent class of prompt-format-drift bugs.
2. **Added minimal `app.onError` handler in `createApp`.** Now any unhandled throw from a service returns a JSON envelope `{error: 'internal_error', message: 'Something went wrong.'}` with status 500 instead of Hono's default bare text response. Task 9 will replace the `console.error` with structured Pino logging — this is just the contract placeholder so 3 endpoints inherit the same response shape.

Also added route-level integration tests for `/pretalk/next` (200 happy path, 400 invalid body, 500 service-throws-returns-JSON). The pattern will be replicated for `/variants/generate` and `/context/summarize`.

Test counts: 25 (was 22; +3 route integration tests).

Commit: `21fb96f`

### Backend Task 6 complete — Live LLM integration test (env-gated)

- Added `backend/tests/integration/pretalk.live.test.ts`. The test instantiates a real `AnthropicLLM` (uses the live API) and runs the full `runPretalk` pipeline against a vague prompt, asserting structural validity of the response.
- **Env-gated via `describeLive = liveKey ? describe : describe.skip`.** When `ANTHROPIC_API_KEY` is set, the test runs. When not, it's gracefully skipped — no failures.
- Current environment: no key set, so the test was skipped on this run. **Manual curl verification deferred** — to validate end-to-end against the real API, set `ANTHROPIC_API_KEY` in `backend/.env` (get a key from console.anthropic.com), run `pnpm test` to confirm the live test passes, and then `pnpm dev` + `curl POST /pretalk/next` to see real generated questions/chips.
- Test count: 25 passing + 1 skipped.

Commit: `a1b4661`

### Backend Task 7 complete — /variants/generate endpoint

- Service `generateVariants(llm, input)` follows the Task 5 pattern exactly: stateless, takes refined prompt + context + Q&A history, loads `variants-generate.md`, calls LLM, Zod-validates response, returns 5-variant array.
- **Strict schema: exactly 5 variants required.** Zod `.length(5)` enforces this — if the LLM returns 4 or 6, the service throws. Better to fail loudly than ship a broken UI.
- Route at `POST /variants/generate` mirrors `/pretalk/next` (10k prompt cap, 20k summary, 20 history turns, 5k per q/a). Added per-item q/a length cap as a defensive improvement.
- Three test layers: unit (stub LLM, 3 tests), route integration (200/400/500 paths, 3 tests), live (env-gated, skipped without API key).
- Reused `QATurn` + `formatQaHistory` from `services/shared.ts` — no duplication of prompt formatting helpers between services.

Test counts: 31 passing + 2 live tests skipped (pretalk + variants).

Commit: `3a9293e`

### Backend Task 8 complete — /context/summarize endpoint

- Service `summarizeContext(llm, input)` follows the established 3-layer pattern, with one shape difference: input is a single raw chat-history string, output is a structured summary object (`topic`, `inferredUserRole`, `priorDecisions`, `activeGoal`).
- Internal cap: service trims chat history to last 30,000 chars before sending to LLM (prompt cost / context-window protection). Route-level cap: 100,000 chars (anything longer rejected with 400).
- Nullable fields supported: when the LLM can't infer topic/role/goal (e.g., chat is empty or off-topic), it returns nulls — Zod schema accepts these explicitly so we don't conflate "no info" with "info missing."
- Same three test layers as pretalk and variants: unit (StubLLM, 3 tests), route integration (4 tests including 100k-char boundary), live (env-gated).
- The "all three core endpoints" milestone is reached: `/pretalk/next`, `/variants/generate`, `/context/summarize` all working. Tasks 9 (structured logging) and 10 (e2e smoke test) remain.

Test counts: 38 passing + 3 skipped (live tests env-gated).

Commit: `991416c`

### Backend Task 9 complete — Pino logger + centralized error middleware

- `backend/src/logger.ts` exports a configured Pino instance. Dev mode uses `pino-pretty` (colorized, readable). Prod mode emits structured JSON for log aggregators.
- `app.onError` now logs via `logger.error(...)` with `{err, stack, path, method}` structured fields instead of `console.error`. Internal exception details stay in logs only — client response is always the generic `{error: 'internal_error', message: 'Something went wrong.'}` 500 envelope. **This is where we draw the line on never leaking stack traces to users.**
- Added `app.notFound` returning clean `{error: 'not_found'}` JSON 404. Previously unknown routes got Hono's default text response.
- Entry-point startup also uses `logger.info({ port }, 'server listening')` for consistency.
- 3 new tests in `error-handling.test.ts` confirm: 400 on invalid body, 500 generic envelope without leaking underlying error text, 404 JSON on unknown routes.

Test counts: 41 passing + 3 skipped (live).

Commit: `70ac813`
