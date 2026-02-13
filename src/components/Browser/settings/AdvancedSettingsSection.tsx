import React, { useCallback, useState } from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const DEV_PANEL_KEY = 'settings:devPanelEnabled';
const HARDWARE_ACCEL_KEY = 'settings:hardwareAcceleration';
const DNS_PREFETCH_KEY = 'settings:dnsPrefetch';
const LAZY_LOADING_KEY = 'settings:lazyLoading';
const PRELOAD_PAGES_KEY = 'settings:preloadPages';
const VERBOSE_LOGGING_KEY = 'settings:verboseLogging';
const EXPERIMENTAL_FEATURES_KEY = 'settings:experimentalFeatures';
const CUSTOM_CSS_KEY = 'settings:customCSS';
const CUSTOM_USERAGENT_KEY = 'settings:customUserAgent';
const REDUCE_MOTION_KEY = 'settings:reduceMotion';
const WEBGL_KEY = 'settings:webgl';
const WEBRTC_POLICY_KEY = 'settings:webrtcPolicy';
const PROCESS_MODEL_KEY = 'settings:processModel';

const storageGet = (key: string, fallback: any) => {
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
  const [dnsPrefetch, setDnsPrefetch] = useState(() => storageGet(DNS_PREFETCH_KEY, true));
  const [lazyLoading, setLazyLoading] = useState(() => storageGet(LAZY_LOADING_KEY, true));
  const [preloadPages, setPreloadPages] = useState(() => storageGet(PRELOAD_PAGES_KEY, false));
  const [verboseLogging, setVerboseLogging] = useState(() => storageGet(VERBOSE_LOGGING_KEY, false));
  const [experimentalFeatures, setExperimentalFeatures] = useState(() => storageGet(EXPERIMENTAL_FEATURES_KEY, false));
  const [customCSS, setCustomCSS] = useState(() => storageGet(CUSTOM_CSS_KEY, ''));
  const [customUserAgent, setCustomUserAgent] = useState(() => storageGet(CUSTOM_USERAGENT_KEY, ''));
  const [reduceMotion, setReduceMotion] = useState(() => storageGet(REDUCE_MOTION_KEY, false));
  const [webgl, setWebgl] = useState(() => storageGet(WEBGL_KEY, true));
  const [webrtcPolicy, setWebrtcPolicy] = useState<'default' | 'disable_non_proxied' | 'disable'>(() =>
    storageGet(WEBRTC_POLICY_KEY, 'default')
  );
  const [processModel, setProcessModel] = useState<'site' | 'process'>(() =>
    storageGet(PROCESS_MODEL_KEY, 'site')
  );
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [cssSaved, setCssSaved] = useState(false);
  const [uaSaved, setUaSaved] = useState(false);

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
      {/* Performance */}
      <SettingsGroup title="Performance" description="Tune how the browser renders and loads pages.">
        <div className="space-y-2">
          <SettingToggle
            label="Hardware acceleration"
            desc="Use GPU for rendering when available. Restart required."
            checked={hwAccel}
            onChange={(v) => { setHwAccel(v); persist(HARDWARE_ACCEL_KEY, v); }}
          />
          <SettingToggle
            label="DNS prefetching"
            desc="Pre-resolve domain names for faster page loads."
            checked={dnsPrefetch}
            onChange={(v) => { setDnsPrefetch(v); persist(DNS_PREFETCH_KEY, v); }}
          />
          <SettingToggle
            label="Lazy-load images"
            desc="Defer loading off-screen images until scrolled into view."
            checked={lazyLoading}
            onChange={(v) => { setLazyLoading(v); persist(LAZY_LOADING_KEY, v); }}
          />
          <SettingToggle
            label="Preload linked pages"
            desc="Fetch hovered links in the background for instant navigation."
            checked={preloadPages}
            onChange={(v) => { setPreloadPages(v); persist(PRELOAD_PAGES_KEY, v); }}
          />
          <SettingToggle
            label="WebGL"
            desc="Enable WebGL for 3D graphics and GPU-accelerated rendering."
            checked={webgl}
            onChange={(v) => { setWebgl(v); persist(WEBGL_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Accessibility */}
      <SettingsGroup title="Accessibility" description="Settings for comfort and accessibility.">
        <div className="space-y-2">
          <SettingToggle
            label="Reduce motion"
            desc="Minimize animations and transitions throughout the UI."
            checked={reduceMotion}
            onChange={(v) => {
              setReduceMotion(v);
              persist(REDUCE_MOTION_KEY, v);
              document.documentElement.classList.toggle('reduce-motion', v);
            }}
          />
        </div>
      </SettingsGroup>

      {/* Network */}
      <SettingsGroup title="Network" description="Control how network connections are handled.">
        <div className="space-y-2">
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">WebRTC IP policy</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Control how WebRTC exposes your IP address.</div>
            <div className="flex gap-2">
              {([
                { id: 'default' as const, label: 'Default' },
                { id: 'disable_non_proxied' as const, label: 'Hide local IP' },
                { id: 'disable' as const, label: 'Disable WebRTC' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setWebrtcPolicy(opt.id); persist(WEBRTC_POLICY_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-150
                    ${webrtcPolicy === opt.id
                      ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                      : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* Developer */}
      <SettingsGroup title="Developer" description="Options for development and debugging.">
        <div className="space-y-2">
          <SettingToggle
            label="Developer panel"
            desc="Show the developer tools panel toggle in the toolbar."
            checked={devPanel}
            onChange={(v) => { setDevPanel(v); persist(DEV_PANEL_KEY, v); }}
          />
          <SettingToggle
            label="Verbose console logging"
            desc="Output detailed debug information to the console."
            checked={verboseLogging}
            onChange={(v) => { setVerboseLogging(v); persist(VERBOSE_LOGGING_KEY, v); }}
          />
          <SettingToggle
            label="Experimental features"
            desc="Enable unstable browser features. May cause issues."
            checked={experimentalFeatures}
            onChange={(v) => { setExperimentalFeatures(v); persist(EXPERIMENTAL_FEATURES_KEY, v); }}
          />
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">Process model</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">How resources are isolated. Restart required.</div>
            <div className="flex gap-2">
              {([
                { id: 'site' as const, label: 'Per-site (safer)' },
                { id: 'process' as const, label: 'Shared (faster)' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setProcessModel(opt.id); persist(PROCESS_MODEL_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${processModel === opt.id
                      ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                      : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* Custom CSS */}
      <SettingsGroup title="Custom CSS" description="Inject custom CSS into every page you visit.">
        <div className="space-y-2">
          <textarea
            value={customCSS}
            onChange={(e) => setCustomCSS(e.target.value)}
            placeholder="/* e.g. body { font-family: monospace !important; } */"
            rows={4}
            className="w-full rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-xs font-mono text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)] resize-none"
          />
          <button
            onClick={() => {
              persist(CUSTOM_CSS_KEY, customCSS);
              setCssSaved(true);
              setTimeout(() => setCssSaved(false), 1500);
            }}
            className="rounded-lg bg-[color:var(--ui-accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--ui-accent-contrast)] transition-all duration-150 hover:brightness-95 active:scale-[0.97]"
          >
            {cssSaved ? 'Saved ✓' : 'Save CSS'}
          </button>
        </div>
      </SettingsGroup>

      {/* Custom User Agent */}
      <SettingsGroup title="User Agent" description="Override the browser's user agent string.">
        <div className="space-y-2">
          <input
            type="text"
            value={customUserAgent}
            onChange={(e) => setCustomUserAgent(e.target.value)}
            placeholder="Leave empty for default"
            className="w-full rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-2.5 text-xs text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
          />
          <button
            onClick={() => {
              persist(CUSTOM_USERAGENT_KEY, customUserAgent);
              setUaSaved(true);
              setTimeout(() => setUaSaved(false), 1500);
            }}
            className="rounded-lg bg-[color:var(--ui-accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--ui-accent-contrast)] transition-all duration-150 hover:brightness-95 active:scale-[0.97]"
          >
            {uaSaved ? 'Saved ✓' : 'Save User Agent'}
          </button>
        </div>
      </SettingsGroup>

      {/* Data */}
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
            Removes history, cookies, cache, and saved top sites.
          </div>
        </button>
      </SettingsGroup>

      {/* About */}
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
    <div className="pr-4">
      <div className="text-sm font-medium text-[color:var(--ui-text)]">{label}</div>
      <div className="text-xs text-[color:var(--ui-text-muted)]">{desc}</div>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
  </div>
);
