# ai-ticulate — Extension Design Spec (v2, supersedes the v1 backend design)

**Date:** 2026-05-14
**Status:** Active design — supersedes `2026-05-13-ai-ticulate-design.md`
**Why this supersedes v1:** The v1 design used a hosted backend + company API key + Stripe billing. The project owner course-corrected: ai-ticulate is a **free, zero-infrastructure browser extension** with no backend, no API keys, no accounts, no billing. This document is the corrected design.

---

## 1. Mission

Most people don't know how to talk to AI — they type vague prompts and get mediocre answers. ai-ticulate fixes that by being a smart layer inside the user's existing AI chat. It takes a vague request, runs a short refinement exchange, and helps the user send a far better prompt — **all within their own AI session, on their own subscription.**

The mission, unchanged: **give people more from their prompt — more detail and context for better answers.**

## 2. Architecture: a browser extension and nothing else

There is no server. No API key. No account. No database. No billing. The product is a Manifest V3 browser extension that runs entirely in the user's browser.

**How it works:** The extension behaves like a human operating the user's AI chat. It types crafted "meta-prompt" text into the chat input box on claude.ai / chatgpt.com / gemini.google.com, clicks send, waits for the response, and reads it back off the page. The user interacts with a friendly panel the extension injects; the extension translates between that panel and the raw AI chat.

**All LLM work happens in the user's own AI session.** The extension makes zero API calls. It is pure client-side intelligence: prompt-craft + DOM automation + parsing + state.

## 3. The flow

1. User is on claude.ai (or chatgpt.com / gemini.google.com). The extension has injected a small launcher (a ✨ button near the chat input).
2. User taps it and types their real, possibly-vague request into the extension panel — e.g. *"build me a website."*
3. The extension wraps that in a **meta-prompt** from its template library and types it into the AI's chat box, then sends it. The meta-prompt asks the AI to (a) ask any clarifying questions it needs and (b) produce 5 detailed prompt options — and to format the reply so the extension can parse it.
4. The AI responds in the user's own session. The extension reads the response off the page and **parses** it into structured pieces: clarifying questions and/or the 5 options.
5. The extension shows those cleanly in the panel. The user answers questions by tapping chips / filling blanks, or picks one of the 5 options.
6. The extension sends the next meta-prompt turn based on the user's choice. Repeat until the user has a prompt they're happy with — then the extension sends that final prompt and the AI answers it normally.
7. Throughout, the extension's **task tracker** keeps a running model of what the user is trying to accomplish, so meta-prompts stay coherent across turns.

The conversation lives in the AI. The extension is the orchestrator and the friendly face.

## 4. The four pieces of client-side intelligence

### 4.1 Site adapters
One module per supported AI site. Encapsulates that site's DOM specifics behind a stable interface:
- `getInputBox()` / `setInputValue(text)` / `clickSend()`
- `getLatestResponseText()` / `isResponseComplete()`
- `isReady()` — site loaded and adapter selectors valid

Sites: chatgpt.com, claude.ai, gemini.google.com. Adapter pattern means one site's redesign only breaks that one adapter.

### 4.2 AI bridge
Built on the site adapter. Exposes one core primitive: `sendAndAwaitResponse(text): Promise<string>` — sets the input, sends, watches the DOM until the response is complete, returns the response text. This is the technical heartbeat of the product.

### 4.3 Meta-prompt template library + response parser
- **Templates** — the "prebuilt nuance." Crafted prompt text the extension wraps around user input. Each template tells the AI what to do AND instructs it to format its reply in a parseable shape (e.g. numbered options, tagged question blocks).
- **Parser** — turns the AI's natural-language reply back into structured data: `{ questions: [...], options: [...], done: boolean }`. Resilient to minor format drift.

### 4.4 Orchestrator + task tracker
A state machine driving the multi-turn flow: `idle → refining → presenting-options → finalizing → done`. The task tracker holds the evolving understanding of the user's goal and feeds it into each meta-prompt so context compounds across turns.

## 5. The UI
An injected panel (not the cramped extension popup) — enough room for a comfortable conversation. Friendly, plain language, tuned for the everyday / AI-curious user. Components: launcher button, request input, question/chip view, 5-options view, fill-in-blank view, a small "what we're working on" task strip.

## 6. Tech stack
- **WXT** (wxt.dev) — modern Manifest V3 extension framework. Cross-browser, HMR, TypeScript-native.
- **TypeScript** — strict.
- **React** — for the injected panel UI.
- **Vitest** + happy-dom — unit + DOM tests. Site adapters tested against frozen HTML snapshots.
- Targets: Chrome, Firefox, Edge.

## 7. What carries over from v1 / what doesn't
- **Carries over:** the prompt-design thinking in `backend/prompts/*.md` (what a good clarifying question looks like, how to shape 5 distinct variants) becomes the basis for the extension's meta-prompt templates.
- **Removed:** the `backend/` directory — Hono server, the three HTTP endpoints, `AnthropicLLM`, config, logging. Superseded by the no-backend architecture. Recoverable from git history (commit `5fd2269`) if ever needed.

## 8. Out of scope (for now)
- Voice input — later, possibly a desktop/mobile companion.
- Sites beyond the big three — fast-follow once the core works.
- Any form of telemetry that requires a server — if usage analytics are ever wanted, they must be local-only or explicitly opt-in with a privacy-respecting approach.

## 9. Guiding principles
1. **Zero infrastructure.** No server, no API key, no account, no paid service. If a problem looks like it needs a backend, find the smart client-side way.
2. **The AI does the thinking; the extension does the crafting.** The extension never tries to be the LLM.
3. **Never hijack the user's chat.** The user always sees what's happening and stays in control. The final prompt goes through on the user's action.
4. **Isolate each site as a swappable adapter.** One redesign shouldn't break everything.
5. **Friendly by default; everyday-person language.** No jargon.
6. **It can't go down.** Everything runs in the browser. That's a feature — protect it.
