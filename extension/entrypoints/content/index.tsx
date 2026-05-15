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
  // Bundle the panel's CSS with this UI so it can be attached to a shadow
  // root instead of leaking into the host page's <head>. This is the partner
  // setting to createShadowRootUi below.
  cssInjectionMode: 'ui',
  async main(ctx) {
    const adapter = pickAdapter(location.hostname);
    if (!adapter) {
      return;
    }
    const settings = await getSettings().catch(() => undefined);

    const ui = await createShadowRootUi(ctx, {
      name: 'ai-ticulate-ui',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        const bridge = new AIBridge(adapter);
        return mountApp(bridge, container, settings);
      },
      onRemove: (controller) => {
        // mountApp's controller exposes no explicit teardown today; the
        // shadow host being removed from the DOM disconnects React.
        void controller;
      },
    });
    ui.mount();
  },
});
