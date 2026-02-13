import React, { useMemo } from 'react';
import { HistoryItem } from '@/lib/types';

interface HistoryPageProps {
  items?: HistoryItem[];
  onClear?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ items = [], onClear }) => {
  const hasItems = items.length > 0;
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.timestamp - a.timestamp),
    [items]
  );

  const openEntry = (url: string) => {
    window.dispatchEvent(
      new CustomEvent('browser-suggestion-commit', {
        detail: { value: url }
      })
    );
  };

  return (
    <div className="h-full w-full overflow-hidden p-2">
      <div className="h-full flex flex-col rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-lg border border-[color:var(--ui-border)]">
        {/* Header */}
        <div className="shrink-0 px-8 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[color:var(--ui-text)] tracking-tight">
                History
              </h1>
              <p className="text-xs text-[color:var(--ui-text-muted)] mt-0.5">
                {hasItems ? `${items.length} visited pages` : 'No history yet'}
              </p>
            </div>
            {hasItems && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all duration-150 active:scale-[0.97]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {!hasItems && (
            <div className="pt-12 text-center">
              <div className="text-sm font-medium text-[color:var(--ui-text-muted)]">No history yet</div>
              <div className="mt-1 text-xs text-[color:var(--ui-text-subtle)]">
                Visited pages will appear here as you browse.
              </div>
            </div>
          )}
          {hasItems && (
            <div className="space-y-1 max-w-2xl">
              {sorted.map((item) => {
                const time = new Date(item.timestamp);
                const label = item.title || item.url;
                return (
                  <button
                    key={`${item.url}-${item.timestamp}`}
                    type="button"
                    onClick={() => openEntry(item.url)}
                    className="w-full text-left rounded-xl px-4 py-2.5 hover:bg-[color:var(--ui-hover)] transition-all duration-150 active:scale-[0.995] group"
                  >
                    <div className="text-sm font-medium truncate text-[color:var(--ui-text)]">{label}</div>
                    <div className="mt-0.5 text-xs text-[color:var(--ui-text-muted)] flex items-center gap-2">
                      <span className="truncate opacity-70">{item.url}</span>
                      <span className="shrink-0 text-[color:var(--ui-text-subtle)] ml-auto">
                        {time.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
