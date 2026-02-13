import React, { useCallback, useState } from 'react';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { PermissionType } from '@/lib/types';

const DO_NOT_TRACK_KEY = 'settings:doNotTrack';
const BLOCK_THIRD_PARTY_COOKIES_KEY = 'settings:blockThirdPartyCookies';
const HTTPS_ONLY_KEY = 'settings:httpsOnly';
const BLOCK_POPUPS_KEY = 'settings:blockPopups';
const SAFE_BROWSING_KEY = 'settings:safeBrowsing';
const FINGERPRINT_PROTECTION_KEY = 'settings:fingerprintProtection';
const BLOCK_CRYPTO_MINING_KEY = 'settings:blockCryptoMining';
const CLEAR_ON_EXIT_KEY = 'settings:clearOnExit';
const BLOCK_AUTOPLAY_KEY = 'settings:blockAutoplay';

const storageGet = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

interface PrivacySettingsSectionProps {
  adBlockEnabled: boolean;
  onAdBlockEnabledChange: (enabled: boolean) => void;
  permissions?: Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>;
  onPermissionsChange?: (permissions: Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>) => void;
}

const getPermissionDisplayName = (type: PermissionType): string => {
  switch (type) {
    case PermissionType.GEOLOCATION:
      return 'Location';
    case PermissionType.MICROPHONE:
      return 'Microphone';
    case PermissionType.CAMERA:
      return 'Camera';
    case PermissionType.NOTIFICATIONS:
      return 'Notifications';
    case PermissionType.CLIPBOARD_READ:
      return 'Clipboard (read)';
    case PermissionType.CLIPBOARD_WRITE:
      return 'Clipboard (write)';
    default:
      return type;
  }
};

