import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Edit3,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ActivityEntry,
  GuardrailSettings,
  PermissionSettings,
  PermissionSource,
  QueueSubTab,
  TaskCategory,
  TaskItem,
  TaskPayload,
} from '../types';
import { formatCurrency, getCategoryLabel, maskAccountString } from '../utils/storage';
import { ActivityView } from './ActivityView';

interface ApprovalQueueViewProps {
  tasks: TaskItem[];
  activity: ActivityEntry[];
  selectedTaskId: string | null;
  activeSubTab: QueueSubTab;
  permissions: PermissionSettings;
  guardrails: GuardrailSettings;
  onChangeSubTab: (subTab: QueueSubTab) => void;
  onSelectTask: (taskId: string | null) => void;
  onApproveTask: (taskId: string) => void;
  onSaveTaskEdit: (taskId: string, updatedPayload: TaskPayload) => void;
  onSnoozeTask: (taskId: string, snoozeLabel: string) => void;
  onRejectTask: (taskId: string, reason: string) => void;
  onReopenTask: (taskId: string) => void;
  onSimulateIncoming: () => void;
  onOpenPrivacy: () => void;
}

const CATEGORY_FILTERS: Array<{ id: 'all' | TaskCategory; label: string }> = [
  { id: 'all', label: 'All types' },
  { id: 'refund', label: 'Refunds' },
  { id: 'bill', label: 'Bills' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'form', label: 'Forms' },
  { id: 'subscription', label: 'Renewals' },
];

function isSourceRestricted(
  source: PermissionSource,
  permissions: PermissionSettings
): { restricted: boolean; label: string } {
  if (source === 'email' && permissions.email === 'paused') {
    return { restricted: true, label: 'Email inbox access is paused' };
  }
  if (source === 'calendar' && permissions.calendar === 'paused') {
    return { restricted: true, label: 'Calendar access is paused' };
  }
  if (source === 'billing' && permissions.billing === 'paused') {
    return { restricted: true, label: 'Bills & statements access is paused' };
  }
  if (source === 'vault' && permissions.vault === 'locked') {
    return { restricted: true, label: 'Personal vault is locked' };
  }
  return { restricted: false, label: '' };
}

function getTaskAmount(task: TaskItem): number | null {
  if (task.payload.kind === 'bill') return task.payload.amount;
  return null;
}

