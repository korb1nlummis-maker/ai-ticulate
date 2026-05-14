// Minimal type for the slice of the `chrome` extension global this module
// uses. The MV3 runtime provides `chrome`; tests provide an in-memory mock.
// WXT/@types/chrome are not installed, so we declare just what we need.
declare const chrome: {
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

export type Settings = {
  panelSide: 'left' | 'right';
  autoOpenOnLoad: boolean;
};

const DEFAULTS: Settings = {
  panelSide: 'right',
  autoOpenOnLoad: false,
};

const KEY = 'ai-ticulate-settings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  const raw = stored[KEY];
  if (raw && typeof raw === 'object') {
    return { ...DEFAULTS, ...(raw as Partial<Settings>) };
  }
  return { ...DEFAULTS };
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const next: Settings = { ...current, ...partial };
  await chrome.storage.local.set({ [KEY]: next });
}
