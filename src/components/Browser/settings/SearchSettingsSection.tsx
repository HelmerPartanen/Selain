import React, { useEffect, useState } from 'react';
import { SearchEngine } from '@/lib/types';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const searchEngineIcons: Partial<Record<SearchEngine, string>> = {
  [SearchEngine.GOOGLE]: new URL('../../../assets/Google.svg', import.meta.url).href,
  [SearchEngine.YAHOO]: new URL('../../../assets/Yahoo.svg', import.meta.url).href,
  [SearchEngine.DUCKDUCKGO]: new URL('../../../assets/DuckDuckGo.svg', import.meta.url).href,
  [SearchEngine.BING]: new URL('../../../assets/Bing.svg', import.meta.url).href
};

const searchOptions = [
  { id: SearchEngine.GOOGLE, label: 'Google', description: 'Fast results with broad coverage.' },
  { id: SearchEngine.YAHOO, label: 'Yahoo', description: 'Classic search with news integrations.' },
  { id: SearchEngine.DUCKDUCKGO, label: 'DuckDuckGo', description: 'Privacy-focused search.' },
  { id: SearchEngine.BING, label: 'Bing', description: 'Microsoft search experience.' }
];

const storageGet = (key: string, fallback: any) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const SEARCH_SUGGESTIONS_KEY = 'settings:searchSuggestions';
const SEARCH_HISTORY_KEY = 'settings:searchHistory';
const SEARCH_OPEN_NEW_TAB_KEY = 'settings:searchOpenNewTab';
const CUSTOM_SEARCH_URL_KEY = 'settings:customSearchUrl';

/* Reusable toggle row */
const SettingToggle: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  custom?: React.ReactNode;
}> = ({ label, description, checked, onChange, custom }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
    <div className="pr-4">
      <div className="text-sm font-medium text-[color:var(--ui-text)]">{label}</div>
      <div className="text-xs text-[color:var(--ui-text-muted)]">{description}</div>
    </div>
    {custom ?? <ToggleSwitch checked={checked} onChange={onChange ?? (() => {})} ariaLabel={label} />}
  </div>
);

interface SearchSettingsSectionProps {
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
}

export const SearchSettingsSection: React.FC<SearchSettingsSectionProps> = ({
  searchEngine,
  onSearchEngineChange
}) => {
  const [searchSuggestions, setSearchSuggestions] = useState(() => storageGet(SEARCH_SUGGESTIONS_KEY, true));
  const [searchHistory, setSearchHistory] = useState(() => storageGet(SEARCH_HISTORY_KEY, true));
  const [searchOpenNewTab, setSearchOpenNewTab] = useState(() => storageGet(SEARCH_OPEN_NEW_TAB_KEY, false));
  const [customSearchUrl, setCustomSearchUrl] = useState(() => storageGet(CUSTOM_SEARCH_URL_KEY, ''));
  const [customSaved, setCustomSaved] = useState(false);

  useEffect(() => {
    if (searchEngine === SearchEngine.CUSTOM && !customSearchUrl) {
      onSearchEngineChange(SearchEngine.GOOGLE);
    }
  }, [searchEngine, onSearchEngineChange, customSearchUrl]);

  return (
    <div className="space-y-8">
      <SettingsGroup title="Default search engine">
        <div className="space-y-2">
          {searchOptions.map((option) => {
            const icon = searchEngineIcons[option.id];
            return (
              <button
                key={option.id}
                onClick={() => onSearchEngineChange(option.id)}
                className={`w-full rounded-xl px-4 py-3 text-left transition
                  ${
                    searchEngine === option.id
                      ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                      : 'hover:bg-[color:var(--ui-hover)]'
                  }`}
              >
                <div className="flex items-start gap-3">
                  {icon && (
                    <img
                      src={icon}
                      alt={`${option.label} icon`}
                      className="h-6 w-6 shrink-0"
                    />
                  )}
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        searchEngine === option.id
                          ? 'text-[color:var(--ui-accent-contrast)]'
                          : 'text-[color:var(--ui-text)]'
                      }`}
                    >
                      {option.label}
                    </div>
                    <div
                      className={`text-xs ${
                        searchEngine === option.id
                          ? 'text-[color:var(--ui-accent-contrast)]/80'
                          : 'text-[color:var(--ui-text-muted)]'
                      }`}
                    >
                      {option.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      {/* Custom Search URL */}
      <SettingsGroup title="Custom Search URL" description="Use a custom search engine by providing a URL template. Use %s for the search query placeholder.">
        <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4 space-y-3">
          <input
            type="text"
            value={customSearchUrl}
            onChange={(e) => { setCustomSearchUrl(e.target.value); setCustomSaved(false); }}
            placeholder="https://example.com/search?q=%s"
            className="w-full rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-3 py-2 text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-muted)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)] font-mono"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(CUSTOM_SEARCH_URL_KEY, JSON.stringify(customSearchUrl));
                if (customSearchUrl.includes('%s')) {
                  onSearchEngineChange(SearchEngine.CUSTOM);
                }
                setCustomSaved(true);
                setTimeout(() => setCustomSaved(false), 2000);
              }}
              className="rounded-lg bg-[color:var(--ui-accent)] px-4 py-1.5 text-xs font-medium text-[color:var(--ui-accent-contrast)] transition hover:opacity-90"
            >
              {customSaved ? 'Saved!' : 'Save & use'}
            </button>
            <span className="text-xs text-[color:var(--ui-text-muted)]">
              {searchEngine === SearchEngine.CUSTOM ? 'Currently active' : 'Save to activate as default engine'}
            </span>
          </div>
        </div>
      </SettingsGroup>

      {/* Search Behavior */}
      <SettingsGroup title="Search Behavior" description="Control how search works in the address bar.">
        <SettingToggle
          label="Search suggestions"
          description="Show real-time suggestions as you type in the address bar."
          checked={searchSuggestions}
          onChange={() => { const v = !searchSuggestions; setSearchSuggestions(v); localStorage.setItem(SEARCH_SUGGESTIONS_KEY, JSON.stringify(v)); }}
        />
        <SettingToggle
          label="Save search history"
          description="Remember recent searches for quick access and suggestions."
          checked={searchHistory}
          onChange={() => { const v = !searchHistory; setSearchHistory(v); localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(v)); }}
        />
        <SettingToggle
          label="Open results in new tab"
          description="Always open search results in a new tab instead of the current one."
          checked={searchOpenNewTab}
          onChange={() => { const v = !searchOpenNewTab; setSearchOpenNewTab(v); localStorage.setItem(SEARCH_OPEN_NEW_TAB_KEY, JSON.stringify(v)); }}
        />
      </SettingsGroup>
    </div>
  );
};
