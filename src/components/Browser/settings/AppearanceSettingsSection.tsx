import React, { useCallback, useState } from 'react';
import { solidColorOptions, DEFAULT_WALLPAPER_COLOR } from '@/lib/appearance';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

const UI_DENSITY_KEY = 'settings:uiDensity';
const ANIMATION_SPEED_KEY = 'settings:animationSpeed';
const SHOW_CLOCK_KEY = 'settings:showClock';
const CLOCK_FORMAT_KEY = 'settings:clockFormat';
const SHOW_WEATHER_KEY = 'settings:showWeather';
const SHOW_GREETING_KEY = 'settings:showGreeting';
const TOOLBAR_TRANSPARENCY_KEY = 'settings:toolbarTransparency';
const ROUNDED_CORNERS_KEY = 'settings:roundedCorners';
const TAB_STYLE_KEY = 'settings:tabStyle';

const storageGet = (key: string, fallback: any) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

interface AppearanceSettingsSectionProps {
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  wallpaperColor: string;
  onWallpaperColorChange: (color: string) => void;
  backgroundType: 'wallpaper' | 'solid';
  onBackgroundTypeChange: (type: 'wallpaper' | 'solid') => void;
  wallpaperBlur: boolean;
  onWallpaperBlurChange: (blur: boolean) => void;
}

export const AppearanceSettingsSection: React.FC<
  AppearanceSettingsSectionProps
