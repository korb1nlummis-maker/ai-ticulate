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

### What happens next

- User reviews the spec.
- Spec gets approved (or revised based on feedback).
- Move to implementation planning via the writing-plans skill.
- Each implementation step appends a new entry to this log: what was built, what was decided, what surprised us.
