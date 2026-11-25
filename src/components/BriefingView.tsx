import {
  ArrowRight,
  Calendar,
  Check,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import {
  ActivityEntry,
  AgendaItem,
  BillItem,
  CalendarAnalysisReport,
  CalendarEvent,
  MailMessage,
  NavTab,
  PermissionSettings,
  QueueSubTab,
  TaskCategory,
  TaskItem,
} from '../types';
import { askAssistantRequest } from '../utils/assistantClient';
import { formatCurrency, getCategoryLabel } from '../utils/storage';

interface BriefingViewProps {
  userName: string;
  tasks: TaskItem[];
  mails: MailMessage[];
  calendarEvents: CalendarEvent[];
  calendarAnalysis: CalendarAnalysisReport;
  agenda: AgendaItem[];
  bills: BillItem[];
  activity: ActivityEntry[];
  permissions: PermissionSettings;
  onNavigate: (tab: NavTab, taskId?: string, queueSubTab?: QueueSubTab) => void;
  onToggleAgenda: (agendaId: string) => void;
  onQuickApproveTask: (taskId: string) => void;
  onQuickSnoozeTask: (taskId: string) => void;
  onMarkBillPaidSimulated: (billId: string) => void;
  onStageAssistantTask: (task: TaskItem, note: string) => void;
}

const EXAMPLE_PROMPTS = [
  'Draft an email to my landlord about fixing the hallway radiator',
  'Summarize my upcoming bills and tell me what needs approval',
  'Check when I am free on Dec 3 or Dec 4 for a 45-minute call',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getBillStatusLabel(status: BillItem['status']): { text: string; toneClass: string } {
  switch (status) {
    case 'needs_approval':
      return { text: 'Needs approval', toneClass: 'text-[var(--color-warn)] font-medium' };
    case 'scheduled_simulated':
      return { text: 'Scheduled (sim)', toneClass: 'text-[var(--color-ink-muted)]' };
    case 'paid_simulated':
      return { text: 'Paid (sim)', toneClass: 'text-[var(--color-accent)] font-medium' };
  }
}

export function BriefingView({
  userName,
  tasks,
  mails,
  calendarEvents,
  calendarAnalysis,
  agenda,
  bills,
  activity,
  permissions,
  onNavigate,
  onToggleAgenda,
  onQuickApproveTask,
  onQuickSnoozeTask,
  onMarkBillPaidSimulated,
  onStageAssistantTask,
}: BriefingViewProps) {
  const [askInput, setAskInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [assistantReply, setAssistantReply] = useState<{
    text: string;
    stagedTaskId?: string;
    stagedTaskTitle?: string;
  } | null>(null);

  const waitingTasks = tasks.filter((t) => t.status === 'waiting');
  const remainingAgenda = agenda.filter((a) => !a.completed).length;
  const upcomingBills = bills.filter((b) => b.status !== 'paid_simulated');
  const upcomingTotal = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
  const recentActivity = activity.slice(0, 3);
  const recentMails = mails.slice(0, 3);

  const handleAskDaymark = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = askInput.trim();
    if (!promptText) return;

    setAskError(null);
    setIsAsking(true);
    try {
      const { result: res } = await askAssistantRequest({
        requestText: promptText,
        context: {
          waitingTasks: waitingTasks.map((t) => ({
            title: t.title,
            counterparty: t.counterparty,
            dueText: t.dueText,
          })),
          upcomingBills: bills,
          calendarEvents: calendarEvents.map((ev) => ({
            day: ev.dayLabel,
            time: `${ev.startTime} - ${ev.endTime}`,
            title: ev.title,
          })),
          recentMails: mails.slice(0, 4).map((m) => ({
            from: m.fromName,
            subject: m.subject,
            observation: m.assistantObservation,
          })),
          permissions,
        },
      });
      let stagedTaskId: string | undefined;
      let stagedTaskTitle: string | undefined;

      if (res.shouldStageTask && res.taskTitle) {
        const validCategories: TaskCategory[] = [
          'refund',
          'bill',
          'appointment',
          'form',
          'subscription',
        ];
        const category = validCategories.includes(res.taskCategory as TaskCategory)
          ? (res.taskCategory as TaskCategory)
          : 'refund';

        stagedTaskId = `task-ask-${Date.now()}`;
        stagedTaskTitle = res.taskTitle;

        const newTask: TaskItem = {
          id: stagedTaskId,
          title: res.taskTitle,
          counterparty: res.counterparty || 'Requested by you',
          category,
          status: 'waiting',
          urgencyLabel: 'Prepared from your request',
          dueText: res.dueText || 'Ready for review',
          summary: res.summary || res.reply,
          planSteps:
            Array.isArray(res.planSteps) && res.planSteps.length > 0
              ? res.planSteps
              : ['Review the prepared draft below.', 'Approve when ready to simulate sending.'],
          dataUsed: [
            {
              source: 'email',
              label: 'Your instruction',
              detail: promptText,
            },
          ],
          requiredSources: ['email'],
          approvalBoundary:
            res.approvalBoundary ||
            'Requires your approval before sending or recording any external action.',
          payload: {
            kind: 'email',
            to: res.draftTo || 'recipient@example.com',
            subject: res.draftSubject || res.taskTitle,
            body: res.draftBody || res.reply,
          },
        };

        onStageAssistantTask(newTask, `Prepared draft from request: "${promptText}"`);
      }

      setAssistantReply({
        text: res.reply,
        stagedTaskId,
        stagedTaskTitle,
      });
      setAskInput('');
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Unable to process request.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Chief of Staff Greeting & Direct Ask Bar */}
      <section aria-labelledby="briefing-heading" className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-[var(--color-ink-muted)]">{formatTodayDate()}</p>
            <h1
              id="briefing-heading"
              className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl"
            >
              {getGreeting()}, {userName}.
            </h1>
            <p className="max-w-2xl text-base text-[var(--color-ink-muted)]">
              I read {mails.length} messages in your inbox, checked your schedule through Dec 4, and
              staged {waitingTasks.length}{' '}
              {waitingTasks.length === 1 ? 'draft' : 'drafts'} for your signature. Nothing leaves
              without your approval.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-ink-muted)] lg:max-w-sm">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>
              Explicit approval boundary active. External messages, bookings, and funds stay paused
              until you confirm.
            </span>
          </div>
        </div>

        {/* Ask Daymark Command Bar */}
        <div className="rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3">
          <form onSubmit={handleAskDaymark} className="space-y-2.5">
            <label
              htmlFor="ask-daymark-input"
              className="block text-sm font-semibold text-[var(--color-ink)]"
            >
              Ask Daymark to handle something
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="ask-daymark-input"
                type="text"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask about your mail, schedule, bills, or ask me to draft an email..."
                className="h-11 flex-1 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-paper)] px-3.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)]"
              />
              <button
                type="submit"
                disabled={isAsking || !askInput.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-5 text-sm font-medium text-white whitespace-nowrap shrink-0 hover:bg-[var(--color-accent-hover)] cursor-pointer transition-colors duration-150"
              >
                {isAsking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Ask Daymark</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--color-ink-subtle)]">Try:</span>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setAskInput(example)}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 text-xs text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>

          {askError && (
            <div
              role="alert"
              className="rounded-md border border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]"
            >
              {askError}
            </div>
          )}

          {assistantReply && (
            <div className="rounded-md border border-[var(--color-accent)]/35 bg-[var(--color-accent-soft)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--color-accent)]">Daymark reply</p>
              <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                {assistantReply.text}
              </p>
              {assistantReply.stagedTaskId && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('queue', assistantReply.stagedTaskId)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    <span>Inspect staged draft: {assistantReply.stagedTaskTitle}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* What Daymark Read & Analyzed (Mail + Calendar Assistant Work) */}
      <section aria-labelledby="assistant-work-heading" className="space-y-3">
        <h2 id="assistant-work-heading" className="text-xl font-semibold text-[var(--color-ink)]">
          What Daymark read and analyzed
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Mail Reading Summary */}
          <div className="flex flex-col justify-between rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 lg:col-span-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    Inbox triage ({mails.length} messages read)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('mail')}
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Mail reader
                </button>
              </div>

              <ul className="divide-y divide-[var(--color-rule)]">
                {recentMails.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {m.fromName}
                      </span>
                      <span className="text-xs font-medium text-[var(--color-accent)] shrink-0">
                        {m.triageLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] line-clamp-2">
                      {m.assistantObservation}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 border-t border-[var(--color-rule)] pt-3">
              <button
                type="button"
                onClick={() => onNavigate('mail')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)] cursor-pointer"
              >
                <span>Inspect raw emails or paste a new notice for Daymark to read</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Calendar Analysis Summary */}
          <div className="flex flex-col justify-between rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 lg:col-span-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    Calendar analysis ({calendarAnalysis.conflicts.length} conflicts found)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Calendar analyzer
                </button>
              </div>

              <p className="text-sm text-[var(--color-ink-muted)]">
                {calendarAnalysis.briefSummary}
              </p>

              {calendarAnalysis.conflicts[0] && (
                <div className="rounded-md border border-[var(--color-warn)]/35 bg-[var(--color-warn-soft)] px-3.5 py-2.5 text-xs">
                  <p className="font-semibold text-[var(--color-warn)]">
                    Flagged: {calendarAnalysis.conflicts[0].dateLabel}
                  </p>
                  <p className="mt-0.5 text-[var(--color-ink)]">
                    {calendarAnalysis.conflicts[0].issue}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-[var(--color-rule)] pt-3">
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)] cursor-pointer"
              >
                <span>View full week schedule and run live slot analysis</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Priority Queue: Needs your approval */}
      <section aria-labelledby="needs-approval-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              id="needs-approval-heading"
              className="text-xl font-semibold text-[var(--color-ink)]"
            >
              Needs your approval ({waitingTasks.length})
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Prepared from your mail, calendar, and vault. Paused until you approve.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('queue')}
            className="text-sm font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open approval workbench
          </button>
        </div>

        <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
          {waitingTasks.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-base font-medium text-[var(--color-ink)]">
                No drafts waiting for your decision
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
                You have reviewed every open request. Feed a new email in Mail or ask Daymark above
                to prepare something new.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-rule)]">
              {waitingTasks.map((task) => {
                const isMoneyTask = Boolean(task.requiresExplicitMoneyConfirm);
                return (
                  <li
                    key={task.id}
                    className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-ink-muted)]">
                        <span className="font-medium text-[var(--color-ink)]">
                          {getCategoryLabel(task.category)}
                        </span>
                        <span>{task.counterparty}</span>
                        <span className="font-mono-tabular text-[var(--color-warn)]">
                          {task.dueText}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[var(--color-ink)]">
                        {task.title}
                      </h3>
                      <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
                        {task.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onNavigate('queue', task.id)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                      >
                        Inspect & edit
                      </button>

                      {isMoneyTask ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('queue', task.id)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                        >
                          Review payment
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onQuickApproveTask(task.id)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                        >
                          Approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onQuickSnoozeTask(task.id)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-md px-3 text-sm font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                      >
                        Snooze
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Two-column workspace: Today's Agenda + Upcoming Bills */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section aria-labelledby="agenda-heading" className="space-y-3 lg:col-span-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="agenda-heading" className="text-xl font-semibold text-[var(--color-ink)]">
              Today’s agenda ({remainingAgenda} left)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-sm font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              Full week
            </button>
          </div>

          <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
            <ul className="divide-y divide-[var(--color-rule)]">
              {agenda.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.completed}
                      aria-label={`Mark "${item.title}" as ${item.completed ? 'not done' : 'done'}`}
                      onClick={() => onToggleAgenda(item.id)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors duration-150 cursor-pointer ${
                        item.completed
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                          : 'border-[var(--color-rule-strong)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="font-mono-tabular text-xs font-medium text-[var(--color-ink-muted)]">
                          {item.time}
                        </span>
                        <span className="text-xs text-[var(--color-ink-subtle)]">
                          {item.location}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          item.completed
                            ? 'text-[var(--color-ink-muted)] line-through'
                            : 'text-[var(--color-ink)]'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-sm text-[var(--color-ink-muted)]">{item.prepNote}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="bills-heading" className="space-y-3 lg:col-span-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="bills-heading" className="text-xl font-semibold text-[var(--color-ink)]">
              Upcoming bills ({formatCurrency(upcomingTotal)})
            </h2>
            <span className="text-sm text-[var(--color-ink-muted)]">No automatic transfers</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink-muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Payee
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Due
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {bills.map((bill) => {
                  const statusMeta = getBillStatusLabel(bill.status);
                  return (
                    <tr key={bill.id} className="hover:bg-[var(--color-paper)]/60">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[var(--color-ink)]">{bill.payee}</div>
                        <div className="text-xs text-[var(--color-ink-subtle)]">
                          {bill.category}
                        </div>
                      </td>
                      <td className="font-mono-tabular px-3 py-3.5 text-xs text-[var(--color-ink-muted)] whitespace-nowrap">
                        {bill.dueDate}
                      </td>
                      <td className="font-mono-tabular px-3 py-3.5 text-right font-medium text-[var(--color-ink)] whitespace-nowrap">
                        {formatCurrency(bill.amount)}
                      </td>
                      <td className={`px-3 py-3.5 text-xs whitespace-nowrap ${statusMeta.toneClass}`}>
                        {statusMeta.text}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {bill.linkedTaskId && bill.status === 'needs_approval' ? (
                          <button
                            type="button"
                            onClick={() => onNavigate('queue', bill.linkedTaskId)}
                            className="text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                          >
                            Review draft
                          </button>
                        ) : bill.status === 'scheduled_simulated' ? (
                          <button
                            type="button"
                            onClick={() => onMarkBillPaidSimulated(bill.id)}
                            className="text-xs font-medium text-[var(--color-ink)] hover:underline cursor-pointer"
                          >
                            Mark paid (sim)
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-ink-subtle)]">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Recent Activity */}
      <section aria-labelledby="handled-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="handled-heading" className="text-xl font-semibold text-[var(--color-ink)]">
            Recent activity
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('queue', undefined, 'activity')}
            className="text-sm font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View full activity log ({activity.length})
          </button>
        </div>

        <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
          <ul className="divide-y divide-[var(--color-rule)]">
            {recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-[var(--color-ink)]">{entry.title}</p>
                  <p className="text-sm text-[var(--color-ink-muted)]">{entry.simulatedOutcome}</p>
                </div>
                <span className="font-mono-tabular shrink-0 text-xs text-[var(--color-ink-subtle)]">
                  {entry.timestamp}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
