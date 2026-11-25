import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useState } from 'react';
import { ActivityEntry, ActivityType } from '../types';

interface ActivityViewProps {
  activity: ActivityEntry[];
  onOpenTask?: (taskId: string) => void;
}

const FILTER_OPTIONS: Array<{ id: 'all' | ActivityType; label: string }> = [
  { id: 'all', label: 'All entries' },
  { id: 'approved', label: 'Approved actions' },
  { id: 'prep', label: 'Read-only prep' },
  { id: 'decision', label: 'Snoozed & rejected' },
  { id: 'privacy', label: 'Privacy changes' },
];

function getActivityTypeLabel(type: ActivityType): { text: string; tone: string } {
  switch (type) {
    case 'approved':
      return { text: 'Approved & simulated', tone: 'text-[var(--color-accent)]' };
    case 'prep':
      return { text: 'Read-only prep', tone: 'text-[var(--color-ink-muted)]' };
    case 'decision':
      return { text: 'User decision', tone: 'text-[var(--color-warn)]' };
    case 'privacy':
      return { text: 'Access update', tone: 'text-[var(--color-ink)]' };
  }
}

export function ActivityView({ activity, onOpenTask }: ActivityViewProps) {
  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = activity.filter((entry) => {
    const matchesType = filter === 'all' || entry.type === filter;
    const matchesQuery =
      !normalizedQuery ||
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.detail.toLowerCase().includes(normalizedQuery) ||
      entry.simulatedOutcome.toLowerCase().includes(normalizedQuery);
    return matchesType && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Activity log
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
          A transparent record of everything Daymark prepared in read-only mode and every action you
          approved, snoozed, or declined.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter activity log"
          className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-1"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(option.id)}
                className={`min-h-[36px] rounded-md px-3 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <label htmlFor="activity-search" className="sr-only">
            Search activity log
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-subtle)]"
            aria-hidden="true"
          />
          <input
            id="activity-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions or payees"
            className="h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)]"
          />
        </div>
      </div>

      {/* Log List */}
      <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-medium text-[var(--color-ink)]">No matching activity</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Try clearing your search or switching the filter to see all logged entries.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setQuery('');
              }}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {filtered.map((entry) => {
              const typeMeta = getActivityTypeLabel(entry.type);
              const isExpanded = expandedId === entry.id;
              return (
                <li key={entry.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className={`font-semibold ${typeMeta.tone}`}>{typeMeta.text}</span>
                        <span className="font-mono-tabular text-[var(--color-ink-subtle)]">
                          {entry.timestamp}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-[var(--color-ink)]">
                        {entry.title}
                      </h2>
                      <p className="text-sm text-[var(--color-ink-muted)]">{entry.detail}</p>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        Outcome: {entry.simulatedOutcome}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.taskId && onOpenTask && (
                        <button
                          type="button"
                          onClick={() => onOpenTask(entry.taskId!)}
                          className="inline-flex min-h-[36px] items-center rounded-md border border-[var(--color-rule)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                        >
                          View task
                        </button>
                      )}
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2.5 text-xs font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                      >
                        <span>Sources</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-[var(--color-rule)] pt-3 text-xs text-[var(--color-ink-muted)]">
                      <span className="font-medium text-[var(--color-ink)]">
                        Information accessed:{' '}
                      </span>
                      <span>{entry.sourcesUsed.join(', ')}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
