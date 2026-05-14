import { pickAdapter } from '../../src/adapters/registry.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { mountApp } from '../../src/content/app.js';
import { getSettings } from '../../src/settings.js';

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  async main() {
    const adapter = pickAdapter(location.hostname);
    if (!adapter) {
      return;
    }
    // getSettings() can fail in odd environments; fall back to defaults.
    const settings = await getSettings().catch(() => undefined);
    const host = document.createElement('div');
    host.id = 'ai-ticulate-root';
    document.body.appendChild(host);
    const bridge = new AIBridge(adapter);
    mountApp(bridge, host, settings);
  },
});
