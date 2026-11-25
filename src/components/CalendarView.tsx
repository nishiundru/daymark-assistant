import {
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
  CalendarAnalysisReport,
  CalendarEvent,
  PermissionSettings,
  TaskItem,
} from '../types';
import { analyzeCalendarRequest } from '../utils/assistantClient';

interface CalendarViewProps {
  events: CalendarEvent[];
  analysis: CalendarAnalysisReport;
  tasks: TaskItem[];
  permissions: PermissionSettings;
  onUpdateAnalysis: (report: CalendarAnalysisReport) => void;
  onStageCalendarHold: (title: string, slot: string, note: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenPrivacy: () => void;
}

export function CalendarView({
  events,
  analysis,
  tasks,
  permissions,
  onUpdateAnalysis,
  onStageCalendarHold,
  onOpenTask,
  onOpenPrivacy,
}: CalendarViewProps) {
  const [focusGoal, setFocusGoal] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPaused = permissions.calendar === 'paused';

  // Group events cleanly by dayLabel preserving chronological order
  const groupedDays: Array<{ dayLabel: string; items: CalendarEvent[] }> = [];
  for (const ev of events) {
    const existing = groupedDays.find((g) => g.dayLabel === ev.dayLabel);
    if (existing) {
      existing.items.push(ev);
    } else {
      groupedDays.push({ dayLabel: ev.dayLabel, items: [ev] });
    }
  }

  const pendingAppointments = tasks
    .filter((t) => t.status === 'waiting' && t.payload.kind === 'appointment')
    .map((t) => ({
      title: t.title,
      counterparty: t.counterparty,
      details: t.payload,
    }));

  const handleAnalyzeSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const { analysis: a } = await analyzeCalendarRequest({
        events,
        pendingAppointments,
        focusGoal:
          focusGoal.trim() ||
          'Check my upcoming week for travel buffer risks, overlapping options, and the best free windows for errands.',
        calendarPermission: permissions.calendar,
      });
      onUpdateAnalysis({
        briefSummary: a.briefSummary,
        analyzedAt: `Analyzed just now (${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })})`,
        conflicts: Array.isArray(a.conflicts) ? a.conflicts : [],
        recommendedWindows: Array.isArray(a.recommendedWindows) ? a.recommendedWindows : [],
        suggestedHoldTitle: a.suggestedHoldTitle,
        suggestedHoldSlot: a.suggestedHoldSlot,
        suggestedHoldNote: a.suggestedHoldNote,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to analyze calendar.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Calendar & schedule analysis
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
          See how Daymark reads your availability, spots back-to-back travel conflicts, and selects
          open windows for incoming appointment requests.
        </p>
      </div>

      {isPaused && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-[var(--color-warn)]/40 bg-[var(--color-warn-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-[var(--color-ink)]">Calendar analysis is paused</p>
              <p className="text-[var(--color-ink-muted)]">
                Daymark will not inspect your upcoming schedule or propose appointment times until
                you resume Calendar access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="inline-flex h-9 shrink-0 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
          >
            Resume in Privacy
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Day-by-day Schedule */}
        <section aria-labelledby="schedule-grid-heading" className="space-y-4 lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <h2 id="schedule-grid-heading" className="text-lg font-semibold text-[var(--color-ink)]">
              Upcoming schedule (Nov 24 to Dec 4)
            </h2>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {permissions.calendar.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="divide-y divide-[var(--color-rule)] rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
            {groupedDays.map((day) => (
              <div key={day.dayLabel} className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">{day.dayLabel}</h3>
                <ul className="space-y-3">
                  {day.items.map((ev) => (
                    <li
                      key={ev.id}
                      className={`rounded-md border px-4 py-3 ${
                        ev.kind === 'proposed'
                          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]'
                          : ev.conflictNote
                            ? 'border-[var(--color-warn)]/40 bg-[var(--color-warn-soft)]'
                            : 'border-[var(--color-rule)] bg-[var(--color-paper)]/60'
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="font-mono-tabular text-xs font-medium text-[var(--color-ink-muted)]">
                              {ev.startTime} to {ev.endTime}
                            </span>
                            <span className="text-xs text-[var(--color-ink-subtle)]">
                              {ev.location}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {ev.title}
                          </p>
                        </div>

                        {ev.linkedTaskId && (
                          <button
                            type="button"
                            onClick={() => onOpenTask(ev.linkedTaskId!)}
                            className="inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0 cursor-pointer sm:self-center"
                          >
                            <span>Review hold</span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {ev.assistantNote && (
                        <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                          Daymark note: {ev.assistantNote}
                        </p>
                      )}
                      {ev.conflictNote && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-warn)]">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{ev.conflictNote}</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Live Daymark Calendar Analysis */}
        <section aria-labelledby="analysis-heading" className="space-y-4 lg:col-span-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="analysis-heading" className="text-lg font-semibold text-[var(--color-ink)]">
              Daymark schedule analysis
            </h2>
            <span className="font-mono-tabular text-xs text-[var(--color-ink-subtle)]">
              {analysis.analyzedAt}
            </span>
          </div>

          <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 space-y-5">
            {/* Ask Daymark to analyze */}
            <form onSubmit={handleAnalyzeSchedule} className="space-y-2.5">
              <label
                htmlFor="calendar-goal-input"
                className="block text-xs font-medium text-[var(--color-ink-muted)]"
              >
                Ask Daymark to check your schedule
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="calendar-goal-input"
                  type="text"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(e.target.value)}
                  disabled={isPaused}
                  placeholder="e.g., Find 60 mins for an oil change before Dec 2"
                  className="h-10 flex-1 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)]"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing || isPaused}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white whitespace-nowrap shrink-0 hover:bg-[var(--color-accent-hover)] cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span>Analyze week</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Summary */}
            <div className="border-t border-[var(--color-rule)] pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Summary</h3>
              <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {analysis.briefSummary}
              </p>
            </div>

            {/* Conflicts / Tight Buffers */}
            <div className="border-t border-[var(--color-rule)] pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Conflicts & tight buffers ({analysis.conflicts.length})
              </h3>
              {analysis.conflicts.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No overlapping events or tight buffers found.
                </p>
              ) : (
                <ul className="space-y-3">
                  {analysis.conflicts.map((conflict, idx) => (
                    <li
                      key={`${conflict.dateLabel}-${idx}`}
                      className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 text-sm space-y-1"
                    >
                      <p className="font-semibold text-[var(--color-warn)]">{conflict.dateLabel}</p>
                      <p className="text-[var(--color-ink)]">{conflict.issue}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Suggestion: {conflict.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recommended Open Windows */}
            <div className="border-t border-[var(--color-rule)] pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Recommended open windows
              </h3>
              <ul className="space-y-2.5">
                {analysis.recommendedWindows.map((win, idx) => (
                  <li
                    key={`${win.dayLabel}-${idx}`}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CalendarIcon
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">
                        {win.dayLabel}, {win.timeWindow}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{win.bestFor}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable suggested hold if Gemini proposed one */}
            {analysis.suggestedHoldTitle && analysis.suggestedHoldSlot && (
              <div className="border-t border-[var(--color-rule)] pt-4 space-y-2.5">
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Suggested calendar hold
                </p>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {analysis.suggestedHoldTitle} ({analysis.suggestedHoldSlot})
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onStageCalendarHold(
                      analysis.suggestedHoldTitle!,
                      analysis.suggestedHoldSlot!,
                      analysis.suggestedHoldNote || 'Staged from calendar analysis.'
                    )
                  }
                  className="inline-flex h-9 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                >
                  Stage hold in Approvals
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
