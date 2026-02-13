import React, { useCallback, useState } from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const STARTUP_PAGE_KEY = 'settings:startupPage';
const RESTORE_TABS_KEY = 'settings:restoreTabs';
const SMOOTH_SCROLLING_KEY = 'settings:smoothScrolling';
const OPEN_LINKS_IN_NEW_TAB_KEY = 'settings:openLinksInNewTab';
const CONFIRM_CLOSE_KEY = 'settings:confirmBeforeClose';
const SHOW_BOOKMARKS_KEY = 'settings:showBookmarksBar';
const TAB_HOVER_PREVIEW_KEY = 'settings:tabHoverPreview';
const SPELL_CHECK_KEY = 'settings:spellCheck';
const AUTOFILL_KEY = 'settings:autofill';
const FONT_SIZE_KEY = 'settings:fontSize';
const DOUBLE_CLICK_TAB_KEY = 'settings:doubleClickTabClose';
const NEW_TAB_POSITION_KEY = 'settings:newTabPosition';
const SIDEBAR_POSITION_KEY = 'settings:sidebarPosition';
const MIDDLE_CLICK_PASTE_KEY = 'settings:middleClickPaste';

const storageGet = (key: string, fallback: any) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const fontSizeOptions = [
  { id: 'small', label: 'Small', px: '14px' },
  { id: 'medium', label: 'Medium', px: '15px' },
  { id: 'large', label: 'Large', px: '16px' },
  { id: 'x-large', label: 'Extra Large', px: '18px' },
];

export const GeneralSettingsSection: React.FC = () => {
  const [startupPage, setStartupPage] = useState<'newTab' | 'lastSession'>(() =>
    storageGet(STARTUP_PAGE_KEY, 'newTab')
  );
  const [restoreTabs, setRestoreTabs] = useState(() => storageGet(RESTORE_TABS_KEY, false));
  const [smoothScrolling, setSmoothScrolling] = useState(() => storageGet(SMOOTH_SCROLLING_KEY, true));
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(() => storageGet(OPEN_LINKS_IN_NEW_TAB_KEY, true));
  const [confirmClose, setConfirmClose] = useState(() => storageGet(CONFIRM_CLOSE_KEY, false));
  const [showBookmarks, setShowBookmarks] = useState(() => storageGet(SHOW_BOOKMARKS_KEY, false));
  const [tabHoverPreview, setTabHoverPreview] = useState(() => storageGet(TAB_HOVER_PREVIEW_KEY, true));
  const [spellCheck, setSpellCheck] = useState(() => storageGet(SPELL_CHECK_KEY, true));
  const [autofill, setAutofill] = useState(() => storageGet(AUTOFILL_KEY, true));
  const [fontSize, setFontSize] = useState(() => storageGet(FONT_SIZE_KEY, 'medium'));
  const [doubleClickTabClose, setDoubleClickTabClose] = useState(() => storageGet(DOUBLE_CLICK_TAB_KEY, false));
  const [newTabPosition, setNewTabPosition] = useState<'end' | 'afterCurrent'>(() =>
    storageGet(NEW_TAB_POSITION_KEY, 'end')
  );
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() =>
    storageGet(SIDEBAR_POSITION_KEY, 'left')
  );
  const [middleClickPaste, setMiddleClickPaste] = useState(() => storageGet(MIDDLE_CLICK_PASTE_KEY, false));

  const persist = useCallback((key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  return (
    <div className="space-y-8">
      {/* Startup */}
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

      {/* Tabs */}
      <SettingsGroup title="Tabs" description="Control how tabs behave.">
        <div className="space-y-2">
          <SettingToggle
            label="Restore tabs on startup"
            desc="Remember open tabs when the browser is closed."
            checked={restoreTabs}
            onChange={(v) => { setRestoreTabs(v); persist(RESTORE_TABS_KEY, v); }}
          />
          <SettingToggle
            label="Tab hover preview"
            desc="Show a tooltip preview when hovering over tabs."
            checked={tabHoverPreview}
            onChange={(v) => { setTabHoverPreview(v); persist(TAB_HOVER_PREVIEW_KEY, v); }}
          />
          <SettingToggle
            label="Double-click to close tab"
            desc="Close tabs by double-clicking them."
            checked={doubleClickTabClose}
            onChange={(v) => { setDoubleClickTabClose(v); persist(DOUBLE_CLICK_TAB_KEY, v); }}
          />
          <SettingToggle
            label="Open links in new tab"
            desc="External links open in a new tab by default."
            checked={openLinksInNewTab}
            onChange={(v) => { setOpenLinksInNewTab(v); persist(OPEN_LINKS_IN_NEW_TAB_KEY, v); }}
          />
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">New tab position</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Where new tabs appear in the tab bar.</div>
            <div className="flex gap-2">
              {([
                { id: 'end' as const, label: 'End of bar' },
                { id: 'afterCurrent' as const, label: 'After current tab' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setNewTabPosition(opt.id); persist(NEW_TAB_POSITION_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${newTabPosition === opt.id
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

      {/* Browsing */}
      <SettingsGroup title="Browsing" description="Page behavior & interaction.">
        <div className="space-y-2">
          <SettingToggle
            label="Smooth scrolling"
            desc="Animate scroll transitions for a smoother feel."
            checked={smoothScrolling}
            onChange={(v) => { setSmoothScrolling(v); persist(SMOOTH_SCROLLING_KEY, v); }}
          />
          <SettingToggle
            label="Spell check"
            desc="Underline misspelled words in text fields."
            checked={spellCheck}
            onChange={(v) => { setSpellCheck(v); persist(SPELL_CHECK_KEY, v); }}
          />
          <SettingToggle
            label="Autofill forms"
            desc="Automatically fill in forms with saved data."
            checked={autofill}
            onChange={(v) => { setAutofill(v); persist(AUTOFILL_KEY, v); }}
          />
          <SettingToggle
            label="Middle-click paste & go"
            desc="Paste and navigate when middle-clicking the address bar."
            checked={middleClickPaste}
            onChange={(v) => { setMiddleClickPaste(v); persist(MIDDLE_CLICK_PASTE_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Interface */}
      <SettingsGroup title="Interface" description="Customize the browser chrome.">
        <div className="space-y-2">
          <SettingToggle
            label="Show bookmarks bar"
            desc="Display a bookmarks bar below the address bar."
            checked={showBookmarks}
            onChange={(v) => { setShowBookmarks(v); persist(SHOW_BOOKMARKS_KEY, v); }}
          />
          <SettingToggle
            label="Confirm before closing"
            desc="Ask before closing the browser with multiple tabs open."
            checked={confirmClose}
            onChange={(v) => { setConfirmClose(v); persist(CONFIRM_CLOSE_KEY, v); }}
          />
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">Sidebar position</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Choose which side the sidebar appears on.</div>
            <div className="flex gap-2">
              {([
                { id: 'left' as const, label: 'Left' },
                { id: 'right' as const, label: 'Right' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSidebarPosition(opt.id); persist(SIDEBAR_POSITION_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${sidebarPosition === opt.id
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

      {/* Font Size */}
      <SettingsGroup title="Font Size" description="Adjust the default page text size.">
        <div className="flex gap-2">
          {fontSizeOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setFontSize(opt.id);
                persist(FONT_SIZE_KEY, opt.id);
                document.documentElement.style.fontSize = opt.px;
              }}
              className={`flex-1 rounded-xl py-2.5 text-center text-xs font-medium transition-all duration-150
                ${fontSize === opt.id
                  ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                  : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                }`}
            >
              {opt.label}
            </button>
          ))}
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
