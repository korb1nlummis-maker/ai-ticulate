# Install ai-ticulate

A free browser extension that helps you craft better AI prompts inside your own AI chat (claude.ai, chatgpt.com, gemini.google.com). No accounts, no API keys, no cost.

## One-liner install (Windows + Chrome/Edge/Brave)

Open PowerShell and paste:

```powershell
irm https://raw.githubusercontent.com/korb1nlummis-maker/ai-ticulate/main/scripts/install.ps1 | iex
```

The installer downloads the latest release, unzips it, copies the path to your clipboard, and opens your browser's Extensions page. From there:

1. Turn on **Developer mode** (top right)
2. Click **Load unpacked**
3. Press **Ctrl+L** then **Ctrl+V** in the folder picker to paste the path, then confirm

Re-run the same command anytime to update to a newer release.

You can read the script before running it: <https://github.com/korb1nlummis-maker/ai-ticulate/blob/main/scripts/install.ps1>

## Manual install (any OS)

If you'd rather do it by hand, or you're on Mac / Linux / Firefox:

### 1. Unzip this file

If you haven't already — right-click the ZIP you downloaded and pick "Extract All" (Windows) or just double-click (Mac). You'll end up with a folder.

### 2. Open your browser's extensions page

**Chrome / Edge / Brave / Arc:** type `chrome://extensions` into the address bar and press Enter.

**Firefox:** type `about:debugging#/runtime/this-firefox` into the address bar and press Enter.

### 3. Turn on Developer Mode (Chrome) or pick the file (Firefox)

**Chrome / Edge / Brave / Arc:**
- Toggle "Developer mode" on (top right of the page)
- Click "Load unpacked"
- Pick the folder you unzipped in step 1
- Done — you'll see ai-ticulate appear in your extensions list

**Firefox:**
- Click "Load Temporary Add-on..."
- Pick the `manifest.json` file inside the folder you unzipped
- Done

> **Firefox note:** temporary add-ons stay loaded until you close Firefox. To make it permanent, you'd need to publish through Mozilla's Add-on store (or use Firefox Developer Edition with `xpinstall.signatures.required` disabled).

## Use it

1. Go to **claude.ai**, **chatgpt.com**, or **gemini.google.com**
2. You'll see a small sparkle ✨ button — click it
3. Type whatever you want to ask (even rough or vague)
4. ai-ticulate will help you turn it into a sharper prompt and send it through your own AI account

That's it. Everything happens in your browser — no data leaves your machine except the prompts you send to your own AI (which they'd see anyway).

## Troubleshooting

- **Sparkle button doesn't appear** → refresh the page. If still missing, check that the extension is enabled in `chrome://extensions`.
- **Extension shows an error** → click the "Copy diagnostics" button inside the panel and report the issue at https://github.com/korb1nlummis-maker/ai-ticulate/issues
- **AI site changed its layout** → the extension might need an update; check the repo for a newer release.

## Source code

Full source, including how this works, is at:
**https://github.com/korb1nlummis-maker/ai-ticulate**

Free under the MIT License.
