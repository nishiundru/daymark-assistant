import { ArrowRight, Loader2, Lock, Mail, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CalendarEvent, MailMessage, PermissionSettings, TaskItem } from '../types';

interface MailViewProps {
  mails: MailMessage[];
  calendarEvents: CalendarEvent[];
  permissions: PermissionSettings;
  onAnalyzeNewEmail: (
    mail: MailMessage,
    stagedTask: TaskItem | null
  ) => void;
  onUpdateExistingMail: (
    mailId: string,
    observation: string,
    facts: Array<{ label: string; value: string }>
  ) => void;
  onOpenTask: (taskId: string) => void;
  onOpenPrivacy: () => void;
}

const SAMPLE_RAW_EMAILS = [
  {
    label: 'Sample: Airline delay refund',
    sender: 'Pacific Air Customer Care <care@pacificair.example>',
    subject: 'Flight PA-418 delayed 3h 20m — Travel credit or refund available',
    body: `Dear Clara Bennett,

Your flight PA-418 from Seattle to San Francisco on Nov 22 (Booking Confirmation K9M4PX) departed 3 hours and 20 minutes behind schedule due to crew scheduling.

Under our delay policy, passengers on flights delayed over 3 hours may request a $145.00 refund to the original card or a $175 travel voucher within 14 days. Reply to refunds@pacificair.example with confirmation code K9M4PX and your preferred option.`,
  },
  {
    label: 'Sample: Clinic reschedule note',
    sender: 'Cascadia Dermatology <appointments@cascadiaderm.example>',
    subject: 'Follow-up skin check scheduling (Dec 2 or Dec 4)',
    body: `Hello Clara,

Dr. Lin would like to schedule your annual 30-minute checkup. We currently have openings on:
- Wednesday, Dec 2 at 11:00 AM
- Friday, Dec 4 at 2:30 PM

Please reply to confirm which slot fits your calendar.`,
  },
];

