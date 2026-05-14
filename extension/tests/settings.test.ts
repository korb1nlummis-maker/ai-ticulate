import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings, saveSettings } from '../src/settings.js';

describe('settings', () => {
  beforeEach(() => {
    let store: Record<string, unknown> = {};
    // Minimal chrome.storage.local mock
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (items: Record<string, unknown>) => {
            store = { ...store, ...items };
          },
        },
      },
    };
  });

  it('returns defaults when storage is empty', async () => {
    const s = await getSettings();
    expect(s.panelSide).toBe('right');
    expect(s.autoOpenOnLoad).toBe(false);
  });

  it('round-trips saved settings', async () => {
    await saveSettings({ panelSide: 'left' });
    const s = await getSettings();
    expect(s.panelSide).toBe('left');
    expect(s.autoOpenOnLoad).toBe(false); // unchanged
  });

  it('partial save merges with existing values', async () => {
    await saveSettings({ panelSide: 'left' });
    await saveSettings({ autoOpenOnLoad: true });
    const s = await getSettings();
    expect(s.panelSide).toBe('left');
    expect(s.autoOpenOnLoad).toBe(true);
  });
});
