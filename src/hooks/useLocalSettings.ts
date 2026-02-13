/**
 * Centralized reactive hook for localStorage-based settings.
 * Any component can call useLocalSettings() to get all settings
 * and they'll re-render when settings change (via a custom event).
 */
import { useEffect, useState } from 'react';

/* ── Storage helpers ─────────────────────── */
const get = (key: string, fallback: any) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Intercept localStorage.setItem for 'settings:' keys so that changes
 * made directly by settings sections (not via setSetting) still trigger reactivity.
 */
const _origSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function (key: string, value: string) {
  _origSetItem(key, value);
  if (key.startsWith('settings:')) {
    window.dispatchEvent(new CustomEvent('local-settings-change', { detail: { key } }));
  }
};

const set = (key: string, value: any) => {
  // Uses the intercepted setItem which auto-dispatches for settings: keys
  localStorage.setItem(key, JSON.stringify(value));
};

/* ── Default values ──────────────────────── */
/* ── Default values & types ───────────────── */
type Defaults = {
  // General
  'settings:startupPage': 'newTab' | 'restoreSession';
  'settings:restoreTabs': boolean;
  'settings:smoothScrolling': boolean;
  'settings:openLinksInNewTab': boolean;
  'settings:confirmBeforeClose': boolean;
  'settings:showBookmarksBar': boolean;
  'settings:tabHoverPreview': boolean;
  'settings:spellCheck': boolean;
  'settings:autofill': boolean;
  'settings:fontSize': 'small' | 'medium' | 'large' | 'x-large';
  'settings:doubleClickTabClose': boolean;
  'settings:newTabPosition': 'end' | 'afterCurrent';
  'settings:sidebarPosition': 'left' | 'right';
  'settings:middleClickPaste': boolean;

  // Privacy
  'settings:doNotTrack': boolean;
  'settings:blockThirdPartyCookies': boolean;
  'settings:httpsOnly': boolean;
  'settings:blockPopups': boolean;
  'settings:safeBrowsing': boolean;
  'settings:fingerprintProtection': boolean;
  'settings:blockCryptoMining': boolean;
  'settings:clearOnExit': boolean;
  'settings:blockAutoplay': boolean;

  // Advanced
  'settings:devPanelEnabled': boolean;
  'settings:hardwareAcceleration': boolean;
  'settings:dnsPrefetch': boolean;
  'settings:lazyLoading': boolean;
  'settings:preloadPages': boolean;
  'settings:verboseLogging': boolean;
  'settings:experimentalFeatures': boolean;
  'settings:customCSS': string;
  'settings:customUserAgent': string;
  'settings:reduceMotion': boolean;
  'settings:webgl': boolean;
  'settings:webrtcPolicy': 'default' | 'hideLocal' | 'disable';
  'settings:processModel': 'site' | 'shared';

  // Appearance
  'settings:uiDensity': 'compact' | 'comfortable' | 'spacious';
  'settings:animationSpeed': 'none' | 'fast' | 'normal' | 'slow';
  'settings:showClock': boolean;
  'settings:clockFormat': '12h' | '24h';
  'settings:showWeather': boolean;
  'settings:showGreeting': boolean;
  'settings:toolbarTransparency': boolean;
  'settings:roundedCorners': boolean;
  'settings:tabStyle': 'pill' | 'underline' | 'block';

  // Widgets
  'settings:weatherUnits': 'celsius' | 'fahrenheit';
  'settings:weatherShowForecast': boolean;
  'settings:weatherAutoRefresh': boolean;
  'settings:quickLinksEnabled': boolean;
  'settings:quickLinksCount': number;
  'settings:widgetEditMode': boolean;
  'settings:topSitesEnabled': boolean;

  // Search
  'settings:searchSuggestions': boolean;
  'settings:searchHistory': boolean;
  'settings:searchOpenNewTab': boolean;
  'settings:customSearchUrl': string;
};

