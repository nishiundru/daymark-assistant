import { useEffect, useState } from 'react';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { BriefingView } from './components/BriefingView';
import { CalendarView } from './components/CalendarView';
import { MailView } from './components/MailView';
import { PrivacyView } from './components/PrivacyView';
import { ToastBanner, ToastMessage } from './components/ToastBanner';
import { TopBar } from './components/TopBar';
import { SIMULATED_INCOMING_ITEMS } from './data/initialState';
import {
  ActivityEntry,
  CalendarAnalysisReport,
  DaymarkState,
  GuardrailSettings,
  MailMessage,
  NavTab,
  PermissionSettings,
  QueueSubTab,
  TaskItem,
  TaskPayload,
} from './types';
import {
  formatCurrency,
  formatTimeStampNow,
  getInitialNavFromUrl,
  loadDaymarkState,
  resetDaymarkState,
  saveDaymarkState,
  syncUrlParams,
} from './utils/storage';

const PERMISSION_LABELS: Record<keyof PermissionSettings, string> = {
  email: 'Email inbox',
  calendar: 'Calendar',
  billing: 'Bills & statements',
  vault: 'Personal vault',
};

const GUARDRAIL_LABELS: Record<
  Exclude<keyof GuardrailSettings, 'requireMoneyApproval'>,
  string
> = {
  requireExternalSendApproval: 'Require approval before sending emails or forms',
  requireCalendarHoldApproval: 'Require approval before holding calendar slots',
  redactAccountNumbers: 'Mask account numbers in previews',
  autoArchiveReceipts: 'Auto-archive promotional receipts locally',
};

