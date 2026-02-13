import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  LuClock,
  LuSettings,
  LuChevronRight,
  LuShield,
  LuSearch,
  LuPaintbrush,
  LuGlobe,
  LuLock,
  LuWrench,
  LuLayoutGrid,
} from "react-icons/lu";
import { IconType } from "react-icons";

interface SidebarProps {
  isOpen: boolean;
  onOpenHistory: () => void;
  onOpenSettings: (section?: string) => void;
  historyActive: boolean;
  settingsActive: boolean;
  settingsSection?: string;
  position?: "left" | "right";
  adBlockEnabled?: boolean;
}

/* ── Shared UI Primitives ─────────────────── */

interface MenuItemProps {
  icon: IconType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  indent?: boolean;
}

const MenuItem = memo(({
  icon: Icon,
  label,
  active = false,
  onClick,
  trailing,
  indent = false,
}: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex items-center w-full gap-3 px-3 py-[7px] rounded-xl text-[13px] font-normal transition-all duration-150 ease-out cursor-default select-none",
      indent ? "pl-9" : "",
      active
        ? "bg-[color:var(--ui-active)] text-[color:var(--ui-text)] font-medium"
        : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)] hover:text-[color:var(--ui-text)]",
    ].join(" ")}
  >
    <Icon size={15} className="shrink-0 opacity-80" />
    <span className="flex-1 truncate text-left">{label}</span>
    {trailing}
  </button>
));
MenuItem.displayName = "MenuItem";

/* ── Collapsible group ─────────────────── */

interface MenuGroupProps {
  icon: IconType;
  label: string;
  active?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const MenuGroup = memo(({ icon: Icon, label, active = false, defaultOpen = false, children }: MenuGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
      const timeout = setTimeout(() => setHeight(undefined), 200);
      return () => clearTimeout(timeout);
    } else {
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  // Auto-open when a child is active
  useEffect(() => {
    if (active && !open) setOpen(true);
  }, [active]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={[
          "flex items-center w-full gap-3 px-3 py-[7px] rounded-xl text-[13px] transition-all duration-150 ease-out cursor-default select-none",
          active
            ? "text-[color:var(--ui-text)] font-medium"
            : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)] hover:text-[color:var(--ui-text)]",
        ].join(" ")}
      >
        <Icon size={15} className="shrink-0 opacity-80" />
        <span className="flex-1 truncate text-left font-medium">{label}</span>
        <LuChevronRight
          size={13}
          className={`shrink-0 opacity-40 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height: height !== undefined ? `${height}px` : "auto" }}
      >
        <div className="pt-0.5 pb-1">{children}</div>
      </div>
    </div>
  );
});
MenuGroup.displayName = "MenuGroup";

/* ── Separator ─────────────────── */

const Separator = () => (
  <div className="my-2 mx-3 h-px bg-[color:var(--ui-border)] opacity-60" />
);

/* ── Main Sidebar ─────────────────── */

export const Sidebar = memo(
  ({
    isOpen,
    onOpenHistory,
    onOpenSettings,
    historyActive,
    settingsActive,
    settingsSection,
    position = "left",
    adBlockEnabled,
  }: SidebarProps) => {
    const isRight = position === "right";

    const handleSettingsClick = useCallback(
      (section?: string) => () => onOpenSettings(section),
      [onOpenSettings]
    );

    return (
      <div
        aria-hidden={!isOpen}
        className={[
          "bg-[color:var(--ui-surface)]/95 backdrop-blur-2xl",
          "flex flex-col relative z-20 self-start overflow-hidden",
          "transition-all duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen
            ? "h-[calc(100%-1rem)] w-[220px] translate-x-0 opacity-100 rounded-2xl my-2 mx-2 shadow-[var(--shadow-lg)]"
            : [
                "h-[calc(100%-1rem)] w-0 opacity-0 pointer-events-none overflow-hidden rounded-2xl my-2 mx-0",
                isRight ? "translate-x-4" : "-translate-x-4",
              ].join(" "),
        ].join(" ")}
      >
        {/* Quick actions */}
        <div className="px-2 pt-3 pb-1">
          <MenuItem
            icon={LuClock}
            label="History"
            active={historyActive}
            onClick={onOpenHistory}
          />
        </div>

        <Separator />

        {/* Settings groups */}
        <div className="px-2 flex-1 overflow-y-auto scrollbar-hide">
          <MenuGroup
            icon={LuSettings}
            label="Settings"
            active={settingsActive}
            defaultOpen={settingsActive}
          >
            <MenuItem
              icon={LuGlobe}
              label="General"
              indent
              active={settingsActive && settingsSection === "general"}
              onClick={handleSettingsClick("general")}
            />
            <MenuItem
              icon={LuPaintbrush}
              label="Appearance"
              indent
              active={settingsActive && settingsSection === "appearance"}
              onClick={handleSettingsClick("appearance")}
            />
            <MenuItem
              icon={LuLayoutGrid}
              label="Widgets"
              indent
              active={settingsActive && settingsSection === "widgets"}
              onClick={handleSettingsClick("widgets")}
            />
            <MenuItem
              icon={LuSearch}
              label="Search Engine"
              indent
              active={settingsActive && settingsSection === "search"}
              onClick={handleSettingsClick("search")}
            />
            <MenuItem
              icon={LuLock}
              label="Privacy"
              indent
              active={settingsActive && settingsSection === "privacy"}
              onClick={handleSettingsClick("privacy")}
            />
            <MenuItem
              icon={LuWrench}
              label="Advanced"
              indent
              active={settingsActive && settingsSection === "advanced"}
              onClick={handleSettingsClick("advanced")}
            />
          </MenuGroup>
        </div>

        {/* Bottom status */}
        <div className="px-3 pb-3 pt-1">
          <Separator />
          <div className="flex items-center gap-2 px-2 py-1.5">
            <LuShield size={13} className="opacity-50 shrink-0" />
            <span className="text-[11px] text-[color:var(--ui-text-subtle)] truncate">
              Ad Block {adBlockEnabled ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

Sidebar.displayName = "Sidebar";
