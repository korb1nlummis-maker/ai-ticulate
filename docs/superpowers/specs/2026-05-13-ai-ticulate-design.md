# ai-ticulate — Product Design Spec

**Date:** 2026-05-13
**Status:** Approved design — ready for implementation planning
**Author:** Design captured in collaboration with project owner

---

## 1. Mission

Most people don't know how to talk to AI. They type vague questions, get mediocre answers, and conclude that AI "isn't that smart." The gap is not the AI — it's the prompt. Rich context lives in the user's head that the AI never sees.

**ai-ticulate** is a browser extension (v1) and mobile app (v2) that closes that gap. It intercepts the moment between "user types something vague" and "AI responds." A fast tap-the-chips pre-talk gathers the missing context, then the app presents 5 detailed variants of the original prompt — some with fill-in blanks for personalization. The user picks one, the variant fills the AI site's input box, the user reviews and sends.

The mission, stated plainly: **give people more from their prompt by giving them more details and context, so they get better responses from any AI.**

---

## 2. Target user

The **default experience** is tuned for the **everyday / AI-curious person** — someone who has tried ChatGPT once or twice, got mediocre answers, and either gave up or settled for "good enough." The app uses plain language, decides things for the user wherever possible, and never asks them to be an expert at the thing they're trying to learn from.

Power users are accommodated through **silent behavioral adaptation**:

- No onboarding quiz, no settings to dial in.
- The app observes behavior — prompt sophistication, chip-tap-vs-typed responses, blank-fill-in rates, variant complexity chosen.
- It silently expands what's shown (more fill-in slots, less hand-holding copy, an "advanced" panel) as the user demonstrates comfort.
- Never lowers the ceiling. Never labels the user. The app "gets smarter alongside" them.

Optional subtle feedback ("show me more / less detail") is available for users who want to nudge the system manually.

---

## 3. Platform & MVP scope

**v1 (Approach 2 — full pitch, 12-16 weeks):**
- Browser extension (Manifest V3) targeting Chrome, Firefox, Edge.
- Site support: **chatgpt.com**, **claude.ai**, **gemini.google.com**.
- Full feature set: Sidekick UI, tap-the-chips pre-talk, curated 5 variants with fill-in blanks, chat-context reading (default on), silent adaptation tracking, free tier + paid tier + BYO API key.

**v2:**
- Mobile app (React Native), iOS + Android.
- Voice input.
- Shares the same backend.

**Out of scope for v1:**
- Voice input on the extension.
- Support for additional AI sites (Perplexity, Copilot, Grok, etc.) — fast-follow after launch.
- Team / enterprise features.

---

## 4. The user experience

### 4.1 Trigger

The user opens chatgpt.com, claude.ai, or gemini.google.com. A small **✨ button** appears next to the host site's Send button. The trigger is **opt-in per question** — the extension never auto-intercepts a Send.

The user can tap ✨ at any time:
- After typing a vague prompt (most common case).
- From a blank input — for users who don't yet know what to ask. ai-ticulate walks them through forming a question from scratch.

### 4.2 Pre-talk (tap-the-chips)

A popup overlay opens. The pre-talk asks 3-5 short follow-up questions, one at a time. Each question shows:

- A short prompt-the-user question ("What kind of email?", "To whom?", "What tone?")
- 3-5 predicted answer **chips** the user can tap.
- A **"type my own"** field for nuance.

A user can complete the pre-talk in ~10 seconds by tapping chips; users who want to be specific can fill in custom answers.

When the backend determines enough context has been gathered, the pre-talk ends and variants appear.

### 4.3 The 5 variants

Five detailed versions of the original prompt, displayed as a card list. They follow the **curated mix** pattern:

- Each variant has a **distinct character / angle** (e.g., "explain with analogies," "give 5 specific things," "compare to alternatives," "tell a story," "deep briefing").
- **2-3 of the variants contain fill-in blanks** (`[___]`) for additional personalization. Tapping a variant with blanks expands inline fields the user fills in.

The user selects one variant. If it has blanks, they fill them in.

### 4.4 Handoff

The chosen, filled-in variant is inserted into the host site's input box. The user sees the refined prompt **and can edit it before sending**. The user hits Send themselves — ai-ticulate never auto-sends. This pause is where the user sees the upgrade ("oh wow, this is way better than what I would have typed") and decides they trust us.

