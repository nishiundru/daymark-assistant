import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavTab } from '../types';

interface TopBarProps {
  activeTab: NavTab;
  waitingCount: number;
  onSelectTab: (tab: NavTab) => void;
  onReviewNext: () => void;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string }> = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'mail', label: 'Mail' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'queue', label: 'Approvals' },
  { id: 'privacy', label: 'Privacy' },
];

export function TopBar({ activeTab, waitingCount, onSelectTab, onReviewNext }: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('briefing')}
          aria-label="Daymark briefing home"
          className="text-lg font-semibold tracking-tight text-[var(--color-ink)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Daymark
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const displayLabel =
              item.id === 'queue' && waitingCount > 0
                ? `${item.label} (${waitingCount})`
                : item.label;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[var(--color-accent)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onReviewNext();
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 hover:bg-[var(--color-accent-hover)]"
          >
            {waitingCount > 0 ? 'Review next item' : 'Open approvals'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[var(--color-rule)] bg-[var(--color-surface)] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const displayLabel =
                item.id === 'queue' && waitingCount > 0
                  ? `${item.label} (${waitingCount})`
                  : item.label;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium cursor-pointer transition-colors duration-150 ${
                    isActive
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
