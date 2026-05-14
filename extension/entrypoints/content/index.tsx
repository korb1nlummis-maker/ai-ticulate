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
