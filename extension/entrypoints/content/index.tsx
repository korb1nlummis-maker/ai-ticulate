import { pickAdapter } from '../../src/adapters/registry.js';
import { AIBridge } from '../../src/bridge/ai-bridge.js';
import { mountApp } from '../../src/content/app.js';

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
  ],
  main() {
    const adapter = pickAdapter(location.hostname);
    if (!adapter) {
      console.log('[ai-ticulate] no adapter for this host');
      return;
    }
    const host = document.createElement('div');
    host.id = 'ai-ticulate-root';
    document.body.appendChild(host);
    const bridge = new AIBridge(adapter);
    mountApp(bridge, host);
    console.log(`[ai-ticulate] mounted on ${adapter.name}`);
  },
});
