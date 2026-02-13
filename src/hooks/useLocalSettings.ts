/**
 * Centralized reactive hook for localStorage-based settings.
 *
 * Performance architecture:
 * - Module-level singleton cache: settings are read from localStorage ONCE,
 *   then kept in memory. Subsequent reads hit the cache (O(1) object lookup).
 * - useSyncExternalStore: React 18+ primitive that avoids useState + useEffect
 *   overhead and handles concurrent rendering correctly.
 * - Fine-grained subscriptions via useSetting(key): components only re-render
 *   when their specific setting changes, not when ANY setting changes.
 * - Batched notifications via queueMicrotask: multiple rapid writes coalesce
 *   into a single notification cycle.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/* ── Storage helpers ─────────────────────── */
const parse = (key: string, fallback: any) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
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

/* ── Module-level cache & subscription system ─ */
let _cache: LocalSettingsValues | null = null;
const _listeners = new Set<() => void>();

/** Initialize or return the cached settings object (one-time localStorage read) */
const ensureCache = (): LocalSettingsValues => {
  if (!_cache) {
    const result = {} as any;
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
      result[key] = parse(key, fallback);
    }
    _cache = result;
  }
  return _cache;
};

/** Notify all useSyncExternalStore subscribers */
const notify = () => {
  _listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
};

/** Subscribe function for useSyncExternalStore */
const subscribe = (listener: () => void) => {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
};

/* ── Monkey-patch localStorage.setItem (batched) ── */
const _origSetItem = localStorage.setItem.bind(localStorage);
let _batchPending = false;

localStorage.setItem = function (key: string, value: string) {
  _origSetItem(key, value);

  // Only react to known settings keys
  if (key.startsWith('settings:') && key in DEFAULTS) {
    const cache = ensureCache();
    try {
      const parsed = JSON.parse(value);
      const settingsKey = key as LocalSettingsKey;
      // Skip if value hasn't actually changed (avoids unnecessary re-renders)
      if (Object.is(cache[settingsKey], parsed)) return;

      // Create a new cache reference so useSyncExternalStore detects the change
      _cache = { ...cache, [settingsKey]: parsed };

      // Batch notifications: coalesce rapid writes into one notification cycle
      if (!_batchPending) {
        _batchPending = true;
        queueMicrotask(() => {
          _batchPending = false;
          notify();
          debouncedSyncToElectron();
        });
      }
    } catch {}
  }
};

/* ── Cross-tab storage sync ───────────────── */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('settings:') && e.key in DEFAULTS) {
      const cache = ensureCache();
      const parsed = parse(e.key, DEFAULTS[e.key as LocalSettingsKey]);
      if (!Object.is(cache[e.key as LocalSettingsKey], parsed)) {
        _cache = { ...cache, [e.key]: parsed };
        notify();
      }
    }
  });
}

/* ── Electron sync (debounced) ────────────── */
let _syncTimer: number | null = null;
const debouncedSyncToElectron = () => {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = window.setTimeout(() => {
    _syncTimer = null;
    if (window.electronAPI?.applyLocalSettings) {
      window.electronAPI.applyLocalSettings(ensureCache()).catch(() => {});
    }
  }, 500) as unknown as number;
};

/* ── Public API: non-reactive reads/writes ── */

/** Read a single setting (non-reactive, for use outside components) */
export const getSetting = <K extends LocalSettingsKey>(key: K): Defaults[K] =>
  ensureCache()[key];

/** Write a single setting (triggers reactive updates automatically) */
export const setSetting = <K extends LocalSettingsKey>(key: K, value: Defaults[K]) => {
  localStorage.setItem(key, JSON.stringify(value));
  // The monkey-patch handles cache update, notification, and Electron sync
};

/* ── Hooks ────────────────────────────────── */

/**
 * Subscribe to a SINGLE setting with fine-grained reactivity.
 * The component only re-renders when this specific setting's value changes.
 * Preferred over useLocalSettings() for most components.
 */
export const useSetting = <K extends LocalSettingsKey>(key: K): Defaults[K] => {
  const getSnapshot = useCallback(() => ensureCache()[key], [key]);
  return useSyncExternalStore(subscribe, getSnapshot);
};

/**
 * Subscribe to ALL settings (re-renders on any setting change).
 * Use useSetting(key) instead when you only need a few settings.
 */
export const useLocalSettings = (): LocalSettingsValues => {
  return useSyncExternalStore(subscribe, ensureCache);
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

/**
 * Hook that applies DOM-level settings on mount & change.
 * Uses fine-grained useSetting() subscriptions so it only runs
 * when a DOM-relevant setting actually changes.
 * Should be called once in App.tsx or Home.tsx.
 */
export const useApplyDomSettings = () => {
  const fontSize = useSetting('settings:fontSize');
  const reduceMotion = useSetting('settings:reduceMotion');
  const animationSpeed = useSetting('settings:animationSpeed');
  const uiDensity = useSetting('settings:uiDensity');
  const roundedCorners = useSetting('settings:roundedCorners');
  const toolbarTransparency = useSetting('settings:toolbarTransparency');

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = FONT_SIZE_MAP[fontSize] ?? '15px';
    root.classList.toggle('reduce-motion', reduceMotion);
    root.style.setProperty('--animation-speed', ANIMATION_SPEED_MAP[animationSpeed] ?? '200ms');
    root.style.setProperty('--ui-density-gap', DENSITY_MAP[uiDensity] ?? '4px');
    root.style.setProperty('--ui-corner-radius', roundedCorners ? '12px' : '4px');
    root.style.setProperty('--ui-corner-radius-lg', roundedCorners ? '16px' : '6px');
    root.classList.toggle('toolbar-transparent', toolbarTransparency);
  }, [fontSize, reduceMotion, animationSpeed, uiDensity, roundedCorners, toolbarTransparency]);
};
