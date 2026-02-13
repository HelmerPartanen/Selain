import React, { useEffect, useState, memo, useRef } from 'react';
import { SearchEngine } from '@/lib/types';
import { AppearanceSettingsSection } from './settings/AppearanceSettingsSection';
import { SearchSettingsSection } from './settings/SearchSettingsSection';
import { PrivacySettingsSection } from './settings/PrivacySettingsSection';
import { GeneralSettingsSection } from './settings/GeneralSettingsSection';
import { AdvancedSettingsSection } from './settings/AdvancedSettingsSection';
import { WidgetsSettingsSection } from './settings/WidgetsSettingsSection';

type SettingsSection =
  | 'general'
  | 'appearance'
  | 'widgets'
  | 'search'
  | 'privacy'
  | 'advanced';

const sectionTitles: Record<SettingsSection, { title: string; subtitle: string }> = {
  general: { title: 'General', subtitle: 'Startup, behavior & defaults' },
  appearance: { title: 'Appearance', subtitle: 'Background, colors & theme' },
  widgets: { title: 'Widgets', subtitle: 'Weather location & new tab' },
  search: { title: 'Search Engine', subtitle: 'Choose your default search' },
  privacy: { title: 'Privacy', subtitle: 'Ad blocking & permissions' },
  advanced: { title: 'Advanced', subtitle: 'Developer options' },
};

export const SettingsPage = memo(({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  adBlockEnabled,
  onAdBlockEnabledChange,
  permissions,
  onPermissionsChange,
  searchEngine,
  onSearchEngineChange,
  initialSection,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onClose,
  subsection
}: any) => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection ?? 'appearance');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
  }, [initialSection]);

  // Scroll to top on section change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const info = sectionTitles[activeSection];

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-8 pt-6 pb-4">
          <div className="max-w-3xl mx-auto w-full transition-all duration-200 ease-out">
            <h1 className="text-lg font-semibold text-[color:var(--ui-text)] tracking-tight">
              {info.title}
            </h1>
            <p className="text-xs text-[color:var(--ui-text-muted)] mt-0.5">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 pb-28"
        >
          <div className="max-w-3xl mx-auto w-full">
            {activeSection === 'appearance' && (
              <AppearanceSettingsSection
                wallpaper={wallpaper}
                onWallpaperChange={onWallpaperChange}
                wallpaperColor={wallpaperColor}
                onWallpaperColorChange={onWallpaperColorChange}
                backgroundType={backgroundType}
                onBackgroundTypeChange={onBackgroundTypeChange}
                wallpaperBlur={wallpaperBlur}
                onWallpaperBlurChange={onWallpaperBlurChange}
              />
            )}

            {activeSection === 'search' && (
              <SearchSettingsSection
                searchEngine={searchEngine}
                onSearchEngineChange={onSearchEngineChange}
              />
            )}

            {activeSection === 'privacy' && (
              <PrivacySettingsSection
                adBlockEnabled={adBlockEnabled}
                onAdBlockEnabledChange={onAdBlockEnabledChange}
                permissions={permissions}
                onPermissionsChange={onPermissionsChange}
              />
            )}

            {activeSection === 'general' && <GeneralSettingsSection />}
            {activeSection === 'widgets' && <WidgetsSettingsSection />}
            {activeSection === 'advanced' && <AdvancedSettingsSection />}
          </div>
        </div>

        {/* Save bar — always mounted, animated via CSS transitions */}
        <div
          className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hasUnsavedChanges
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 rounded-full bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] px-5 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <span className="text-xs text-[color:var(--ui-text-muted)]">
              Unsaved changes
            </span>
            <button
              onClick={onSave}
              disabled={isSaving}
              tabIndex={hasUnsavedChanges ? 0 : -1}
              className="rounded-full bg-[color:var(--ui-accent)] px-4 py-1.5 text-xs font-semibold text-[color:var(--ui-accent-contrast)] transition-all duration-150 hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsPage.displayName = 'SettingsPage';
