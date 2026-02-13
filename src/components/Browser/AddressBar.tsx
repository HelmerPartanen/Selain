import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LuTriangleAlert, LuLock, LuSearch } from "react-icons/lu";
import { SearchEngine } from "@/lib/types";

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  loading: boolean;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  openInNewTab?: boolean;
  onOpenNewTab?: (url: string) => void;
  middleClickPaste?: boolean;
}

const AddressBarInner: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  loading,
  searchEngine,
  customSearchUrl,
  openInNewTab = false,
  onOpenNewTab,
  middleClickPaste = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputDispatchTimeout = useRef<number | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const isWelcome = useMemo(() => url === "browser://welcome", [url]);

  const displayDomain = useMemo(() => {
    if (isWelcome || !url) return "";
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      const host = new URL(normalized).hostname;
      return host.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url, isWelcome]);

  const secure = useMemo(() => 
    url.startsWith("https") || isWelcome, 
    [url, isWelcome]
  );

  const getSearchUrl = useCallback((query: string) => {
    const encoded = encodeURIComponent(query);
    switch (searchEngine) {
      case SearchEngine.YAHOO:
        return `https://search.yahoo.com/search?p=${encoded}`;
      case SearchEngine.DUCKDUCKGO:
        return `https://duckduckgo.com/?q=${encoded}`;
      case SearchEngine.BING:
        return `https://www.bing.com/search?q=${encoded}`;
      case SearchEngine.CUSTOM:
        if (!customSearchUrl.trim()) {
          return `https://www.google.com/search?q=${encoded}`;
        }
        if (customSearchUrl.includes("{query}")) {
          return customSearchUrl.replace("{query}", encoded);
        }
        return `${customSearchUrl}${customSearchUrl.includes("?") ? "&" : "?"}q=${encoded}`;
      case SearchEngine.GOOGLE:
      default:
        return `https://www.google.com/search?q=${encoded}`;
    }
  }, [customSearchUrl, searchEngine]);

  const isLikelyDirectUrl = useCallback((val: string) => {
    if (!val) return false;
    if (val.startsWith('http') || val.startsWith('browser://')) return true;
    return val.includes('.') && !val.includes(' ');
  }, []);

  const normalizeTarget = useCallback(
    (value: string) => {
      const target = value.trim();
      if (!target) return "";

      if (!target.startsWith("http") && !target.startsWith("browser://")) {
        if (target.includes(".") && !target.includes(" ")) {
          return `https://${target}`;
        }
        return getSearchUrl(target);
      }

      return target;
    },
    [getSearchUrl]
  );

  const focusInput = useCallback(() => {
    setIsFocused(true);
    const focusValue = isWelcome ? "" : url;
    setInputVal(focusValue);
    
    window.dispatchEvent(
      new CustomEvent("browser-addressbar-input", { detail: { value: focusValue } })
    );

    const input = inputRef.current;
    if (!input) return;

    input.focus();
    requestAnimationFrame(() => {
      input.select();
    });
  }, [isWelcome, url]);

  const handleMiddleClick = useCallback(async (e: React.MouseEvent<HTMLInputElement>) => {
    if (e.button !== 1 || !middleClickPaste) return;
    e.preventDefault();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputVal(text);
        inputRef.current?.focus();
      }
    } catch {
      // Silently fail if clipboard access is denied
    }
  }, [middleClickPaste]);

  const handleFocus = useCallback(() => {
    window.dispatchEvent(new CustomEvent("browser-addressbar-focus"));
    focusInput();
  }, [focusInput]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    window.dispatchEvent(new CustomEvent("browser-addressbar-blur"));
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputVal(value);
    
    if (inputDispatchTimeout.current !== null) {
      clearTimeout(inputDispatchTimeout.current);
    }
    
    inputDispatchTimeout.current = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("browser-addressbar-input", { detail: { value } })
      );
      inputDispatchTimeout.current = null;
    }, 150);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.currentTarget.blur();
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeTarget(inputVal);
    if (!target) return;
    
    if (openInNewTab && onOpenNewTab && !isLikelyDirectUrl(inputVal.trim())) {
      onOpenNewTab(target);
    } else {
      onNavigate(target);
    }
    inputRef.current?.blur();
  }, [inputVal, normalizeTarget, openInNewTab, onOpenNewTab, isLikelyDirectUrl, onNavigate]);

  // Update input value when not focused
  useEffect(() => {
    if (!isFocused) {
      setInputVal(isWelcome ? "" : displayDomain);
    }
  }, [displayDomain, isFocused, isWelcome]);

  // Keyboard shortcut (Ctrl/Cmd + L)
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "l") return;
      event.preventDefault();
      focusInput();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [focusInput]);

  // External focus event
  useEffect(() => {
    const handleExternalFocus = () => focusInput();
    window.addEventListener("browser-focus-address-bar", handleExternalFocus);
    return () => window.removeEventListener("browser-focus-address-bar", handleExternalFocus);
  }, [focusInput]);

  // Electron API focus
  useEffect(() => {
    if (!window.electronAPI?.onFocusAddressBar) return undefined;
    return window.electronAPI.onFocusAddressBar(focusInput);
  }, [focusInput]);

  // Suggestion commit handler
  useEffect(() => {
    const handleSuggestionCommit = (event: Event) => {
      const custom = event as CustomEvent<{ value?: string }>;
      const value = custom.detail?.value ?? "";
      if (!value) return;
      setInputVal(value);
      const target = normalizeTarget(value);
      if (!target) return;
      onNavigate(target);
      inputRef.current?.blur();
    };

    window.addEventListener("browser-suggestion-commit", handleSuggestionCommit as EventListener);
    return () => window.removeEventListener("browser-suggestion-commit", handleSuggestionCommit as EventListener);
  }, [normalizeTarget, onNavigate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (inputDispatchTimeout.current) {
        clearTimeout(inputDispatchTimeout.current);
      }
    };
  }, []);

  // Memoized styles and values
  const placeholderText = "Search or enter URL";
  const displayText = inputVal || placeholderText;
  const inputSize = useMemo(() => Math.max(1, displayText.length + 1), [displayText.length]);
  
  const compactWidth = useMemo(() => 
    `calc(${inputSize}ch + 24px)`, 
    [inputSize]
  );

  const wrapperClassName = useMemo(() =>
    `relative flex justify-center transition-[width,transform] duration-200 ease-in-out ${
      isFocused
        ? "w-full max-w-5xl scale-100"
        : "max-w-full scale-100"
    }`,
    [isFocused]
  );

  const containerClassName = useMemo(() => 
    `relative flex items-center w-full h-8 overflow-hidden transition-colors duration-200 backdrop-blur-lg ${
      isFocused
        ? "bg-[color:var(--ui-surface-strong)] border border-[color:var(--ui-border)] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
        : "bg-[color:var(--ui-surface-muted)] shadow-sm hover:bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)]"
    } rounded-full`,
    [isFocused]
  );

  return (
    <div className="flex-1 flex w-full relative z-20 electron-drag justify-center">
      <div
        className={wrapperClassName}
        style={{
          width: isFocused
            ? undefined
            : `clamp(160px, ${compactWidth}, 420px)`
        }}
      >
        <form onSubmit={handleSubmit} className="relative h-full w-full">
          <div className={containerClassName}>
            <div className="absolute left-2 flex items-center text-[color:var(--ui-text-muted)]">
              {isWelcome ? (
                <LuSearch size={12} />
              ) : secure ? (
                <LuLock size={12} className="text-green-400" />
              ) : (
                <span title="Connection is not secure" aria-label="Connection is not secure">
                  <LuTriangleAlert size={12} />
                </span>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              size={isFocused ? undefined : inputSize}
              className="w-full h-full bg-transparent border-none outline-none text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text)] electron-no-drag transition-[padding] duration-300 ease-in-out pl-7 pr-3 text-left"
              value={inputVal}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onMouseDown={handleMiddleClick}
              aria-label="Address bar"
              placeholder={placeholderText}
              spellCheck={false}
              autoComplete="off"
            />

            {loading && (
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-[color:var(--ui-accent)] transition-all duration-300"
                style={{ width: "35%" }}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddressBar = React.memo(AddressBarInner) as React.FC<AddressBarProps>;