export const PrivacySettingsSection: React.FC<PrivacySettingsSectionProps> = ({
  adBlockEnabled,
  onAdBlockEnabledChange,
  permissions = {},
  onPermissionsChange
}) => {
  const persist = useCallback((key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, []);

  const [doNotTrack, setDoNotTrack] = useState(() => storageGet(DO_NOT_TRACK_KEY, true));
  const [blockThirdParty, setBlockThirdParty] = useState(() => storageGet(BLOCK_THIRD_PARTY_COOKIES_KEY, true));
  const [httpsOnly, setHttpsOnly] = useState(() => storageGet(HTTPS_ONLY_KEY, false));
  const [blockPopups, setBlockPopups] = useState(() => storageGet(BLOCK_POPUPS_KEY, true));
  const [safeBrowsing, setSafeBrowsing] = useState(() => storageGet(SAFE_BROWSING_KEY, true));
  const [fingerprintProtection, setFingerprintProtection] = useState(() => storageGet(FINGERPRINT_PROTECTION_KEY, false));
  const [blockCryptoMining, setBlockCryptoMining] = useState(() => storageGet(BLOCK_CRYPTO_MINING_KEY, true));
  const [clearOnExit, setClearOnExit] = useState(() => storageGet(CLEAR_ON_EXIT_KEY, false));
  const [blockAutoplay, setBlockAutoplay] = useState(() => storageGet(BLOCK_AUTOPLAY_KEY, false));

  const handleResetPermissions = useCallback(() => {
    onPermissionsChange?.({});
  }, [onPermissionsChange]);

  return (
    <div className="space-y-8">
      {/* Content blocking */}
      <SettingsGroup title="Content Blocking" description="Control ads, trackers, and other unwanted content.">
        <div className="space-y-2">
          <SettingToggle
            label="Ad & tracker blocker"
            desc="Block ads and cross-site trackers using built-in filter lists."
            checked={adBlockEnabled}
            onChange={onAdBlockEnabledChange}
          />
          <SettingToggle
            label="Block pop-up windows"
            desc="Prevent websites from opening unwanted pop-up windows."
            checked={blockPopups}
            onChange={(v) => { setBlockPopups(v); persist(BLOCK_POPUPS_KEY, v); }}
          />
          <SettingToggle
            label="Block autoplay media"
            desc="Prevent audio & video from playing automatically."
            checked={blockAutoplay}
            onChange={(v) => { setBlockAutoplay(v); persist(BLOCK_AUTOPLAY_KEY, v); }}
          />
          <SettingToggle
            label="Block cryptocurrency miners"
            desc="Stop websites from using your CPU for mining."
            checked={blockCryptoMining}
            onChange={(v) => { setBlockCryptoMining(v); persist(BLOCK_CRYPTO_MINING_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Tracking protection */}
      <SettingsGroup title="Tracking Protection" description="Limit how websites track you across the web.">
        <div className="space-y-2">
          <SettingToggle
            label="Send Do Not Track header"
            desc="Ask websites not to track your browsing activity."
            checked={doNotTrack}
            onChange={(v) => { setDoNotTrack(v); persist(DO_NOT_TRACK_KEY, v); }}
          />
          <SettingToggle
            label="Block third-party cookies"
            desc="Prevent trackers from storing cookies across sites."
            checked={blockThirdParty}
            onChange={(v) => { setBlockThirdParty(v); persist(BLOCK_THIRD_PARTY_COOKIES_KEY, v); }}
          />
          <SettingToggle
            label="Fingerprint protection"
            desc="Reduce browser fingerprinting by randomizing identifiers."
            checked={fingerprintProtection}
            onChange={(v) => { setFingerprintProtection(v); persist(FINGERPRINT_PROTECTION_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Security */}
      <SettingsGroup title="Security" description="Protect yourself from malicious content.">
        <div className="space-y-2">
          <SettingToggle
            label="HTTPS-only mode"
            desc="Automatically upgrade connections to HTTPS where possible."
            checked={httpsOnly}
            onChange={(v) => { setHttpsOnly(v); persist(HTTPS_ONLY_KEY, v); }}
          />
          <SettingToggle
            label="Safe browsing"
            desc="Warn before visiting known dangerous websites."
            checked={safeBrowsing}
            onChange={(v) => { setSafeBrowsing(v); persist(SAFE_BROWSING_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Data cleanup */}
      <SettingsGroup title="On Exit" description="What to clean up when the browser closes.">
        <div className="space-y-2">
          <SettingToggle
            label="Clear browsing data on exit"
            desc="Automatically erase history, cookies, and cache when closing."
            checked={clearOnExit}
            onChange={(v) => { setClearOnExit(v); persist(CLEAR_ON_EXIT_KEY, v); }}
          />
        </div>
      </SettingsGroup>

      {/* Permissions */}
      <SettingsGroup title="Site Permissions" description="Manage per-site access to hardware and APIs.">
        <div className="space-y-3">
          {Object.entries(permissions).length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleResetPermissions}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all duration-150 active:scale-[0.97]"
              >
                Reset all permissions
              </button>
            </div>
          )}
          {Object.entries(permissions).map(([origin, perms]) => (
            <div key={origin} className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-4">
              <div className="text-sm font-medium text-[color:var(--ui-text)] mb-3">
                {origin}
              </div>
              <div className="space-y-2">
                {(perms as { type: PermissionType; allowed: boolean; ask: boolean }[]).map((perm) => (
                  <div key={perm.type} className="flex items-center justify-between">
                    <div className="text-sm text-[color:var(--ui-text)]">
                      {getPermissionDisplayName(perm.type)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${perm.allowed ? 'text-green-500' : 'text-red-400'}`}>
                        {perm.allowed ? 'Allowed' : 'Blocked'}
                      </span>
                      <ToggleSwitch
                        checked={perm.allowed}
                        onChange={(allowed) => {
                          const newPerms = { ...permissions };
                          newPerms[origin] = newPerms[origin].map(p =>
                            p.type === perm.type ? { ...p, allowed } : p
                          );
                          onPermissionsChange?.(newPerms);
                        }}
                        ariaLabel={`Toggle ${getPermissionDisplayName(perm.type)} for ${origin}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(permissions).length === 0 && (
            <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-6 text-center">
              <div className="text-sm text-[color:var(--ui-text-muted)]">No site permissions granted yet</div>
              <div className="text-xs text-[color:var(--ui-text-subtle)] mt-1">Permissions will appear here as websites request them.</div>
            </div>
          )}
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
