import React, { memo, useLayoutEffect, useRef } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuPanelLeft,
  LuPlus,
  LuRotateCw,
  LuX,
  LuShield
} from 'react-icons/lu';
import { WindowControls } from '@/components/Browser/WindowControls';
import { IconButton } from '@/components/ui/IconButton';

interface BrowserToolbarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onStop: () => void;
  loading: boolean;
  onNewTab: () => void;
  onShieldLayout?: (rect: DOMRect) => void;
  onShieldClick?: () => void;
  shieldActive?: boolean;
  onShieldRef?: (node: HTMLDivElement | null) => void;
}

export const BrowserToolbar = memo<BrowserToolbarProps>(
  ({
    sidebarOpen,
    onSidebarToggle,
    canGoBack,
    canGoForward,
    onGoBack,
    onGoForward,
    onReload,
    onStop,
    loading,
    onNewTab,
    onShieldLayout,
    onShieldClick,
    shieldActive,
    onShieldRef
  }) => {
    const shieldRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      if (!onShieldLayout) return;
      const update = () => {
        const node = shieldRef.current;
        if (!node) return;
        onShieldLayout(node.getBoundingClientRect());
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, [onShieldLayout]);

    useLayoutEffect(() => {
      if (!onShieldRef) return;
      onShieldRef(shieldRef.current);
      return () => onShieldRef(null);
    }, [onShieldRef]);

    return (
      <div className="h-[32px] flex items-center w-full electron-no-drag relative">
        <div className="flex items-center z-10">
          <div className="flex items-center gap-0.5 pl-1">
            <IconButton onClick={onSidebarToggle} active={sidebarOpen} aria-label="Toggle sidebar">
              <LuPanelLeft size={16} />
            </IconButton>
            <IconButton disabled={!canGoBack} onClick={onGoBack} aria-label="Back">
              <LuChevronLeft size={16} />
            </IconButton>
            <IconButton disabled={!canGoForward} onClick={onGoForward} aria-label="Forward">
              <LuChevronRight size={16} />
            </IconButton>
            <IconButton
              onClick={loading ? onStop : onReload}
              aria-label={loading ? 'Stop loading' : 'Reload'}
            >
              {loading ? <LuX size={14} /> : <LuRotateCw size={14} />}
            </IconButton>
          </div>
        </div>

        <div className="flex items-center gap-0.5 justify-end ml-auto z-10">
          <IconButton onClick={onNewTab} aria-label="New tab">
            <LuPlus size={15} />
          </IconButton>
          <div className="relative" ref={shieldRef}>
            <IconButton onClick={onShieldClick} active={shieldActive} aria-label="Privacy shield">
              <LuShield size={15} />
            </IconButton>
          </div>

          <div className="ml-1 pl-1 self-start">
            <WindowControls />
          </div>
        </div>
      </div>
    );
  }
);

BrowserToolbar.displayName = 'BrowserToolbar';
