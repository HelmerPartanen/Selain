import React, { memo, useCallback } from 'react';
import { LuX, LuGlobe } from 'react-icons/lu';
import { Tab } from '@/lib/types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string, e: React.MouseEvent) => void;
  orientation?: 'horizontal' | 'vertical';
  doubleClickClose?: boolean;
  tabStyle?: 'pill' | 'underline' | 'block';
  tabHoverPreview?: boolean;
}

export const TabBar = memo<TabBarProps>(({
  tabs,
  activeTabId,
  onSwitch,
  onClose,
  orientation = 'horizontal',
  doubleClickClose = false,
  tabStyle = 'pill',
  tabHoverPreview = true
}) => {
  const isVertical = orientation === 'vertical';

  const handleDoubleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (doubleClickClose) {
        onClose(id, e);
      }
    },
    [doubleClickClose, onClose]
  );

  const getTabStyleClasses = (isActive: boolean) => {
    switch (tabStyle) {
      case 'underline':
        return isActive
          ? 'border-b-2 border-[color:var(--ui-accent)] text-[color:var(--ui-text)] rounded-none backdrop-blur-lg'
          : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] rounded-none';
      case 'block':
        return isActive
          ? 'bg-[color:var(--ui-surface)] text-[color:var(--ui-text)] rounded-lg shadow-sm backdrop-blur-lg'
          : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] rounded-lg';
      case 'pill':
      default:
        return isActive
          ? 'bg-[color:var(--ui-surface)] shadow-sm text-[color:var(--ui-text)] rounded-full backdrop-blur-lg'
          : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] rounded-full';
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={[
        "electron-no-drag mb-1",
        isVertical
          ? "flex flex-col gap-1 overflow-y-auto no-scrollbar"
          : "flex items-center h-[32px] space-x-1 overflow-x-auto no-scrollbar mx-2 p-0.5"
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            onDoubleClick={(e) => handleDoubleClick(tab.id, e)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSwitch(tab.id);
              }
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-label={tab.title || tab.url}
            title={tabHoverPreview ? `${tab.title}\n${tab.url}` : undefined}
            className={`
              group relative flex items-center px-2.5 text-xs select-none cursor-pointer transition-all duration-200
              ${isVertical ? 'w-full h-9' : 'min-w-[140px] max-w-[240px] flex-1 h-full'}
              ${getTabStyleClasses(isActive)}
            `}
          >
            {}
            <div className="mr-2 flex-shrink-0">
               {tab.favicon ? (
                 <img src={tab.favicon} alt="" className="w-3.5 h-3.5 opacity-80" />
               ) : (
                 <span className="opacity-50"><LuGlobe size={14} /></span>
               )}
            </div>
            {tab.loading && (
              <div className="mr-2 flex h-3 w-3 items-center justify-center">
                <div className="h-3 w-3 animate-spin rounded-full border border-[color:var(--ui-border)] border-t-[color:var(--ui-accent)]" />
              </div>
            )}

            {}
            <span className="truncate flex-1 font-medium">{tab.title}</span>

            {}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id, e);
              }}
              aria-label={`Close ${tab.title || tab.url}`}
              className={`
                ml-1 rounded-full p-0.5 hover:bg-[color:var(--ui-hover)]
                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                transition-opacity
              `}
            >
              <span className="text-[color:var(--ui-text-subtle)]"><LuX size={14} /></span>
            </button>
            
            {}
            {!isVertical && !isActive && (
              <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-[color:var(--ui-border)] group-hover:hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
});

TabBar.displayName = 'TabBar';