After Send, a non-blocking telemetry event captures behavioral signals (chip-tap vs typed, blanks filled, variant complexity selected) for the adaptation system.

---

## 5. AI connection model (hybrid)

| Layer | Where it runs | Who pays |
|---|---|---|
| Pre-talk follow-up questions | Our backend → small LLM (Haiku / 4o-mini class) | Us (free tier) or user (BYO key / paid) |
| Variant generation | Our backend → same small LLM | Us (free tier) or user (BYO key / paid) |
| Context summarization of chat history | Our backend → same small LLM | Us (free tier) or user |
| **Final answer to the refined prompt** | **User's existing ChatGPT / Claude / Gemini session** | **User (already paid for their subscription)** |

This model is the key reason the product works for an everyday user with zero AI account setup. The user is already logged into chatgpt.com — the extension rides that session for the expensive final answer. Our backend only handles the cheap, small "thinking about the question" work.

**Tiers (preliminary numbers, refined in implementation):**
- **Anonymous free:** 20 pre-talks/day per browser install.
- **Signed-in free:** 50 pre-talks/day per account.
- **Paid:** Unlimited pre-talks via our backend.
- **BYO API key:** Optional. Power users paste their own OpenAI / Anthropic / Google key to bypass our backend limits entirely.

---

## 6. Architecture

### 6.1 Zones

```
┌────────────────────────────────────────────────────────────┐
│  User's browser                                            │
│   • Host pages: chatgpt.com / claude.ai / gemini.google.com│
│   • ai-ticulate extension (MV3):                           │
│       - Content scripts (one per site)                     │
│       - Site adapters (per site)                           │
│       - Popup overlay (React)                              │
│       - Service worker (background)                        │
│       - Storage layer (chrome.storage)                     │
└────────────────────────┬───────────────────────────────────┘
                         │ HTTPS / JSON
                         ▼
┌────────────────────────────────────────────────────────────┐
│  ai-ticulate backend                                       │
│   API services:                                            │
│    • Pre-talk service           ──┐                        │
│    • Variant generation         ──┼─→ LLM provider         │
│    • Context extraction         ──┘  (Haiku / 4o-mini)     │
│    • Auth & accounts                                       │
│    • Adaptation tracking                                   │
│   Data:                                                    │
│    • Postgres (users, usage, adaptation profiles)          │
│    • Redis (rate limits, short-lived caches)               │
│   External:                                                │
│    • Stripe (paid tier billing)                            │
└────────────────────────────────────────────────────────────┘

Mobile app (v2) → connects to the same backend.
                  Different from extension: no host page,
                  so the final answer also runs through
                  our backend (or BYO key).
```

### 6.2 Architectural principles

1. **Thin extension, smart backend.** All LLM calls happen server-side. No API keys in the extension. Swapping LLM providers does not require an extension update.
2. **Site adapters as isolated modules.** Each AI site has its own adapter. A ChatGPT redesign only breaks the ChatGPT adapter; Claude and Gemini keep working.
3. **Remote feature flags on adapters.** A misbehaving adapter can be disabled server-side without an extension update.
4. **Stateless pre-talk service.** The client carries the Q&A history with each request. Server scales horizontally without sticky sessions.
5. **Prompt templates as first-class code.** Versioned, reviewed, gated on quality regression. Prompts are the highest-leverage code in the system.

---

## 7. Components

### 7.1 Extension

| Component | Purpose | Interface highlights |
|---|---|---|
| **Site adapter** (one per site) | Knows ONE host site's DOM. | `findPromptInput()`, `findSendButton()`, `getChatHistory()`, `injectButton(node)`, `fillInput(text)`, `isReady(): boolean` |
| **Content script** | Orchestrator. Picks adapter, injects ✨, opens popup, fills input on completion. | Per-host content script; no site-specific code lives here. |
| **Popup overlay (React)** | Visible UI. | Subcomponents: `PreTalkChips`, `VariantList`, `FillInVariant`, `Settings`. |
| **Service worker** | Background. Auth tokens, backend calls, short-lived cache. | Holds session token, exposes `callApi()` to popup. |
| **Storage layer** | Persistence. | Thin wrapper over `chrome.storage` — auth tokens, prefs, anon install ID. |

### 7.2 Backend services

