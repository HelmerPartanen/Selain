import React, { useCallback, useState } from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const DEV_PANEL_KEY = 'settings:devPanelEnabled';
const HARDWARE_ACCEL_KEY = 'settings:hardwareAcceleration';

const storageGet = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const AdvancedSettingsSection: React.FC = () => {
  const [devPanel, setDevPanel] = useState(() => storageGet(DEV_PANEL_KEY, false));
  const [hwAccel, setHwAccel] = useState(() => storageGet(HARDWARE_ACCEL_KEY, true));
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const persist = useCallback((key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  const handleClearBrowsingData = useCallback(async () => {
    setClearing(true);
    try {
      if (window.electronAPI?.clearHistory) await window.electronAPI.clearHistory();
      localStorage.removeItem('topSites');
      setCleared(true);
      setTimeout(() => setCleared(false), 2000);
    } catch { /* ignore */ }
    setClearing(false);
  }, []);

  return (
    <div className="space-y-8">
      <SettingsGroup title="Developer" description="Options for development and debugging.">
        <div className="space-y-2">
          <SettingToggle
            label="Developer panel"
            desc="Show the developer tools panel toggle in the toolbar."
            checked={devPanel}
            onChange={(v) => { setDevPanel(v); persist(DEV_PANEL_KEY, v); }}
          />
          <SettingToggle
            label="Hardware acceleration"
            desc="Use GPU for rendering when available. Restart required."
            checked={hwAccel}
            onChange={(v) => { setHwAccel(v); persist(HARDWARE_ACCEL_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Data" description="Manage your browsing data and storage.">
        <button
          onClick={handleClearBrowsingData}
          disabled={clearing}
          className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left transition-all duration-150 hover:bg-red-500/10 active:scale-[0.99]"
        >
          <div className="text-sm font-medium text-red-500">
            {clearing ? 'Clearing…' : cleared ? 'Cleared ✓' : 'Clear browsing data'}
          </div>
          <div className="text-xs text-red-400/80 mt-0.5">
            Removes history and cached top sites.
          </div>
        </button>
      </SettingsGroup>

      <SettingsGroup title="About">
        <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Browser
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)] mt-0.5">
                Version 0.1.0 — Built with Electron & React
              </div>
            </div>
            <div className="text-xs text-[color:var(--ui-text-subtle)] px-2 py-1 rounded-lg bg-[color:var(--ui-hover)]">
              v0.1.0
            </div>
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
};

/* ── Reusable toggle row ─────── */
const SettingToggle: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, desc, checked, onChange }) => (
  <div className="flex items-center justify-between rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
    <div>
      <div className="text-sm font-medium text-[color:var(--ui-text)]">{label}</div>
      <div className="text-xs text-[color:var(--ui-text-muted)]">{desc}</div>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
  </div>
);