export function MailView({
  mails,
  calendarEvents,
  permissions,
  onAnalyzeNewEmail,
  onUpdateExistingMail,
  onOpenTask,
  onOpenPrivacy,
}: MailViewProps) {
  const [selectedMailId, setSelectedMailId] = useState<string>(mails[0]?.id ?? '');
  const [composerOpen, setComposerOpen] = useState(false);
  const [rawSender, setRawSender] = useState('');
  const [rawSubject, setRawSubject] = useState('');
  const [rawBody, setRawBody] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRereading, setIsRereading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedMail = mails.find((m) => m.id === selectedMailId) ?? mails[0] ?? null;
  const isPaused = permissions.email === 'paused';

  const calendarSummary = calendarEvents
    .map((e) => `${e.dayLabel} ${e.startTime}-${e.endTime}: ${e.title}`)
    .join('; ');

  const handleAnalyzeCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!rawBody.trim()) {
      setErrorMsg('Paste an email, receipt, or notice for Daymark to read.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/assistant/analyze-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: rawSender.trim() || 'Forwarded message',
          subject: rawSubject.trim() || 'Incoming item',
          rawEmailText: rawBody.trim(),
          calendarSummary,
          emailPermission: permissions.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not analyze email.');
      }

      const a = data.analysis;
      const newTaskId = `task-mail-${Date.now()}`;
      const newMailId = `mail-${Date.now()}`;

      const validCategories = ['refund', 'bill', 'appointment', 'form', 'subscription'];
      const category = validCategories.includes(a.category) ? a.category : 'refund';

      const newTask: TaskItem | null =
        permissions.email === 'read_only'
          ? null
          : {
              id: newTaskId,
              title: a.proposedActionTitle,
              counterparty: a.counterparty,
              category,
              status: 'waiting',
              urgencyLabel: a.urgencyLabel,
              dueText: a.dueText,
              summary: a.summary,
              planSteps: Array.isArray(a.planSteps) && a.planSteps.length > 0 ? a.planSteps : [a.summary],
              dataUsed: [
                {
                  source: 'email',
                  label: 'Analyzed email',
                  detail: `${rawSubject.trim() || 'Incoming notice'} from ${rawSender.trim() || a.counterparty}`,
                },
              ],
              requiredSources: ['email'],
              approvalBoundary: a.approvalBoundary,
              requiresExplicitMoneyConfirm: Boolean(a.requiresExplicitMoneyConfirm),
              payload:
                category === 'bill' && typeof a.amount === 'number' && a.amount > 0
                  ? {
                      kind: 'bill',
                      payee: a.counterparty,
                      accountMasked: 'Account from email',
                      paymentSource: 'Checking #1104-4821',
                      amount: a.amount,
                      previousAmount: a.amount,
                      dueDate: a.dueText,
                      scheduledDate: 'Tomorrow',
                      memo: a.proposedActionTitle,
                    }
                  : category === 'appointment' && a.proposedSlot
                    ? {
                        kind: 'appointment',
                        provider: a.counterparty,
                        location: 'From email notice',
                        selectedSlot: a.proposedSlot,
                        availableSlots: [a.proposedSlot, 'Alternate morning slot'],
                        noteToOffice: a.draftBody || a.summary,
                      }
                    : {
                        kind: 'email',
                        to: a.draftTo || 'recipient@example.com',
                        subject: a.draftSubject || a.proposedActionTitle,
                        body: a.draftBody || a.summary,
                      },
            };

      const newMail: MailMessage = {
        id: newMailId,
        fromName: rawSender.split('<')[0].trim() || a.counterparty,
        fromAddress: rawSender.match(/<([^>]+)>/)?.[1] || 'sender@example.com',
        subject: rawSubject.trim() || a.proposedActionTitle,
        receivedAt: 'Just now',
        rawBody: rawBody.trim(),
        triageLabel: a.anomalyOrOpportunity,
        assistantObservation: a.summary,
        extractedFacts: Array.isArray(a.keyFacts) ? a.keyFacts : [],
        linkedTaskId: newTask?.id,
      };

      onAnalyzeNewEmail(newMail, newTask);
      setSelectedMailId(newMailId);
      setComposerOpen(false);
      setRawSender('');
      setRawSubject('');
      setRawBody('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to analyze email.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRereadSelected = async () => {
    if (!selectedMail) return;
    setErrorMsg(null);
    setIsRereading(true);
    try {
      const response = await fetch('/api/assistant/analyze-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: `${selectedMail.fromName} <${selectedMail.fromAddress}>`,
          subject: selectedMail.subject,
          rawEmailText: selectedMail.rawBody,
          calendarSummary,
          emailPermission: permissions.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not re-read email.');
      }
      const a = data.analysis;
      onUpdateExistingMail(
        selectedMail.id,
        `${a.summary} (${a.anomalyOrOpportunity})`,
        Array.isArray(a.keyFacts) ? a.keyFacts : selectedMail.extractedFacts
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to re-read email.');
    } finally {
      setIsRereading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Mail reading & extraction
          </h1>
          <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
            See the exact incoming emails Daymark read, what facts and deadlines it extracted, and
            paste any new email or bill notice for live reading.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setComposerOpen((prev) => !prev);
            setErrorMsg(null);
          }}
          disabled={isPaused}
          className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white whitespace-nowrap shrink-0 hover:bg-[var(--color-accent-hover)] cursor-pointer lg:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{composerOpen ? 'Close reader input' : 'Feed email to Daymark'}</span>
        </button>
      </div>

      {isPaused && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-[var(--color-warn)]/40 bg-[var(--color-warn-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-[var(--color-ink)]">Email reading is paused</p>
              <p className="text-[var(--color-ink-muted)]">
                Daymark cannot read incoming messages or extract new drafts while Email inbox
                access is paused.
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

      {/* Paste / Forward Email Form */}
      {composerOpen && !isPaused && (
        <form
          onSubmit={handleAnalyzeCustom}
          className="rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-surface)] p-5 space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                Paste an email, receipt, or notice for Daymark to read
              </h2>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Daymark reads the raw text, checks your calendar, extracts key dates/amounts, and
                stages an approval-ready draft.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_RAW_EMAILS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setRawSender(sample.sender);
                    setRawSubject(sample.subject);
                    setRawBody(sample.body);
                  }}
                  className="inline-flex h-9 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap cursor-pointer"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="mail-sender" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                From
              </label>
              <input
                id="mail-sender"
                type="text"
                value={rawSender}
                onChange={(e) => setRawSender(e.target.value)}
                placeholder="e.g., Pacific Air <care@pacificair.example>"
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
              />
            </div>
            <div>
              <label htmlFor="mail-subject" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                Subject
              </label>
              <input
                id="mail-subject"
                type="text"
                value={rawSubject}
                onChange={(e) => setRawSubject(e.target.value)}
                placeholder="e.g., Delayed flight refund notice"
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mail-body" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              Raw email or receipt text
            </label>
            <textarea
              id="mail-body"
              rows={5}
              value={rawBody}
              onChange={(e) => setRawBody(e.target.value)}
              placeholder="Paste any airline delay notice, utility bill, clinic invite, or receipt..."
              className="mt-1 w-full rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] whitespace-nowrap cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Reading & extracting...</span>
                </>
              ) : (
                <span>Read & stage draft</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Two-pane Mail Reader + Extraction */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] lg:grid-cols-12">
        {/* Left: Inbox list */}
        <div className="border-b border-[var(--color-rule)] lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--color-rule)] px-5 py-3 text-xs font-medium text-[var(--color-ink-muted)]">
            {mails.length} messages scanned ({permissions.email.replace(/_/g, ' ')})
          </div>
          <ul aria-label="Scanned inbox messages" className="divide-y divide-[var(--color-rule)]">
            {mails.map((mail) => {
              const selected = selectedMail?.id === mail.id;
              return (
                <li key={mail.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMailId(mail.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={`w-full px-5 py-4 text-left transition-colors duration-150 cursor-pointer ${
                      selected
                        ? 'bg-[var(--color-surface-muted)]'
                        : 'bg-[var(--color-surface)] hover:bg-[var(--color-paper)]/70'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-[var(--color-ink)]">
                        {mail.fromName}
                      </span>
                      <span className="font-mono-tabular shrink-0 text-xs text-[var(--color-ink-subtle)]">
                        {mail.receivedAt}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-[var(--color-ink)]">
                      {mail.subject}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[var(--color-accent)]">
                      {mail.triageLabel}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: Raw email + What Daymark extracted */}
        {selectedMail && (
          <div className="lg:col-span-8 p-5 sm:p-6 space-y-6">
            {/* Email header */}
            <div className="space-y-1.5 border-b border-[var(--color-rule)] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)]">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{selectedMail.fromAddress}</span>
                </span>
                <span className="font-mono-tabular text-xs text-[var(--color-ink-subtle)]">
                  {selectedMail.receivedAt}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">
                {selectedMail.subject}
              </h2>
            </div>

            {/* Daymark's Reading & Extraction */}
            <div className="rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-paper)] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    What Daymark read & extracted
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleRereadSelected}
                  disabled={isRereading || isPaused}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap cursor-pointer"
                >
                  {isRereading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Re-reading...</span>
                    </>
                  ) : (
                    <span>Re-read with Daymark</span>
                  )}
                </button>
              </div>

              <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                {selectedMail.assistantObservation}
              </p>

              <dl className="grid grid-cols-1 gap-3 border-t border-[var(--color-rule)] pt-3 sm:grid-cols-2">
                {selectedMail.extractedFacts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`}>
                    <dt className="text-xs text-[var(--color-ink-muted)]">{fact.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {selectedMail.linkedTaskId && (
                <div className="flex items-center justify-between border-t border-[var(--color-rule)] pt-3">
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    Staged in your approval queue. Nothing sent yet.
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenTask(selectedMail.linkedTaskId!)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    <span>Review staged draft</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Raw Email Body */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--color-ink-muted)]">
                Original email body
              </h3>
              <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
                  {selectedMail.rawBody}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
