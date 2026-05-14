import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings, saveSettings, type Settings } from '../../src/settings.js';

function OptionsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <p>Loading…</p>;
  }

  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    void saveSettings(partial);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 480 }}>
      <h1>ai-ticulate settings</h1>

      <p>
        <label>
          Panel side:{' '}
          <select
            value={settings.panelSide}
            onChange={(e) =>
              update({ panelSide: e.target.value as Settings['panelSide'] })
            }
          >
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </label>
      </p>

      <p>
        <label>
          <input
            type="checkbox"
            checked={settings.autoOpenOnLoad}
            onChange={(e) => update({ autoOpenOnLoad: e.target.checked })}
          />{' '}
          Open the panel automatically when a supported AI chat loads
        </label>
      </p>
    </main>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<OptionsPage />);
}