const DEFAULTS: Defaults = {
  // General
  'settings:startupPage': 'newTab',
  'settings:restoreTabs': false,
  'settings:smoothScrolling': true,
  'settings:openLinksInNewTab': true,
  'settings:confirmBeforeClose': false,
  'settings:showBookmarksBar': false,
  'settings:tabHoverPreview': true,
  'settings:spellCheck': true,
  'settings:autofill': true,
  'settings:fontSize': 'medium',
  'settings:doubleClickTabClose': false,
  'settings:newTabPosition': 'end',
  'settings:sidebarPosition': 'left',
  'settings:middleClickPaste': false,

  // Privacy
  'settings:doNotTrack': true,
  'settings:blockThirdPartyCookies': true,
  'settings:httpsOnly': false,
  'settings:blockPopups': true,
  'settings:safeBrowsing': true,
  'settings:fingerprintProtection': false,
  'settings:blockCryptoMining': true,
  'settings:clearOnExit': false,
  'settings:blockAutoplay': false,

  // Advanced
  'settings:devPanelEnabled': false,
  'settings:hardwareAcceleration': true,
  'settings:dnsPrefetch': true,
  'settings:lazyLoading': true,
  'settings:preloadPages': false,
  'settings:verboseLogging': false,
  'settings:experimentalFeatures': false,
  'settings:customCSS': '',
  'settings:customUserAgent': '',
  'settings:reduceMotion': false,
  'settings:webgl': true,
  'settings:webrtcPolicy': 'default',
  'settings:processModel': 'site',

  // Appearance
  'settings:uiDensity': 'comfortable',
  'settings:animationSpeed': 'normal',
  'settings:showClock': true,
  'settings:clockFormat': '24h',
  'settings:showWeather': true,
  'settings:showGreeting': true,
  'settings:toolbarTransparency': true,
  'settings:roundedCorners': true,
  'settings:tabStyle': 'pill',

  // Widgets
  'settings:weatherUnits': 'celsius',
  'settings:weatherShowForecast': true,
  'settings:weatherAutoRefresh': true,
  'settings:quickLinksEnabled': true,
  'settings:quickLinksCount': 6,
  'settings:widgetEditMode': false,
  'settings:topSitesEnabled': true,

  // Search
  'settings:searchSuggestions': true,
  'settings:searchHistory': true,
  'settings:searchOpenNewTab': false,
  'settings:customSearchUrl': '',
};

export type LocalSettingsKey = keyof Defaults;
export type LocalSettingsValues = Defaults;

/* ── Read a single setting (non-reactive) ── */
export const getSetting = <K extends LocalSettingsKey>(key: K): Defaults[K] =>
  get(key, DEFAULTS[key]);

/* ── Write a single setting ────────────── */
export const setSetting = <K extends LocalSettingsKey>(key: K, value: Defaults[K]) => {
  set(key, value);
  // Sync Electron-level settings asynchronously
  syncToElectron();
};

let _syncTimer: number | null = null;
const syncToElectron = () => {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = window.setTimeout(() => {
    _syncTimer = null;
    if (window.electronAPI?.applyLocalSettings) {
      const all = readAll();
      window.electronAPI.applyLocalSettings(all).catch(() => {});
    }
  }, 500) as unknown as number;
};

/* ── Read all settings ───────────────────── */
const readAll = (): LocalSettingsValues => {
  const result = {} as any;
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    result[key] = get(key, fallback);
  }
  return result;
};

/* ── Font-size map ───────────────────────── */
const FONT_SIZE_MAP: Record<string, string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
  'x-large': '19px',
};

/* ── Animation speed CSS var ─────────────── */
const ANIMATION_SPEED_MAP: Record<string, string> = {
  none: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '400ms',
};

/* ── UI density spacing ──────────────────── */
const DENSITY_MAP: Record<string, string> = {
  compact: '2px',
  comfortable: '4px',
  spacious: '8px',
};

/**
 * Apply DOM/CSS-level settings that need to be set on <html>.
 * Called once on mount and again whenever settings change.
 */
export const applyDomSettings = (s: LocalSettingsValues) => {
  const root = document.documentElement;

  // Font size
  root.style.fontSize = FONT_SIZE_MAP[s['settings:fontSize']] ?? '15px';

  // Reduce motion
  root.classList.toggle('reduce-motion', s['settings:reduceMotion']);

  // Animation speed
  root.style.setProperty('--animation-speed', ANIMATION_SPEED_MAP[s['settings:animationSpeed']] ?? '200ms');

  // UI density
  root.style.setProperty('--ui-density-gap', DENSITY_MAP[s['settings:uiDensity']] ?? '4px');

  // Rounded corners
  root.style.setProperty('--ui-corner-radius', s['settings:roundedCorners'] ? '12px' : '4px');
  root.style.setProperty('--ui-corner-radius-lg', s['settings:roundedCorners'] ? '16px' : '6px');

  // Toolbar transparency
  root.classList.toggle('toolbar-transparent', s['settings:toolbarTransparency']);
};

/* ── Hook ─────────────────────────────────── */

export const useLocalSettings = () => {
  const [, setRev] = useState(0);

  useEffect(() => {
    const handler = () => setRev((r) => r + 1);
    window.addEventListener('local-settings-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('local-settings-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Fresh read each render – it's cheap (~50 localStorage reads)
  // setRev above forces a re-render when settings change
  return readAll();
};

/**
 * Hook that applies DOM-level settings on mount & change.
 * Should be called once in App.tsx or Home.tsx.
 */
export const useApplyDomSettings = () => {
  const settings = useLocalSettings();

  useEffect(() => {
    applyDomSettings(settings);
  }, [
    settings['settings:fontSize'],
    settings['settings:reduceMotion'],
    settings['settings:animationSpeed'],
    settings['settings:uiDensity'],
    settings['settings:roundedCorners'],
    settings['settings:toolbarTransparency'],
  ]);

  return settings;
};
