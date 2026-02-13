import React, { useCallback, useEffect, useState } from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const STARTUP_PAGE_KEY = 'settings:startupPage';
const RESTORE_TABS_KEY = 'settings:restoreTabs';
const SMOOTH_SCROLLING_KEY = 'settings:smoothScrolling';
const OPEN_LINKS_IN_NEW_TAB_KEY = 'settings:openLinksInNewTab';

const storageGet = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const GeneralSettingsSection: React.FC = () => {
  const [startupPage, setStartupPage] = useState<'newTab' | 'lastSession'>(() =>
    (localStorage.getItem(STARTUP_PAGE_KEY) as 'newTab' | 'lastSession') || 'newTab'
  );
  const [restoreTabs, setRestoreTabs] = useState(() => storageGet(RESTORE_TABS_KEY, false));
  const [smoothScrolling, setSmoothScrolling] = useState(() => storageGet(SMOOTH_SCROLLING_KEY, true));
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(() => storageGet(OPEN_LINKS_IN_NEW_TAB_KEY, true));

  const persist = useCallback((key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  return (
    <div className="space-y-8">
      <SettingsGroup title="Startup" description="Choose what happens when the browser opens.">
        <div className="space-y-2">
          {([
            { id: 'newTab' as const, label: 'Open new tab page', desc: 'Start with a fresh new tab.' },
            { id: 'lastSession' as const, label: 'Restore last session', desc: 'Re-open the tabs from last time.' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => { setStartupPage(opt.id); persist(STARTUP_PAGE_KEY, opt.id); }}
              className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-150
                ${startupPage === opt.id
                  ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                  : 'hover:bg-[color:var(--ui-hover)]'
                }`}
            >
              <div className={`text-sm font-medium ${startupPage === opt.id ? 'text-[color:var(--ui-accent-contrast)]' : 'text-[color:var(--ui-text)]'}`}>
                {opt.label}
              </div>
              <div className={`text-xs mt-0.5 ${startupPage === opt.id ? 'text-[color:var(--ui-accent-contrast)]/80' : 'text-[color:var(--ui-text-muted)]'}`}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Behavior" description="Browsing behavior preferences.">
        <div className="space-y-2">
          <SettingToggle
            label="Smooth scrolling"
            desc="Animate scroll transitions for a smoother feel."
            checked={smoothScrolling}
            onChange={(v) => { setSmoothScrolling(v); persist(SMOOTH_SCROLLING_KEY, v); }}
          />
          <SettingToggle
            label="Open links in new tab"
            desc="External links will open in a new tab by default."
            checked={openLinksInNewTab}
            onChange={(v) => { setOpenLinksInNewTab(v); persist(OPEN_LINKS_IN_NEW_TAB_KEY, v); }}
          />
          <SettingToggle
            label="Restore tabs on startup"
            desc="Remember open tabs when the browser is closed."
            checked={restoreTabs}
            onChange={(v) => { setRestoreTabs(v); persist(RESTORE_TABS_KEY, v); }}
          />
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