> = ({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  wallpaperBlur,
  onWallpaperBlurChange
}) => {
  const hasWallpaper = Boolean(wallpaper);
  const activeWallpaper =
    backgroundType === 'wallpaper' ? wallpaper : '';
  const activeColor =
    backgroundType === 'solid' ? wallpaperColor : '';

  const persist = useCallback((key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() =>
    storageGet(UI_DENSITY_KEY, 'comfortable')
  );
  const [animationSpeed, setAnimationSpeed] = useState<'none' | 'fast' | 'normal' | 'slow'>(() =>
    storageGet(ANIMATION_SPEED_KEY, 'normal')
  );
  const [showClock, setShowClock] = useState(() => storageGet(SHOW_CLOCK_KEY, true));
  const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(() =>
    storageGet(CLOCK_FORMAT_KEY, '24h')
  );
  const [showWeather, setShowWeather] = useState(() => storageGet(SHOW_WEATHER_KEY, true));
  const [showGreeting, setShowGreeting] = useState(() => storageGet(SHOW_GREETING_KEY, true));
  const [toolbarTransparency, setToolbarTransparency] = useState(() => storageGet(TOOLBAR_TRANSPARENCY_KEY, true));
  const [roundedCorners, setRoundedCorners] = useState(() => storageGet(ROUNDED_CORNERS_KEY, true));
  const [tabStyle, setTabStyle] = useState<'pill' | 'underline' | 'block'>(() =>
    storageGet(TAB_STYLE_KEY, 'pill')
  );

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Background */}
      <SettingsGroup title="Background">
        <div className="py-4 overflow-x-hidden">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="w-[120px]" />

              <div className="flex items-center rounded-xl bg-[color:var(--ui-hover-strong)] p-1">
                {(['wallpaper', 'solid'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onBackgroundTypeChange(type)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                      backgroundType === type
                        ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                        : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                    }`}
                  >
                    {type === 'wallpaper' ? 'Wallpaper' : 'Solid'}
                  </button>
                ))}
              </div>

              <div className="w-[120px] flex justify-end">
                {backgroundType === 'wallpaper' && hasWallpaper && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[color:var(--ui-text-muted)]">
                        Blur
                      </span>
                      <ToggleSwitch
                        checked={wallpaperBlur}
                        onChange={onWallpaperBlurChange}
                        ariaLabel="Toggle blur effect"
                      />
                    </div>
                    <span className="text-[11px] leading-snug text-right text-[color:var(--ui-text-subtle)]">
                      Improves readability
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto w-full max-w-2xl overflow-x-hidden">
              <div className="relative isolate aspect-video overflow-hidden rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)]">
                {activeWallpaper ? (
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                      wallpaperBlur ? 'scale-105 blur-sm' : ''
                    }`}
                    style={{
                      backgroundImage: `url(${activeWallpaper})`
                    }}
                  />
                ) : activeColor ? (
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: activeColor }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-sm text-[color:var(--ui-text-muted)]">
                        No {backgroundType} selected
                      </p>
                      <p className="text-xs text-[color:var(--ui-text-subtle)]">
                        Choose one below to customize your background
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {backgroundType === 'wallpaper' && (
                <div className="mx-auto flex max-w-md items-center justify-center gap-3">
                  <label className="cursor-pointer rounded-lg bg-[color:var(--ui-accent)] px-4 py-2.5 text-sm font-medium text-[color:var(--ui-accent-contrast)] transition hover:opacity-90">
                    {hasWallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            onWallpaperChange(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {hasWallpaper && (
                    <button
                      onClick={() => onWallpaperChange('')}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium transition hover:bg-[color:var(--ui-hover)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {backgroundType === 'solid' && (
                <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
                  {solidColorOptions.map((color) => {
                    const isDefault = color === 'default';
                    const isSelected = isDefault
                      ? wallpaperColor === DEFAULT_WALLPAPER_COLOR
                      : wallpaperColor === color;

                    return (
                      <button
                        key={color}
                        onClick={() =>
                          onWallpaperColorChange(
                            isDefault ? DEFAULT_WALLPAPER_COLOR : color
                          )
                        }
                        className={`relative h-6 w-6 rounded-full border transition ${
                          isSelected
                            ? 'border-[color:var(--ui-ring)] ring-2 ring-[color:var(--ui-ring)]'
                            : 'border-[color:var(--ui-border)] hover:border-[color:var(--ui-ring)]'
                        }`}
                        style={{
                          backgroundColor: isDefault
                            ? DEFAULT_WALLPAPER_COLOR
                            : color
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* UI Chrome */}
      <SettingsGroup title="Interface Chrome" description="Customize the browser window appearance.">
        <div className="space-y-2">
          <SettingToggle
            label="Transparent toolbar"
            desc="Make the toolbar blend with the background."
            checked={toolbarTransparency}
            onChange={(v) => { setToolbarTransparency(v); persist(TOOLBAR_TRANSPARENCY_KEY, v); }}
          />
          <SettingToggle
            label="Rounded corners"
            desc="Use rounded corners throughout the interface."
            checked={roundedCorners}
            onChange={(v) => { setRoundedCorners(v); persist(ROUNDED_CORNERS_KEY, v); }}
          />
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">Tab style</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Choose how active tabs are indicated.</div>
            <div className="flex gap-2">
              {([
                { id: 'pill' as const, label: 'Pill' },
                { id: 'underline' as const, label: 'Underline' },
                { id: 'block' as const, label: 'Block' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setTabStyle(opt.id); persist(TAB_STYLE_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${tabStyle === opt.id
                      ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                      : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
            <div className="text-sm font-medium text-[color:var(--ui-text)]">UI density</div>
            <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Adjust spacing throughout the interface.</div>
            <div className="flex gap-2">
              {([
                { id: 'compact' as const, label: 'Compact' },
                { id: 'comfortable' as const, label: 'Comfortable' },
                { id: 'spacious' as const, label: 'Spacious' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setUiDensity(opt.id); persist(UI_DENSITY_KEY, opt.id); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${uiDensity === opt.id
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

      {/* New Tab Page */}
      <SettingsGroup title="New Tab Page" description="Customize what shows on new tabs.">
        <div className="space-y-2">
          <SettingToggle
            label="Show clock"
            desc="Display a clock on the new tab page."
            checked={showClock}
            onChange={(v) => { setShowClock(v); persist(SHOW_CLOCK_KEY, v); }}
          />
          {showClock && (
            <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
              <div className="text-sm font-medium text-[color:var(--ui-text)]">Clock format</div>
              <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Choose between 12-hour and 24-hour clock.</div>
              <div className="flex gap-2">
                {([
                  { id: '12h' as const, label: '12-hour' },
                  { id: '24h' as const, label: '24-hour' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setClockFormat(opt.id); persist(CLOCK_FORMAT_KEY, opt.id); }}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150
                      ${clockFormat === opt.id
                        ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                        : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SettingToggle
            label="Show weather"
            desc="Display current weather conditions on the new tab page."
            checked={showWeather}
            onChange={(v) => { setShowWeather(v); persist(SHOW_WEATHER_KEY, v); }}
          />
          <SettingToggle
            label="Show greeting"
            desc="Display a time-based greeting message."
            checked={showGreeting}
            onChange={(v) => { setShowGreeting(v); persist(SHOW_GREETING_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Animations */}
      <SettingsGroup title="Animations" description="Control transitions and motion effects.">
        <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3">
          <div className="text-sm font-medium text-[color:var(--ui-text)]">Animation speed</div>
          <div className="text-xs text-[color:var(--ui-text-muted)] mb-2">Adjust the speed of UI transitions.</div>
          <div className="flex gap-2">
            {([
              { id: 'none' as const, label: 'Off' },
              { id: 'fast' as const, label: 'Fast' },
              { id: 'normal' as const, label: 'Normal' },
              { id: 'slow' as const, label: 'Slow' },
            ]).map(opt => (
              <button
                key={opt.id}
                onClick={() => { setAnimationSpeed(opt.id); persist(ANIMATION_SPEED_KEY, opt.id); }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-150
                  ${animationSpeed === opt.id
                    ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                    : 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                  }`}
              >
                {opt.label}
              </button>
            ))}
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
