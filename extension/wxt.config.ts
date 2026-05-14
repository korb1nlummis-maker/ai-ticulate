import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  // Generates 16/32/48/128 manifest icons from assets/icon.png at build time.
  // Regenerate the PNG source from the SVG with: node scripts/generate-icon.mjs
  autoIcons: {
    baseIconPath: 'assets/icon.png',
    sizes: [128, 48, 32, 16],
  },
  manifest: {
    name: 'ai-ticulate',
    description:
      'Get more out of your AI — a smart prompt-crafting layer inside your AI chat.',
    permissions: ['storage'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
    ],
  },
});
