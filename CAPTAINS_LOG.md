# Captain's Log — ai-ticulate

Append-only project journal. **Newest entries at the top.** Each entry timestamps a meaningful decision or build step, and captures both the **what** and the **why**, so future sessions can reference history and avoid repeating mistakes.

**Convention:**
- Date in ISO format: `YYYY-MM-DD`. Add `HH:MM` when multiple entries land the same day.
- Heading = short title. Body = what + why (the rationale matters; future-me needs it).
- Reversed decisions get a NEW entry. Never edit history.
- At the start of each session, read the latest entries before proposing changes.

---

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
