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
