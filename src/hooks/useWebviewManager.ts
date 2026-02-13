import { useCallback, useRef, useEffect } from 'react';
import { Tab } from '@/lib/types';
import { getSetting } from '@/hooks/useLocalSettings';

interface UseWebviewManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabUpdate: (id: string, patch: Partial<Tab>) => void;
  onHistoryEntry?: (entry: { url: string; title: string }) => void;
  onOpenNewTab?: (url: string) => void;
}

export const useWebviewManager = ({
  tabs,
  activeTabId,
  onTabUpdate,
  onHistoryEntry,
  onOpenNewTab
}: UseWebviewManagerProps) => {
  const webviewsRef = useRef<Record<string, WebviewTag | null>>({});
  const cleanupRef = useRef<Record<string, (() => void) | undefined>>({});
  const cosmeticsUrlRef = useRef<Record<string, string>>({});
  const cosmeticsCssKeyRef = useRef<Record<string, string[]>>({});
  const lastHistoryKeyRef = useRef<Record<string, string>>({});
  const lastNavigateTimeRef = useRef<Record<string, number>>({});
  const NAVIGATE_THROTTLE_MS = 500;
  const cosmeticsCache = useRef<Map<string, { styles: string[], scripts: string[] }>>(new Map());
  const COSMETICS_CACHE_MAX = 50;

  // Use refs for callbacks to stabilize attachWebview
  const onTabUpdateRef = useRef(onTabUpdate);
  const onHistoryEntryRef = useRef(onHistoryEntry);
  const onOpenNewTabRef = useRef(onOpenNewTab);
  onTabUpdateRef.current = onTabUpdate;
  onHistoryEntryRef.current = onHistoryEntry;
  onOpenNewTabRef.current = onOpenNewTab;

  const updateNavState = useCallback(
    (tabId: string, webview: WebviewTag | null) => {
      if (!webview) return;
      onTabUpdateRef.current(tabId, {
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward()
      });
    },
    []
  );

  const applyCosmetics = useCallback(
    async (tabId: string, webview: WebviewTag | null, url?: string) => {
      if (!webview || !url) return;
      if (!window.electronAPI?.getAdblockCosmetics) return;
      if (!url.startsWith('http://') && !url.startsWith('https://')) return;
      if (cosmeticsUrlRef.current[tabId] === url) return;

      const existingKeys = cosmeticsCssKeyRef.current[tabId] ?? [];
      if (existingKeys.length) {
        for (const key of existingKeys) {
          try {
            await webview.removeInsertedCSS(key);
          } catch {
            
          }
        }
      }
      cosmeticsCssKeyRef.current[tabId] = [];
      cosmeticsUrlRef.current[tabId] = url;
      
      try {
        let cosmetics = cosmeticsCache.current.get(url);
        if (!cosmetics) {
          cosmetics = await window.electronAPI.getAdblockCosmetics(url);
          if (cosmeticsCache.current.size >= COSMETICS_CACHE_MAX) {
            const firstKey = cosmeticsCache.current.keys().next().value;
            cosmeticsCache.current.delete(firstKey);
          }
          cosmeticsCache.current.set(url, cosmetics);
        }
        
        const { styles, scripts } = cosmetics;
        if (styles?.length) {
          const key = await webview.insertCSS(styles.join('\n'));
          if (key) cosmeticsCssKeyRef.current[tabId] = [key];
        }
        if (scripts?.length) {
          await webview.executeJavaScript(scripts.join('\n'), true);
        }
      } catch {
        
      }
    },
    []
  );

  // Cache ref callbacks per tabId to avoid unmount/remount on every render
  const refCallbackCache = useRef<Record<string, (el: WebviewTag | null) => void>>({});

  const attachWebview = useCallback(
    (tabId: string) => {
      if (refCallbackCache.current[tabId]) return refCallbackCache.current[tabId];

      const refCallback = (el: WebviewTag | null) => {
      if (cleanupRef.current[tabId]) {
        cleanupRef.current[tabId]?.();
        cleanupRef.current[tabId] = undefined;
      }

      webviewsRef.current[tabId] = el;
      if (!el) {
        cosmeticsCssKeyRef.current[tabId] = [];
        cosmeticsUrlRef.current[tabId] = '';
        return;
      }

      // Apply webview attribute-level settings
      try {
        // Custom user agent
        const customUA = getSetting('settings:customUserAgent');
        if (customUA && typeof customUA === 'string' && customUA.trim()) {
          el.setAttribute('useragent', customUA);
        }

        // Block popups (disable allowpopups)
        if (getSetting('settings:blockPopups')) {
          el.removeAttribute('allowpopups');
        } else {
          el.setAttribute('allowpopups', '');
        }

        // Spell check
        (el as any).spellcheck = getSetting('settings:spellCheck');

        // Block autoplay via disableblinkfeatures
        if (getSetting('settings:blockAutoplay')) {
          const existing = el.getAttribute('disableblinkfeatures') || '';
          if (!existing.includes('AutoplayIgnoreWebAudio')) {
            el.setAttribute('disableblinkfeatures', existing ? `${existing},AutoplayIgnoreWebAudio` : 'AutoplayIgnoreWebAudio');
          }
        }
      } catch {}

      const handleStart = () => onTabUpdateRef.current(tabId, { loading: true });
      const handleStop = () => {
        onTabUpdateRef.current(tabId, { loading: false });
        updateNavState(tabId, el);
        const url = el.getURL?.();
        if (!url || url.startsWith('browser://')) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) return;
        const title = typeof el.getTitle === 'function' ? el.getTitle() : url;
        const key = `${url}|${title}`;
        if (lastHistoryKeyRef.current[tabId] === key) return;
        lastHistoryKeyRef.current[tabId] = key;
        onHistoryEntryRef.current?.({ url, title: title || url });
      };
      const handleTitle = (event: any) =>
        onTabUpdateRef.current(tabId, { title: event?.title || 'New Tab' });
      const handleFavicon = (event: any) => {
        const favicon = event?.favicons?.[0];
        if (favicon) onTabUpdateRef.current(tabId, { favicon });
      };
      const handleNavigate = (event: any) => {
        const now = Date.now();
        const lastTime = lastNavigateTimeRef.current[tabId] ?? 0;
        if (now - lastTime < NAVIGATE_THROTTLE_MS) return;
        lastNavigateTimeRef.current[tabId] = now;
        
        if (event?.url) {
          // HTTPS-only mode: redirect http to https
          if (getSetting('settings:httpsOnly') && event.url.startsWith('http://')) {
            const httpsUrl = event.url.replace(/^http:\/\//, 'https://');
            try { el.loadURL(httpsUrl); } catch {}
            return;
          }
          onTabUpdateRef.current(tabId, { url: event.url });
        }
        updateNavState(tabId, el);
        if (event?.url) applyCosmetics(tabId, el, event.url);
      };
      const handleFail = (event: any) => {
        const errorCode = event?.errorCode;
        if (errorCode === -3 || errorCode === 'ERR_ABORTED') {
          return;
        }
        onTabUpdate(tabId, { loading: false });
        updateNavState(tabId, el);
      };
      const handleDomReady = () => {
        applyCosmetics(tabId, el, el.getURL());

        // Apply user settings to webview
        try {
          // Custom CSS injection
          const customCSS = getSetting('settings:customCSS');
          if (customCSS && typeof customCSS === 'string' && customCSS.trim()) {
            el.insertCSS(customCSS).catch(() => {});
          }

          // Smooth scrolling
          const smoothScrolling = getSetting('settings:smoothScrolling');
          el.executeJavaScript(
            `document.documentElement.style.scrollBehavior = '${smoothScrolling ? 'smooth' : 'auto'}';`,
            true
          ).catch(() => {});

          // Do Not Track via JS
          if (getSetting('settings:doNotTrack')) {
            el.executeJavaScript(
              `Object.defineProperty(navigator, 'doNotTrack', { get: () => '1', configurable: true });`,
              true
            ).catch(() => {});
          }

          // Lazy loading: add loading="lazy" to all future images/iframes
          if (getSetting('settings:lazyLoading')) {
            el.executeJavaScript(
              `(function(){
                document.querySelectorAll('img:not([loading]),iframe:not([loading])').forEach(function(el){el.setAttribute('loading','lazy')});
                var obs = new MutationObserver(function(muts){
                  muts.forEach(function(m){
                    m.addedNodes.forEach(function(n){
                      if(n.nodeType===1){
                        if((n.tagName==='IMG'||n.tagName==='IFRAME')&&!n.getAttribute('loading'))n.setAttribute('loading','lazy');
                        n.querySelectorAll&&n.querySelectorAll('img:not([loading]),iframe:not([loading])').forEach(function(el){el.setAttribute('loading','lazy')});
                      }
                    });
                  });
                });
                obs.observe(document.documentElement,{childList:true,subtree:true});
              })();`,
              true
            ).catch(() => {});
          }

          // WebGL toggle: disable via canvas override when webgl is off
          if (!getSetting('settings:webgl')) {
            el.executeJavaScript(
              `HTMLCanvasElement.prototype.getContext = (function(orig){
                return function(type){
                  if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;
                  return orig.apply(this,arguments);
                };
              })(HTMLCanvasElement.prototype.getContext);`,
              true
            ).catch(() => {});
          }

          // WebRTC policy
          const webrtcPolicy = getSetting('settings:webrtcPolicy');
          if (webrtcPolicy === 'disable') {
            el.executeJavaScript(
              `window.RTCPeerConnection = undefined; window.webkitRTCPeerConnection = undefined;`,
              true
            ).catch(() => {});
          } else if (webrtcPolicy === 'hideLocal') {
            el.executeJavaScript(
              `(function(){
                var Orig = window.RTCPeerConnection;
                if(!Orig)return;
                window.RTCPeerConnection = function(){
                  var pc = new Orig({iceServers:[],iceCandidatePoolSize:0});
                  return pc;
                };
                window.RTCPeerConnection.prototype = Orig.prototype;
              })();`,
              true
            ).catch(() => {});
          }

          // Fingerprint protection: add noise to canvas/audio APIs
          if (getSetting('settings:fingerprintProtection')) {
            el.executeJavaScript(
              `(function(){
                var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(){
                  var ctx = this.getContext('2d');
                  if(ctx){
                    var img = ctx.getImageData(0,0,Math.min(this.width,2),Math.min(this.height,2));
                    for(var i=0;i<img.data.length;i+=4){img.data[i]=(img.data[i]+Math.floor(Math.random()*2))&255;}
                    ctx.putImageData(img,0,0);
                  }
                  return origToDataURL.apply(this,arguments);
                };
              })();`,
              true
            ).catch(() => {});
          }
        } catch {}
      };
      const handleBeforeInput = (event: any) => {
        const input = event?.input || event?.detail?.input || event;
        if (!input) return;
        const key = String(input.key || input.code || '').toLowerCase();
        if (key !== 'l' && key !== 'keyl') return;
        const hasModifier = Boolean(
          input.control || input.meta || input.ctrlKey || input.metaKey
        );
        if (!hasModifier) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        window.dispatchEvent(new CustomEvent('browser-focus-address-bar'));
      };
      const handleWebviewFocus = () => {
        window.dispatchEvent(new CustomEvent('browser-webview-focus'));
      };
      const handleNewWindow = (event: any) => {
        const url = event?.url;
        if (typeof event?.preventDefault === 'function') {
          event.preventDefault();
        }
        // Respect openLinksInNewTab setting — always open in new tab if enabled
        if (url) onOpenNewTabRef.current?.(url);
      };

      el.addEventListener('did-start-loading', handleStart);
      el.addEventListener('did-stop-loading', handleStop);
      el.addEventListener('page-title-updated', handleTitle);
      el.addEventListener('page-favicon-updated', handleFavicon);
      el.addEventListener('did-navigate', handleNavigate);
      el.addEventListener('did-navigate-in-page', handleNavigate);
      el.addEventListener('did-fail-load', handleFail);
      el.addEventListener('before-input-event', handleBeforeInput);
      el.addEventListener('dom-ready', handleDomReady);
      el.addEventListener('focus', handleWebviewFocus);
      el.addEventListener('new-window', handleNewWindow);

      cleanupRef.current[tabId] = () => {
        el.removeEventListener('did-start-loading', handleStart);
        el.removeEventListener('did-stop-loading', handleStop);
        el.removeEventListener('page-title-updated', handleTitle);
        el.removeEventListener('page-favicon-updated', handleFavicon);
        el.removeEventListener('did-navigate', handleNavigate);
        el.removeEventListener('did-navigate-in-page', handleNavigate);
        el.removeEventListener('did-fail-load', handleFail);
        el.removeEventListener('before-input-event', handleBeforeInput);
        el.removeEventListener('dom-ready', handleDomReady);
        el.removeEventListener('focus', handleWebviewFocus);
        el.removeEventListener('new-window', handleNewWindow);
      };
      };

      refCallbackCache.current[tabId] = refCallback;
      return refCallback;
    },
    [applyCosmetics, updateNavState]
  );

  useEffect(() => {
    return () => {
      Object.values(cleanupRef.current).forEach((cleanup) => {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (e) {
            console.warn('Error during cleanup:', e);
          }
        }
      });
      cleanupRef.current = {};
    };
  }, []);

  // Pause/resume webviews — only when active tab changes, not on every tabs update
  const prevActiveTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevId = prevActiveTabIdRef.current;
    prevActiveTabIdRef.current = activeTabId;

    // Pause previous active tab
    if (prevId && prevId !== activeTabId) {
      const prevWebview = webviewsRef.current[prevId];
      if (prevWebview) {
        try {
          if (typeof (prevWebview as any).pause === 'function') (prevWebview as any).pause();
        } catch {}
      }
    }

    // Resume new active tab
    const activeWebview = webviewsRef.current[activeTabId];
    if (activeWebview) {
      try {
        if (typeof (activeWebview as any).resume === 'function') (activeWebview as any).resume();
      } catch {}
    }
  }, [activeTabId]);

  return { attachWebview };
};