export default function App() {
  const initialNav = getInitialNavFromUrl();
  const [state, setState] = useState<DaymarkState>(() => loadDaymarkState());
  const [activeTab, setActiveTab] = useState<NavTab>(initialNav.tab);
  const [queueSubTab, setQueueSubTab] = useState<QueueSubTab>('waiting');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialNav.taskId);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    saveDaymarkState(state);
  }, [state]);

  useEffect(() => {
    syncUrlParams(activeTab, selectedTaskId);
  }, [activeTab, selectedTaskId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, detail?: string) => {
    setToast({
      id: `${Date.now()}`,
      message,
      detail,
    });
  };

  const waitingTasks = state.tasks.filter((t) => t.status === 'waiting');

  const handleNavigate = (tab: NavTab, taskId?: string, subTab?: QueueSubTab) => {
    setActiveTab(tab);
    if (subTab) {
      setQueueSubTab(subTab);
    } else if (tab === 'queue' && !taskId && queueSubTab === 'activity') {
      setQueueSubTab('waiting');
    }
    if (taskId) {
      setSelectedTaskId(taskId);
    } else if (tab === 'queue' && !selectedTaskId && waitingTasks[0]) {
      setSelectedTaskId(waitingTasks[0].id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewNext = () => {
    const nextWaiting = waitingTasks[0];
    setActiveTab('queue');
    setQueueSubTab('waiting');
    setSelectedTaskId(nextWaiting ? nextWaiting.id : state.tasks[0]?.id ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApproveTask = (taskId: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const timestamp = formatTimeStampNow();
    const simRef = `SIM-${Math.floor(10000 + Math.random() * 89999)}`;

    let resolutionNote = `Approved and simulated (${simRef}).`;
    let outcome = `Simulated action logged (${simRef}).`;

    if (target.payload.kind === 'email') {
      resolutionNote = `Simulated email staged to Outbox for ${target.payload.to} (${simRef}).`;
      outcome = `Simulated email logged for ${target.payload.to}. Nothing transmitted externally.`;
    } else if (target.payload.kind === 'bill') {
      resolutionNote = `Simulated payment of ${formatCurrency(target.payload.amount)} scheduled for ${target.payload.scheduledDate} (${simRef}).`;
      outcome = `Simulated ${formatCurrency(target.payload.amount)} payment recorded (${simRef}). No real money moved.`;
    } else if (target.payload.kind === 'appointment') {
      resolutionNote = `Simulated booking confirmed for ${target.payload.selectedSlot} (${simRef}).`;
      outcome = `Confirmed ${target.payload.selectedSlot} in simulated calendar (${simRef}).`;
    } else if (target.payload.kind === 'form') {
      resolutionNote = `Simulated form submitted to ${target.payload.portalName} (${simRef}).`;
      outcome = `Simulated portal submission recorded (${simRef}).`;
    }

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp,
      type: 'approved',
      title: `Approved: ${target.title}`,
      detail: `${target.counterparty} draft confirmed by you.`,
      simulatedOutcome: outcome,
      sourcesUsed: target.dataUsed.map((d) => d.label),
      taskId: target.id,
    };

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'approved',
              resolvedAt: timestamp,
              resolutionNote,
            }
          : t
      ),
      bills: prev.bills.map((b) =>
        b.linkedTaskId === taskId ? { ...b, status: 'scheduled_simulated' } : b
      ),
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Action approved (simulated)', outcome);
  };

  const handleSaveTaskEdit = (taskId: string, updatedPayload: TaskPayload) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'decision',
      title: `Edited draft: ${target.title}`,
      detail: 'Updated prepared fields before approval.',
      simulatedOutcome: 'Draft changes saved locally; still waiting for your approval.',
      sourcesUsed: ['User edit'],
      taskId: target.id,
    };

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, payload: updatedPayload, wasEdited: true } : t
      ),
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Draft updated', 'Your edits are saved and ready for approval.');
  };

  const handleSnoozeTask = (taskId: string, snoozeLabel: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'decision',
      title: `Snoozed: ${target.title}`,
      detail: `Postponed ${target.counterparty} review until ${snoozeLabel}.`,
      simulatedOutcome: `Moved to Snoozed queue (${snoozeLabel}).`,
      sourcesUsed: ['User decision'],
      taskId: target.id,
    };

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'snoozed',
              snoozedUntil: snoozeLabel,
              dueText: `Snoozed (${snoozeLabel})`,
            }
          : t
      ),
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Item snoozed', `Moved out of your active queue until ${snoozeLabel}.`);
  };

  const handleRejectTask = (taskId: string, reason: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    const timestamp = formatTimeStampNow();
    const note = reason ? `Declined: ${reason}` : 'Declined without taking action.';

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp,
      type: 'decision',
      title: `Declined: ${target.title}`,
      detail: reason ? `Reason noted: ${reason}` : 'Rejected proposed action.',
      simulatedOutcome: 'No message sent, no form submitted, no funds moved.',
      sourcesUsed: ['User decision'],
      taskId: target.id,
    };

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'rejected',
              resolvedAt: timestamp,
              resolutionNote: note,
            }
          : t
      ),
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Proposal declined', 'Archived without taking any external action.');
  };

  const handleReopenTask = (taskId: string) => {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'waiting',
              snoozedUntil: undefined,
              resolutionNote: undefined,
              resolvedAt: undefined,
              dueText: t.payload.kind === 'bill' ? `Due ${t.payload.dueDate}` : 'Ready for review',
            }
          : t
      ),
      bills: prev.bills.map((b) =>
        b.linkedTaskId === taskId ? { ...b, status: 'needs_approval' } : b
      ),
    }));

    showToast('Moved back to waiting', `"${target.title}" is ready for review again.`);
  };

  const handleSimulateIncoming = () => {
    const template =
      SIMULATED_INCOMING_ITEMS[state.simulatedQueueIndex % SIMULATED_INCOMING_ITEMS.length];
    const newId = `task-sim-${Date.now()}`;
    const newTask: TaskItem = {
      ...template,
      id: newId,
    };

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'prep',
      title: `Prepared new item: ${newTask.title}`,
      detail: `Simulated incoming notice from ${newTask.counterparty} parsed in read-only mode.`,
      simulatedOutcome: 'Staged in Approvals. Waiting for your review.',
      sourcesUsed: newTask.dataUsed.map((d) => d.label),
      taskId: newId,
    };

    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      activity: [newEntry, ...prev.activity],
      simulatedQueueIndex: prev.simulatedQueueIndex + 1,
    }));

    setActiveTab('queue');
    setQueueSubTab('waiting');
    setSelectedTaskId(newId);
    showToast('New simulated item staged', `${newTask.title} is ready in Approvals.`);
  };

  const handleAnalyzeNewEmail = (mail: MailMessage, stagedTask: TaskItem | null) => {
    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'prep',
      title: `Read incoming email: ${mail.subject}`,
      detail: mail.assistantObservation,
      simulatedOutcome: stagedTask
        ? `Staged "${stagedTask.title}" in Approvals.`
        : 'Read-only extraction recorded (drafting disabled in Read-only mode).',
      sourcesUsed: ['Email inbox'],
      taskId: stagedTask?.id,
    };

    setState((prev) => ({
      ...prev,
      mails: [mail, ...prev.mails],
      tasks: stagedTask ? [stagedTask, ...prev.tasks] : prev.tasks,
      activity: [newEntry, ...prev.activity],
    }));

    showToast(
      stagedTask ? 'Email read & draft staged' : 'Email read & extracted',
      stagedTask
        ? `"${stagedTask.title}" is waiting in Approvals.`
        : 'Key details extracted in Mail.'
    );
  };

  const handleUpdateExistingMail = (
    mailId: string,
    observation: string,
    facts: Array<{ label: string; value: string }>
  ) => {
    setState((prev) => ({
      ...prev,
      mails: prev.mails.map((m) =>
        m.id === mailId
          ? { ...m, assistantObservation: observation, extractedFacts: facts }
          : m
      ),
    }));
    showToast('Email re-analyzed', 'Updated extracted facts and assistant observation.');
  };

  const handleUpdateCalendarAnalysis = (report: CalendarAnalysisReport) => {
    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'prep',
      title: 'Analyzed upcoming week schedule',
      detail: report.briefSummary,
      simulatedOutcome: `Identified ${report.conflicts.length} conflicts and ${report.recommendedWindows.length} open windows.`,
      sourcesUsed: ['Calendar (read-only)'],
    };

    setState((prev) => ({
      ...prev,
      calendarAnalysis: report,
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Calendar analysis complete', 'Conflicts and open windows refreshed.');
  };

  const handleStageCalendarHold = (title: string, slot: string, note: string) => {
    const newId = `task-cal-${Date.now()}`;
    const newTask: TaskItem = {
      id: newId,
      title,
      counterparty: 'Your Calendar',
      category: 'appointment',
      status: 'waiting',
      urgencyLabel: 'Suggested from schedule analysis',
      dueText: slot,
      summary: note,
      planSteps: [
        `Reserve ${slot} on your calendar.`,
        'Wait for your confirmation before holding the block.',
      ],
      dataUsed: [
        {
          source: 'calendar',
          label: 'Schedule analysis',
          detail: `Open window matched: ${slot}`,
        },
      ],
      requiredSources: ['calendar'],
      approvalBoundary: 'Requires your approval before placing a hold on your calendar.',
      payload: {
        kind: 'appointment',
        provider: title,
        location: 'Calendar hold',
        selectedSlot: slot,
        availableSlots: [slot],
        noteToOffice: note,
      },
    };

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'prep',
      title: `Staged calendar hold: ${title}`,
      detail: `Suggested open window ${slot}.`,
      simulatedOutcome: 'Staged in Approvals.',
      sourcesUsed: ['Calendar analysis'],
      taskId: newId,
    };

    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      activity: [newEntry, ...prev.activity],
    }));

    handleNavigate('queue', newId, 'waiting');
    showToast('Calendar hold staged', `"${title}" is ready for approval.`);
  };

  const handleStageAssistantTask = (task: TaskItem, note: string) => {
    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'prep',
      title: `Prepared draft: ${task.title}`,
      detail: note,
      simulatedOutcome: 'Staged in Approvals. Nothing sent.',
      sourcesUsed: ['Briefing request'],
      taskId: task.id,
    };

    setState((prev) => ({
      ...prev,
      tasks: [task, ...prev.tasks],
      activity: [newEntry, ...prev.activity],
    }));
  };

  const handleToggleAgenda = (agendaId: string) => {
    setState((prev) => ({
      ...prev,
      agenda: prev.agenda.map((item) =>
        item.id === agendaId ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const handleMarkBillPaidSimulated = (billId: string) => {
    const target = state.bills.find((b) => b.id === billId);
    if (!target) return;

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'approved',
      title: `Marked bill paid (simulated): ${target.payee}`,
      detail: `Recorded ${formatCurrency(target.amount)} payment for due date ${target.dueDate}.`,
      simulatedOutcome: 'Local bill ledger updated to Paid (simulated).',
      sourcesUsed: ['User confirmation'],
    };

    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId ? { ...b, status: 'paid_simulated' } : b
      ),
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Bill marked paid (simulated)', `${target.payee} updated in your local ledger.`);
  };

  const handleUpdatePermission = <K extends keyof PermissionSettings>(
    key: K,
    value: PermissionSettings[K]
  ) => {
    const label = PERMISSION_LABELS[key];
    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'privacy',
      title: `Updated ${label} access`,
      detail: `Changed permission level to "${value.replace(/_/g, ' ')}".`,
      simulatedOutcome: 'Applied immediately across Daymark views.',
      sourcesUsed: ['Privacy settings'],
    };

    setState((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
      activity: [newEntry, ...prev.activity],
    }));

    showToast(`${label} updated`, 'Your access preference was saved locally.');
  };

  const handleToggleGuardrail = (
    key: Exclude<keyof GuardrailSettings, 'requireMoneyApproval'>
  ) => {
    const nextValue = !state.guardrails[key];
    const label = GUARDRAIL_LABELS[key];

    const newEntry: ActivityEntry = {
      id: `act-${Date.now()}`,
      timestamp: formatTimeStampNow(),
      type: 'privacy',
      title: `${nextValue ? 'Enabled' : 'Disabled'} guardrail: ${label}`,
      detail: 'Standing assistant rule updated in Privacy & access.',
      simulatedOutcome: 'Rule active immediately.',
      sourcesUsed: ['Privacy settings'],
    };

    setState((prev) => ({
      ...prev,
      guardrails: {
        ...prev.guardrails,
        [key]: nextValue,
      },
      activity: [newEntry, ...prev.activity],
    }));

    showToast('Safety boundary updated', `${label}: ${nextValue ? 'On' : 'Off'}`);
  };

  const handleResetDemo = () => {
    const fresh = resetDaymarkState();
    setState(fresh);
    setSelectedTaskId(fresh.tasks[0]?.id ?? null);
    showToast('Demo data reset', 'Restored all initial emails, calendar, drafts, and permissions.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <TopBar
        activeTab={activeTab}
        waitingCount={waitingTasks.length}
        onSelectTab={(tab) => handleNavigate(tab)}
        onReviewNext={handleReviewNext}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'briefing' && (
          <BriefingView
            userName={state.userName}
            tasks={state.tasks}
            mails={state.mails}
            calendarEvents={state.calendarEvents}
            calendarAnalysis={state.calendarAnalysis}
            agenda={state.agenda}
            bills={state.bills}
            activity={state.activity}
            permissions={state.permissions}
            onNavigate={handleNavigate}
            onToggleAgenda={handleToggleAgenda}
            onQuickApproveTask={handleApproveTask}
            onQuickSnoozeTask={(taskId) => handleSnoozeTask(taskId, 'Tomorrow at 9:00 AM')}
            onMarkBillPaidSimulated={handleMarkBillPaidSimulated}
            onStageAssistantTask={handleStageAssistantTask}
          />
        )}

        {activeTab === 'mail' && (
          <MailView
            mails={state.mails}
            calendarEvents={state.calendarEvents}
            permissions={state.permissions}
            onAnalyzeNewEmail={handleAnalyzeNewEmail}
            onUpdateExistingMail={handleUpdateExistingMail}
            onOpenTask={(taskId) => handleNavigate('queue', taskId, 'waiting')}
            onOpenPrivacy={() => handleNavigate('privacy')}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            events={state.calendarEvents}
            analysis={state.calendarAnalysis}
            tasks={state.tasks}
            permissions={state.permissions}
            onUpdateAnalysis={handleUpdateCalendarAnalysis}
            onStageCalendarHold={handleStageCalendarHold}
            onOpenTask={(taskId) => handleNavigate('queue', taskId, 'waiting')}
            onOpenPrivacy={() => handleNavigate('privacy')}
          />
        )}

        {activeTab === 'queue' && (
          <ApprovalQueueView
            tasks={state.tasks}
            activity={state.activity}
            selectedTaskId={selectedTaskId}
            activeSubTab={queueSubTab}
            permissions={state.permissions}
            guardrails={state.guardrails}
            onChangeSubTab={setQueueSubTab}
            onSelectTask={setSelectedTaskId}
            onApproveTask={handleApproveTask}
            onSaveTaskEdit={handleSaveTaskEdit}
            onSnoozeTask={handleSnoozeTask}
            onRejectTask={handleRejectTask}
            onReopenTask={handleReopenTask}
            onSimulateIncoming={handleSimulateIncoming}
            onOpenPrivacy={() => handleNavigate('privacy')}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyView
            permissions={state.permissions}
            guardrails={state.guardrails}
            onUpdatePermission={handleUpdatePermission}
            onToggleGuardrail={handleToggleGuardrail}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[var(--color-ink-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Daymark personal chief of staff</span>
          <span>Emails, calendar, forms, and payments are simulated locally until approved.</span>
        </div>
      </footer>

      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