| Service | Endpoint | Purpose |
|---|---|---|
| **Pre-talk** | `POST /pretalk/next` | Input: current Q&A history + context summary. Output: next question + predicted chips + `done` flag. Stateless. |
| **Variant generation** | `POST /variants/generate` | Input: full Q&A + context. Output: 5 variants, some with fill-in slots. |
| **Context extraction** | `POST /context/summarize` | Input: chat history text. Output: structured summary (topic, inferred role, prior decisions). Cached by content hash. |
| **Auth & accounts** | Standard auth endpoints | Email/password + Google OAuth. Free/paid tier state. BYO API key (encrypted at rest). Stripe webhooks. |
| **Adaptation tracking** | `POST /adapt/event` | Input: behavior signals. Updates user's adaptation profile. Non-blocking. |

### 7.3 Cross-cutting

- **LLM provider abstraction.** Single `LLMClient` interface used by every service. Swapping Haiku ↔ 4o-mini is a configuration change.
- **Prompt template library.** Versioned files (one per task). CI gates merges on quality regression.
- **Rate limiting.** Redis-backed at the auth layer. Free tier limits applied here.

---

## 8. Data flow — one full interaction

A user lands on chatgpt.com, types "help me write an email," and taps ✨.

| Phase | Duration | What happens | Components |
|---|---|---|---|
| **1. Setup** | instant, on page load | Content script loads → picks ChatGPT adapter → injects ✨ button next to Send. | Content script, adapter |
| **2. Trigger** | instant | User types (or doesn't) and taps ✨. Popup overlay opens. | Content script, popup |
| **3. Context gathering** | ~1-2s | Adapter scrapes visible chat history. `POST /context/summarize` returns structured summary. Skipped if no history. | Adapter, service worker, context service, LLM |
| **4. Pre-talk loop** | ~10-30s (3-5 turns) | Each turn: `POST /pretalk/next` returns next question + chips. User taps or types. Repeat until `done: true`. | Popup, service worker, pre-talk service, LLM |
| **5. Variant generation** | ~2-3s | `POST /variants/generate` returns 5 variants with optional fill-in slots. | Popup, variant service, LLM |
| **6. User picks + fills** | ~5-15s | User picks a variant. If it has blanks, expanded inline fields appear. User fills them. | Popup |
| **7. Handoff** | instant | Final text → content script → site adapter `fillInput()`. Popup closes. User reviews, optionally edits, hits Send. Non-blocking `POST /adapt/event`. | Popup, adapter, adaptation service |

**Total user-perceived latency:** ~20-50 seconds end-to-end. The bulk is user-thinking time (tapping chips, reading variants). Each individual network wait (context summary, each pre-talk turn, variant generation) is targeted at &lt;3 seconds; cumulative network time across the full flow is ~5-15 seconds, broken up by user interaction.

---

## 9. Error handling

**Guiding principle:** *Never block the user from sending their original prompt.* Every failure mode degrades gracefully back to "your normal chat with the AI still works."

### 9.1 Host-site failures

- **Adapter broken by site redesign.** Adapter health check on load (input + send button + history selectors). On failure, swallow injection; show a one-time toast: *"ai-ticulate is updating for ChatGPT's new design. We'll be back soon."* Telemetry pings home.
- **Adapter feature-flagged off.** Remote config can disable an adapter in &lt; 60 seconds without an extension update.
- **Chat history unreadable / virtualized.** If extraction times out (&gt;1s), skip Phase 3 and proceed without context.

### 9.2 Backend / LLM failures

- **Pre-talk LLM timeout (&gt;10s).** Retry once with a shorter prompt. Still failing → skip remaining turns and jump to variants with whatever context we have.
- **Variant generation timeout.** Show *"Hmm, having trouble — try again?"* with a single retry. Second failure → offer "send original prompt as-is."
- **Backend down entirely.** Service worker detects via health check; ✨ button greys out with tooltip *"ai-ticulate is offline."* Normal AI chat unaffected.
- **LLM returns malformed JSON.** Strict schema validator on every response. Parse failure → retry with stricter prompt. Repeat failure → log + generic error.

### 9.3 Tier / billing issues

- **Free tier exhausted.** Popup shows *"You've used your daily pre-talks. Upgrade, add your own API key, or come back tomorrow."* User can still send the original prompt — we never block the actual chat.
- **BYO key invalid.** Detect on first call → notice in popup with settings link. Falls back to free tier if quota remains.

### 9.4 User behavior

- **Popup dismissed mid-pre-talk.** State persisted in service worker for 5 min. Re-tap on same input → resume; different input → fresh start.
- **User pastes huge prompt (10k+ chars).** Detect length → offer "this looks detailed already, want to skip pre-talk and just get variants?"
- **Sensitive content in chat history.** Context extraction prompt instructs LLM never to echo specific values. Settings toggle to disable chat-history reading entirely.

---

## 10. Testing & quality

Three layers. Only the first is about code.

### 10.1 Code correctness

- Unit tests on each backend service (LLM stubbed via canned-response client).
- Unit tests on each site adapter against frozen HTML snapshots.
- Component tests on the popup overlay.
- End-to-end Playwright tests driving a real Chrome with the extension loaded, against each AI site.
- **Daily health-check CI job** pinging adapter selectors against the live AI sites. Alerts before users notice breakage.

### 10.2 Prompt quality

The most important testing layer. The product's quality is 90% determined by prompt craft.

- **Golden eval set:** ~200 curated vague-prompt examples. Each has a baseline prompt, a human-written ideal detailed prompt, and a target answer-quality rubric.
- **Automated A/B vs baseline:** For each eval prompt, run the full pre-talk + variant pipeline. Send both the baseline and our chosen variant through GPT-4o. An LLM-as-judge scores both on specificity, usefulness, and goal-alignment. **Ship gate: our variant must beat baseline ≥75% of the time on the eval set.**
- **CI prompt regression:** Any change to a prompt template auto-runs the eval set. &gt;2% quality drop blocks the merge. Prompts versioned, reviewed, gated like code.

### 10.3 Real-world outcome

- **Behavioral funnel:** install → first ✨ tap → first variant chosen → first send-with-variant → return-use within 7 days. Each drop-off reveals a UX problem.
- **Variant pick rate:** of users who reach the variants screen, what % pick one vs cancel? Target &gt;70% in first 90 days.
- **Opt-in answer rating:** occasional in-popup *"Was that answer better? 👍 / 👎"* after a variant is sent.
- **Clarification follow-up rate (proxy for mission):** Detect when the user's next message in the chat is a clarification ("actually, I meant…", "can you focus on…"). High rate → variants don't capture intent. Low rate → mission achieved. This metric also feeds back into adaptation: chronic-clarifiers get more hand-holding; never-clarifiers get the ceiling expanded.

**The full mission is measurable.** If Layer 2 doesn't show our variants beating baseline 75%+ and Layer 3 doesn't show clarification rates dropping, the product is not working — regardless of how clean the code is.

---

## 11. Privacy & security

- **Chat-context reading is default ON** with a transparent first-run notice: *"ai-ticulate reads this page's chat to make better questions. [Learn more] [Disable]."*
- Context summaries are not persisted server-side beyond the single request — only a hash for short-lived caching.
- BYO API keys encrypted at rest with per-user-derived keys.
- Manifest V3 compliance: no remote code, service worker only, declarative net request rules where possible.
- The extension never reads pages other than the three supported AI sites (host permissions limited).

---

## 12. Open questions for the implementation phase

These are deferred to the implementation plan, not architectural blockers:

- Exact LLM provider for pre-talk (Haiku vs 4o-mini — bench in implementation).
- Backend hosting target (Fly.io / Railway / Vercel / Cloudflare Workers).
- Free tier daily limit exact number (preliminary: 20 pre-talks/day per anonymous install, 50 per signed-in account).
- Authentication flow (passwordless magic links vs email+password vs Google-only).
- Paid tier pricing (preliminary: $5-10/month).
- Specific selectors for each site adapter (locked in by inspecting current production sites at implementation time).
- Exact rubric language for the LLM-as-judge in Layer 2 testing.

---

## 13. Guiding principles (for every implementation decision)

1. **Never block the user from sending their original prompt.** ai-ticulate is an assistant, never a gatekeeper.
2. **Treat prompts like first-class versioned code.** Diff, review, A/B test, regression gate.
3. **Isolate each AI site as a swappable module.** One redesign should not take down all support.
4. **Default to silent adaptation. Never label users.** The app gets smarter alongside the user.
5. **Be friendly by default, expose power gradually.** Everyday user is the center of gravity; advanced features arrive when earned.
6. **Measure the mission, not just the code.** Quality of variants and answer-improvement is the real test.
