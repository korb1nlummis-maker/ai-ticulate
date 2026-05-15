# ai-ticulate

A free browser extension that helps everyday people get more out of AI — by crafting better prompts *inside their own AI chat*.

You type a vague request ("build me a website"). ai-ticulate doesn't send that as-is — it runs a short refinement exchange with your AI (asking clarifying questions, then offering 5 detailed prompt options to pick from), all in your existing chat session. You end up sending a far better prompt and getting a far better answer.

**The whole product is a browser extension.** No backend, no API keys, no accounts, no sign-up, no cost. Everything runs client-side in your browser. The extension behaves like a smart assistant sitting next to you: it types crafted "meta-prompts" into your AI's chat box and reads the responses back off the page. All the actual AI work happens in your own AI session, on your own subscription (ChatGPT, Claude, Gemini — whatever you already use).

## Repository layout

| Path | What it is |
|---|---|
| `extension/` | The product — a Manifest V3 browser extension (WXT + React + TypeScript). See [`extension/README.md`](extension/README.md) for build & load instructions. |
| `docs/superpowers/specs/` | Design specs. The active one is `2026-05-14-ai-ticulate-extension-design.md`. |
| `docs/superpowers/plans/` | Implementation plans. The extension was built from `2026-05-14-extension.md`. |
| `CAPTAINS_LOG.md` | Append-only build journal — every meaningful decision and why. |

## Install (for users)

**Just want to use it? Skip the source.** Grab the latest release — a single ~170 KB ZIP with the pre-built extension and a 4-step install guide inside.

➡️ **[Download from Releases](https://github.com/korb1nlummis-maker/ai-ticulate/releases/latest)** — pick `ai-ticulate-chrome-*.zip` for Chrome/Edge/Brave/Arc, or `ai-ticulate-firefox-*.zip` for Firefox.

Full step-by-step install instructions are inside the ZIP as `INSTALL.md`, or you can read them at [`release-assets/INSTALL.md`](release-assets/INSTALL.md) before downloading.

## Build from source (for developers)

```bash
cd extension
pnpm install
pnpm build
```

Then load `extension/.output/chrome-mv3` as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked). Full developer notes and the pre-release checklist are in [`extension/README.md`](extension/README.md).

## Status

**v1 is built** — the full engine (site adapters, AI bridge, meta-prompt templates, response parser, task tracker, orchestrator) plus the React panel UI and content-script integration. 57 automated tests pass; Chrome and Firefox both build.

**One step needs a human:** the three site adapters (chatgpt.com, claude.ai, gemini.google.com) were built and tested against representative HTML fixtures, not the live sites. Before release, the extension must be loaded unpacked and verified against each real site — see the pre-release checklist in `extension/README.md`. If a site has changed its DOM, only that one adapter file (`extension/src/adapters/<site>.ts`) needs updating.

## History

An earlier iteration explored a hosted-backend architecture (a server + the Anthropic API). That was the wrong shape for a free, zero-infrastructure tool and was superseded by the pure-extension design. The backend code is preserved in git history (commit `5fd2269`) if ever needed; the prompt-engineering thinking from it carried forward into the extension's meta-prompt templates. The `CAPTAINS_LOG.md` tells the full story.
