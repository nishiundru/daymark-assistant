export type NavTab = 'briefing' | 'mail' | 'calendar' | 'queue' | 'privacy';

export type QueueSubTab = 'waiting' | 'snoozed' | 'resolved' | 'activity';

export type TaskCategory = 'refund' | 'appointment' | 'bill' | 'form' | 'subscription';

export type TaskStatus = 'waiting' | 'snoozed' | 'approved' | 'rejected';

export type PermissionSource = 'email' | 'calendar' | 'billing' | 'vault';

export type EmailAccessLevel = 'read_draft' | 'read_only' | 'paused';
export type CalendarAccessLevel = 'read_propose' | 'read_only' | 'paused';
export type BillingAccessLevel = 'read_stage' | 'alerts_only' | 'paused';
export type VaultAccessLevel = 'prefill_with_approval' | 'ask_each_time' | 'locked';

export interface PermissionSettings {
  email: EmailAccessLevel;
  calendar: CalendarAccessLevel;
  billing: BillingAccessLevel;
  vault: VaultAccessLevel;
}

export interface GuardrailSettings {
  requireMoneyApproval: true;
  requireExternalSendApproval: boolean;
  requireCalendarHoldApproval: boolean;
  redactAccountNumbers: boolean;
  autoArchiveReceipts: boolean;
}

export interface DataSourceUsage {
  source: PermissionSource;
  label: string;
  detail: string;
}

export interface EmailPayload {
  kind: 'email';
  to: string;
  subject: string;
  body: string;
  attachmentLabel?: string;
}

export interface AppointmentPayload {
  kind: 'appointment';
  provider: string;
  location: string;
  selectedSlot: string;
  availableSlots: string[];
  noteToOffice: string;
}

export interface BillPayload {
  kind: 'bill';
  payee: string;
  accountMasked: string;
  paymentSource: string;
  amount: number;
  previousAmount: number;
  dueDate: string;
  scheduledDate: string;
  memo: string;
}

export interface FormPayload {
  kind: 'form';
  portalName: string;
  fields: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}

export type TaskPayload = EmailPayload | AppointmentPayload | BillPayload | FormPayload;

export interface TaskItem {
  id: string;
  title: string;
  counterparty: string;
  category: TaskCategory;
  status: TaskStatus;
  urgencyLabel: string;
  dueText: string;
  summary: string;
  planSteps: string[];
  dataUsed: DataSourceUsage[];
  requiredSources: PermissionSource[];
  approvalBoundary: string;
  requiresExplicitMoneyConfirm?: boolean;
  snoozedUntil?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  wasEdited?: boolean;
  payload: TaskPayload;
}

export interface MailMessage {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  receivedAt: string;
  rawBody: string;
  triageLabel: string;
  assistantObservation: string;
  extractedFacts: Array<{ label: string; value: string }>;
  linkedTaskId?: string;
}

export interface CalendarEvent {
  id: string;
  dayLabel: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  kind: 'work' | 'personal' | 'errand' | 'proposed';
  assistantNote?: string;
  conflictNote?: string;
  linkedTaskId?: string;
}

export interface CalendarAnalysisReport {
  briefSummary: string;
  analyzedAt: string;
  conflicts: Array<{
    dateLabel: string;
    issue: string;
    suggestion: string;
  }>;
  recommendedWindows: Array<{
    dayLabel: string;
    timeWindow: string;
    bestFor: string;
  }>;
  suggestedHoldTitle?: string;
  suggestedHoldSlot?: string;
  suggestedHoldNote?: string;
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  location: string;
  prepNote: string;
  completed: boolean;
  linkedTaskId?: string;
}

export interface BillItem {
  id: string;
  payee: string;
  category: string;
  dueDate: string;
  amount: number;
  status: 'needs_approval' | 'scheduled_simulated' | 'paid_simulated';
  linkedTaskId?: string;
}

export type ActivityType = 'approved' | 'prep' | 'decision' | 'privacy';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  type: ActivityType;
  title: string;
  detail: string;
  simulatedOutcome: string;
  sourcesUsed: string[];
  taskId?: string;
}

export interface DaymarkState {
  userName: string;
  tasks: TaskItem[];
  mails: MailMessage[];
  calendarEvents: CalendarEvent[];
  calendarAnalysis: CalendarAnalysisReport;
  agenda: AgendaItem[];
  bills: BillItem[];
  activity: ActivityEntry[];
  permissions: PermissionSettings;
  guardrails: GuardrailSettings;
  simulatedQueueIndex: number;
}