export function ApprovalQueueView({
  tasks,
  activity,
  selectedTaskId,
  activeSubTab,
  permissions,
  guardrails,
  onChangeSubTab,
  onSelectTask,
  onApproveTask,
  onSaveTaskEdit,
  onSnoozeTask,
  onRejectTask,
  onReopenTask,
  onSimulateIncoming,
  onOpenPrivacy,
}: ApprovalQueueViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskCategory>('all');
  const [mobileDetailVisible, setMobileDetailVisible] = useState(Boolean(selectedTaskId));

  // Sub-interaction states inside detail pane
  const [isEditing, setIsEditing] = useState(false);
  const [draftPayload, setDraftPayload] = useState<TaskPayload | null>(null);
  const [confirmingMoney, setConfirmingMoney] = useState(false);
  const [snoozePickerOpen, setSnoozePickerOpen] = useState(false);
  const [rejectFormOpen, setRejectFormOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const waitingCount = tasks.filter((t) => t.status === 'waiting').length;
  const snoozedCount = tasks.filter((t) => t.status === 'snoozed').length;
  const resolvedCount = tasks.filter(
    (t) => t.status === 'approved' || t.status === 'rejected'
  ).length;

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      activeSubTab === 'waiting'
        ? task.status === 'waiting'
        : activeSubTab === 'snoozed'
          ? task.status === 'snoozed'
          : task.status === 'approved' || task.status === 'rejected';
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  // Sync status tab if a specific taskId was passed from outside (e.g. Briefing or Mail)
  useEffect(() => {
    if (!selectedTaskId || activeSubTab === 'activity') return;
    const target = tasks.find((t) => t.id === selectedTaskId);
    if (!target) return;
    if (target.status === 'waiting' && activeSubTab !== 'waiting') onChangeSubTab('waiting');
    else if (target.status === 'snoozed' && activeSubTab !== 'snoozed') onChangeSubTab('snoozed');
    else if (
      (target.status === 'approved' || target.status === 'rejected') &&
      activeSubTab !== 'resolved'
    ) {
      onChangeSubTab('resolved');
    }
    setMobileDetailVisible(true);
  }, [selectedTaskId, tasks]);

  const activeTask =
    filteredTasks.find((t) => t.id === selectedTaskId) ?? filteredTasks[0] ?? null;

  // Reset inline modes whenever switching selected task
  useEffect(() => {
    setIsEditing(false);
    setDraftPayload(null);
    setConfirmingMoney(false);
    setSnoozePickerOpen(false);
    setRejectFormOpen(false);
    setRejectReason('');
  }, [activeTask?.id]);

  const handleSelectRow = (taskId: string) => {
    onSelectTask(taskId);
    setMobileDetailVisible(true);
  };

  const startEditing = () => {
    if (!activeTask) return;
    setDraftPayload(JSON.parse(JSON.stringify(activeTask.payload)) as TaskPayload);
    setIsEditing(true);
    setConfirmingMoney(false);
    setSnoozePickerOpen(false);
    setRejectFormOpen(false);
  };

  const handleSaveEdit = () => {
    if (!activeTask || !draftPayload) return;
    onSaveTaskEdit(activeTask.id, draftPayload);
    setIsEditing(false);
    setDraftPayload(null);
  };

  const handleApproveClick = () => {
    if (!activeTask) return;
    if (activeTask.requiresExplicitMoneyConfirm && !confirmingMoney) {
      setConfirmingMoney(true);
      setSnoozePickerOpen(false);
      setRejectFormOpen(false);
      return;
    }
    setConfirmingMoney(false);
    onApproveTask(activeTask.id);
  };

  const restrictedNotices = activeTask
    ? activeTask.requiredSources
        .map((src) => isSourceRestricted(src, permissions))
        .filter((item) => item.restricted)
    : [];

  return (
    <div className="space-y-6">
      {/* Page Title & Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Needs your approval
          </h1>
          <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
            Inspect every prepared draft, see the exact information used, edit any detail, and
            decide what Daymark may simulate.
          </p>
        </div>

        <button
          type="button"
          onClick={onSimulateIncoming}
          className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 lg:self-auto"
        >
          <Plus className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
          <span>Simulate incoming item</span>
        </button>
      </div>

      {/* Status Tabs & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Queue and activity filter"
          className="inline-flex items-center gap-1 overflow-x-auto self-start rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'waiting'}
            onClick={() => onChangeSubTab('waiting')}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              activeSubTab === 'waiting'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Waiting ({waitingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'snoozed'}
            onClick={() => onChangeSubTab('snoozed')}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              activeSubTab === 'snoozed'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Snoozed ({snoozedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'resolved'}
            onClick={() => onChangeSubTab('resolved')}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              activeSubTab === 'resolved'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'activity'}
            onClick={() => onChangeSubTab('activity')}
            className={`min-h-[36px] rounded-md px-3 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
              activeSubTab === 'activity'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            Activity log ({activity.length})
          </button>
        </div>

        {activeSubTab !== 'activity' && (
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="text-xs font-medium text-[var(--color-ink-muted)]">
              Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | TaskCategory)}
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
            >
              {CATEGORY_FILTERS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Activity Log Sub-tab */}
      {activeSubTab === 'activity' ? (
        <ActivityView
          activity={activity}
          onOpenTask={(taskId) => {
            onSelectTask(taskId);
            onChangeSubTab('waiting');
          }}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-6 py-14 text-center">
          <p className="text-base font-semibold text-[var(--color-ink)]">
            {activeSubTab === 'waiting'
              ? 'Nothing waiting for your approval'
              : activeSubTab === 'snoozed'
                ? 'No snoozed items right now'
                : 'No resolved items yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
            {activeSubTab === 'waiting'
              ? 'All pending drafts have been reviewed. Simulate an incoming refund or permit renewal to test the workflow.'
              : 'Items you snooze or resolve will appear here so you can revisit them anytime.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                Show all categories
              </button>
            )}
            <button
              type="button"
              onClick={onSimulateIncoming}
              className="inline-flex h-10 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] cursor-pointer"
            >
              Simulate incoming item
            </button>
          </div>
        </div>
      ) : (
        /* Master-Detail Workbench */
        <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] lg:grid-cols-12">
          {/* Left Queue List */}
          <div
            className={`border-b border-[var(--color-rule)] lg:col-span-5 lg:border-b-0 lg:border-r ${
              mobileDetailVisible ? 'hidden lg:block' : 'block'
            }`}
          >
            <ul aria-label="Approval queue items" className="divide-y divide-[var(--color-rule)]">
              {filteredTasks.map((task) => {
                const isSelected = activeTask?.id === task.id;
                const amount = getTaskAmount(task);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRow(task.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full px-5 py-4 text-left transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-surface-muted)]'
                          : 'bg-[var(--color-surface)] hover:bg-[var(--color-paper)]/70'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-medium text-[var(--color-ink-muted)]">
                          {getCategoryLabel(task.category)}
                        </span>
                        <span className="font-mono-tabular text-xs text-[var(--color-ink-subtle)]">
                          {task.dueText}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                          {task.title}
                        </h2>
                        {amount !== null && (
                          <span className="font-mono-tabular shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                            {formatCurrency(amount)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
                        <span className="truncate">{task.counterparty}</span>
                        {task.status === 'approved' && (
                          <span className="font-medium text-[var(--color-accent)] whitespace-nowrap shrink-0">
                            Approved (sim)
                          </span>
                        )}
                        {task.status === 'rejected' && (
                          <span className="font-medium text-[var(--color-danger)] whitespace-nowrap shrink-0">
                            Declined
                          </span>
                        )}
                        {task.status === 'snoozed' && (
                          <span className="font-medium text-[var(--color-warn)] whitespace-nowrap shrink-0">
                            {task.snoozedUntil ?? 'Snoozed'}
                          </span>
                        )}
                        {task.status === 'waiting' && task.wasEdited && (
                          <span className="font-medium text-[var(--color-accent)] whitespace-nowrap shrink-0">
                            Edited
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right Detail Inspection & Edit Pane */}
          {activeTask && (
            <div
              className={`lg:col-span-7 ${
                mobileDetailVisible ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="p-5 sm:p-6 space-y-6">
                {/* Mobile back control */}
                <button
                  type="button"
                  onClick={() => setMobileDetailVisible(false)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] lg:hidden cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Back to queue</span>
                </button>

                {/* Header */}
                <div className="space-y-2 border-b border-[var(--color-rule)] pb-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-ink-muted)]">
                    <span className="font-semibold text-[var(--color-ink)]">
                      {getCategoryLabel(activeTask.category)}
                    </span>
                    <span>{activeTask.counterparty}</span>
                    <span className="font-mono-tabular text-[var(--color-warn)]">
                      {activeTask.urgencyLabel}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">
                    {activeTask.title}
                  </h2>
                  <p className="text-sm text-[var(--color-ink-muted)]">{activeTask.summary}</p>
                </div>

                {/* Approval Boundary Notice */}
                <div className="flex items-start gap-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-3 text-sm">
                  <Lock
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">Approval boundary</p>
                    <p className="mt-0.5 text-[var(--color-ink-muted)]">
                      {activeTask.approvalBoundary}
                    </p>
                  </div>
                </div>

                {/* Dynamic Permission Warning if user paused required source */}
                {restrictedNotices.length > 0 && (
                  <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn-soft)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-[var(--color-ink)]">
                          {restrictedNotices.map((n) => n.label).join('. ')}.
                        </p>
                        <p className="text-[var(--color-ink-muted)]">
                          Daymark respects your privacy pause. Re-enable access or review fields
                          manually before approving.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPrivacy}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      Manage access
                    </button>
                  </div>
                )}

                {/* Plan & Information Used */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      What Daymark plans to do
                    </h3>
                    <ol className="space-y-2 text-sm text-[var(--color-ink-muted)]">
                      {activeTask.planSteps.map((step, index) => (
                        <li key={step} className="flex items-start gap-2.5">
                          <span className="font-mono-tabular mt-0.5 text-xs font-medium text-[var(--color-ink-subtle)]">
                            0{index + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      Information it will use
                    </h3>
                    <dl className="space-y-2.5 text-sm">
                      {activeTask.dataUsed.map((item) => (
                        <div key={`${item.source}-${item.label}`}>
                          <dt className="font-medium text-[var(--color-ink)]">{item.label}</dt>
                          <dd className="text-[var(--color-ink-muted)]">
                            {maskAccountString(item.detail, guardrails.redactAccountNumbers)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                {/* Proposed Payload / Editable Form */}
                <div className="space-y-3 border-t border-[var(--color-rule)] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      {isEditing ? 'Edit prepared draft' : 'Prepared action preview'}
                    </h3>
                    {activeTask.status === 'waiting' && !isEditing && (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit details</span>
                      </button>
                    )}
                  </div>

                  {renderPayloadSection({
                    payload: isEditing && draftPayload ? draftPayload : activeTask.payload,
                    isEditing,
                    redactNumbers: guardrails.redactAccountNumbers,
                    onChangeDraft: setDraftPayload,
                  })}

                  {isEditing && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex h-10 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] cursor-pointer"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setDraftPayload(null);
                        }}
                        className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Monetary Confirmation Bar */}
                {confirmingMoney && activeTask.status === 'waiting' && (
                  <div
                    role="region"
                    aria-label="Confirm simulated payment"
                    className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 space-y-3"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Confirm explicit payment approval
                    </p>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {activeTask.payload.kind === 'bill'
                        ? `Approve a simulated payment of ${formatCurrency(activeTask.payload.amount)} to ${activeTask.payload.payee} from ${maskAccountString(activeTask.payload.paymentSource, guardrails.redactAccountNumbers)} on ${activeTask.payload.scheduledDate}. No real funds will move.`
                        : `Approve submitting this form including the stated fee. This is a local simulation and no real charge will be made.`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApproveClick}
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white whitespace-nowrap shrink-0 hover:bg-[var(--color-accent-hover)] cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        <span>Confirm simulated approval</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingMoney(false)}
                        className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Snooze Options */}
                {snoozePickerOpen && activeTask.status === 'waiting' && (
                  <div className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-paper)] p-4 space-y-3">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Snooze until when?
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {['Later today at 4:00 PM', 'Tomorrow at 9:00 AM', 'Next Monday'].map(
                        (option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setSnoozePickerOpen(false);
                              onSnoozeTask(activeTask.id, option);
                            }}
                            className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                          >
                            {option}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => setSnoozePickerOpen(false)}
                        className="inline-flex h-10 items-center px-3 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Reject Confirmation */}
                {rejectFormOpen && activeTask.status === 'waiting' && (
                  <div className="rounded-md border border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)] p-4 space-y-3">
                    <label
                      htmlFor="reject-reason-input"
                      className="block text-sm font-semibold text-[var(--color-ink)]"
                    >
                      Decline this proposal (optional note)
                    </label>
                    <input
                      id="reject-reason-input"
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g., I already handled this directly"
                      className="h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectFormOpen(false);
                          onRejectTask(activeTask.id, rejectReason.trim());
                        }}
                        className="inline-flex h-10 items-center rounded-md bg-[var(--color-danger)] px-4 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
                      >
                        Confirm decline
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectFormOpen(false)}
                        className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Action Bar */}
                {activeTask.status === 'waiting' && !isEditing && (
                  <div className="flex flex-wrap items-center gap-2.5 border-t border-[var(--color-rule)] pt-5">
                    {!confirmingMoney && (
                      <button
                        type="button"
                        onClick={handleApproveClick}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {activeTask.requiresExplicitMoneyConfirm
                            ? 'Review & approve payment'
                            : activeTask.payload.kind === 'email'
                              ? 'Approve & send (sim)'
                              : activeTask.payload.kind === 'appointment'
                                ? 'Confirm booking (sim)'
                                : 'Approve & submit (sim)'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={startEditing}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSnoozePickerOpen((prev) => !prev);
                        setConfirmingMoney(false);
                        setRejectFormOpen(false);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                    >
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span>Snooze</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectFormOpen((prev) => !prev);
                        setConfirmingMoney(false);
                        setSnoozePickerOpen(false);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-3.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                {/* Snoozed or Resolved Footer Controls */}
                {activeTask.status !== 'waiting' && (
                  <div className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      {activeTask.status === 'snoozed' && (
                        <p className="text-[var(--color-ink-muted)]">
                          Snoozed until{' '}
                          <span className="font-medium text-[var(--color-ink)]">
                            {activeTask.snoozedUntil ?? 'later'}
                          </span>
                        </p>
                      )}
                      {activeTask.status === 'approved' && (
                        <p className="font-medium text-[var(--color-accent)]">
                          {activeTask.resolutionNote ?? 'Approved and logged in simulation.'}
                          {activeTask.resolvedAt ? ` (${activeTask.resolvedAt})` : ''}
                        </p>
                      )}
                      {activeTask.status === 'rejected' && (
                        <p className="font-medium text-[var(--color-danger)]">
                          {activeTask.resolutionNote ?? 'Declined without taking action.'}
                          {activeTask.resolvedAt ? ` (${activeTask.resolvedAt})` : ''}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onReopenTask(activeTask.id)}
                      className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Move back to waiting</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PayloadRenderProps {
  payload: TaskPayload;
  isEditing: boolean;
  redactNumbers: boolean;
  onChangeDraft: (next: TaskPayload) => void;
}

function renderPayloadSection({
  payload,
  isEditing,
  redactNumbers,
  onChangeDraft,
}: PayloadRenderProps) {
  if (payload.kind === 'email') {
    if (isEditing) {
      return (
        <div className="space-y-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <div>
            <label htmlFor="draft-to" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              Recipient
            </label>
            <input
              id="draft-to"
              type="email"
              value={payload.to}
              onChange={(e) => onChangeDraft({ ...payload, to: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
            />
          </div>
          <div>
            <label
              htmlFor="draft-subject"
              className="block text-xs font-medium text-[var(--color-ink-muted)]"
            >
              Subject
            </label>
            <input
              id="draft-subject"
              type="text"
              value={payload.subject}
              onChange={(e) => onChangeDraft({ ...payload, subject: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
            />
          </div>
          <div>
            <label
              htmlFor="draft-body"
              className="block text-xs font-medium text-[var(--color-ink-muted)]"
            >
              Message body
            </label>
            <textarea
              id="draft-body"
              rows={7}
              value={payload.body}
              onChange={(e) => onChangeDraft({ ...payload, body: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-ink)]"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3 text-sm">
        <dl className="space-y-1.5 border-b border-[var(--color-rule)] pb-3">
          <div className="flex flex-wrap gap-2">
            <dt className="w-16 shrink-0 text-[var(--color-ink-muted)]">To</dt>
            <dd className="font-mono-tabular text-[var(--color-ink)]">{payload.to}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-16 shrink-0 text-[var(--color-ink-muted)]">Subject</dt>
            <dd className="font-medium text-[var(--color-ink)]">{payload.subject}</dd>
          </div>
          {payload.attachmentLabel && (
            <div className="flex flex-wrap gap-2">
              <dt className="w-16 shrink-0 text-[var(--color-ink-muted)]">File</dt>
              <dd className="inline-flex items-center gap-1.5 text-[var(--color-ink-muted)]">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{payload.attachmentLabel}</span>
              </dd>
            </div>
          )}
        </dl>
        <p className="whitespace-pre-line leading-relaxed text-[var(--color-ink)]">
          {payload.body}
        </p>
      </div>
    );
  }

  if (payload.kind === 'appointment') {
    if (isEditing) {
      return (
        <div className="space-y-4 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <div>
            <span className="block text-xs font-medium text-[var(--color-ink-muted)]">
              Choose an open slot from your calendar
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {payload.availableSlots.map((slot) => {
                const selected = payload.selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onChangeDraft({ ...payload, selectedSlot: slot })}
                    className={`min-h-[44px] rounded-md border px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors duration-150 ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'border-[var(--color-rule-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="appt-note"
              className="block text-xs font-medium text-[var(--color-ink-muted)]"
            >
              Note to office
            </label>
            <input
              id="appt-note"
              type="text"
              value={payload.noteToOffice}
              onChange={(e) => onChangeDraft({ ...payload, noteToOffice: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Provider</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{payload.provider}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Proposed time</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{payload.selectedSlot}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Location</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{payload.location}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Note included</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">{payload.noteToOffice}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (payload.kind === 'bill') {
    const diff = payload.amount - payload.previousAmount;
    if (isEditing) {
      return (
        <div className="space-y-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="bill-date"
                className="block text-xs font-medium text-[var(--color-ink-muted)]"
              >
                Scheduled payment date
              </label>
              <input
                id="bill-date"
                type="text"
                value={payload.scheduledDate}
                onChange={(e) => onChangeDraft({ ...payload, scheduledDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
              />
            </div>
            <div>
              <label
                htmlFor="bill-source"
                className="block text-xs font-medium text-[var(--color-ink-muted)]"
              >
                Funding account (simulated)
              </label>
              <select
                id="bill-source"
                value={payload.paymentSource}
                onChange={(e) => onChangeDraft({ ...payload, paymentSource: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
              >
                <option value="Checking #1104-4821">
                  {maskAccountString('Checking #1104-4821', redactNumbers)}
                </option>
                <option value="Reserve Savings #3301-9014">
                  {maskAccountString('Reserve Savings #3301-9014', redactNumbers)}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor="bill-memo"
              className="block text-xs font-medium text-[var(--color-ink-muted)]"
            >
              Payment memo
            </label>
            <input
              id="bill-memo"
              type="text"
              value={payload.memo}
              onChange={(e) => onChangeDraft({ ...payload, memo: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Amount due</dt>
            <dd className="font-mono-tabular mt-0.5 text-lg font-semibold text-[var(--color-ink)]">
              {formatCurrency(payload.amount)}
            </dd>
            <dd className="text-xs text-[var(--color-ink-muted)]">
              {diff >= 0
                ? `${formatCurrency(diff)} higher than last month (${formatCurrency(payload.previousAmount)})`
                : `${formatCurrency(Math.abs(diff))} lower than last month`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Scheduled date (simulated)</dt>
            <dd className="font-mono-tabular mt-0.5 font-medium text-[var(--color-ink)]">
              {payload.scheduledDate}
            </dd>
            <dd className="text-xs text-[var(--color-ink-muted)]">Due {payload.dueDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Payee account</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">
              {maskAccountString(payload.accountMasked, redactNumbers)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-muted)]">Pay from</dt>
            <dd className="mt-0.5 text-[var(--color-ink)]">
              {maskAccountString(payload.paymentSource, redactNumbers)}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  // Form payload
  if (isEditing) {
    return (
      <div className="space-y-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
        <p className="text-xs font-medium text-[var(--color-ink-muted)]">{payload.portalName}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {payload.fields.map((field) => (
            <div key={field.id}>
              <label
                htmlFor={`form-field-${field.id}`}
                className="block text-xs font-medium text-[var(--color-ink-muted)]"
              >
                {field.label}
              </label>
              <input
                id={`form-field-${field.id}`}
                type="text"
                value={field.value}
                onChange={(e) => {
                  const nextFields = payload.fields.map((f) =>
                    f.id === field.id ? { ...f, value: e.target.value } : f
                  );
                  onChangeDraft({ ...payload, fields: nextFields });
                }}
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 text-sm space-y-3">
      <p className="text-xs font-medium text-[var(--color-ink-muted)]">{payload.portalName}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {payload.fields.map((field) => (
          <div key={field.id}>
            <dt className="text-xs text-[var(--color-ink-muted)]">{field.label}</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
