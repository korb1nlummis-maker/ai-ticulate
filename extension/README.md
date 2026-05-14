# ai-ticulate

ai-ticulate is a free browser extension that helps you get more out of AI by
crafting better prompts inside your own AI chat. It works as a smart
prompt-crafting layer on chatgpt.com, claude.ai, and gemini.google.com — taking
a vague request, asking a few clarifying questions, and helping you send a far
better final prompt. No backend, no API keys, no accounts: all of the AI work
happens in your own existing AI session.

## Build

```
cd extension && pnpm install && pnpm build
```

This produces a loadable unpacked extension under `extension/.output/chrome-mv3`.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select `extension/.output/chrome-mv3`.

For Firefox, run `pnpm build:firefox` and load `extension/.output/firefox-mv3`
via `about:debugging`.

## Pre-release manual verification

The site adapters were built against representative HTML fixtures, not the
live sites. Before any release, load the unpacked extension and verify on each:
- [ ] chatgpt.com — launcher (✨) appears; submit a request; meta-prompt is typed + sent; response is read back; questions/5 options parse and render; finalize sends the chosen prompt
- [ ] claude.ai — same
- [ ] gemini.google.com — same

If an adapter is broken by a site change, only that adapter file (src/adapters/<site>.ts) needs updating.
