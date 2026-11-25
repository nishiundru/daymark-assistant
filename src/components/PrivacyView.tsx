import { Lock, RotateCcw, Shield } from 'lucide-react';
import { useState } from 'react';
import {
  BillingAccessLevel,
  CalendarAccessLevel,
  EmailAccessLevel,
  GuardrailSettings,
  PermissionSettings,
  VaultAccessLevel,
} from '../types';

interface PrivacyViewProps {
  permissions: PermissionSettings;
  guardrails: GuardrailSettings;
  onUpdatePermission: <K extends keyof PermissionSettings>(
    key: K,
    value: PermissionSettings[K]
  ) => void;
  onToggleGuardrail: (key: Exclude<keyof GuardrailSettings, 'requireMoneyApproval'>) => void;
  onResetDemo: () => void;
}

export function PrivacyView({
  permissions,
  guardrails,
  onUpdatePermission,
  onToggleGuardrail,
  onResetDemo,
}: PrivacyViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Privacy & access
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-ink-muted)]">
          Choose exactly what Daymark can read and draft. Changes take effect across your approval
          queue immediately and are recorded in your activity log.
        </p>
      </div>

      {/* Connected Sources */}
      <section aria-labelledby="sources-heading" className="space-y-3">
        <div>
          <h2 id="sources-heading" className="text-lg font-semibold text-[var(--color-ink)]">
            Connected sources
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            In this prototype, all sources are simulated locally in your browser.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-rule)] rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
          {/* Email */}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <label htmlFor="perm-email" className="block text-base font-semibold text-[var(--color-ink)]">
                Email inbox
              </label>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Allows Daymark to spot receipts, delay notices, and appointment confirmations.
                Sending always waits for your approval.
              </p>
            </div>
            <select
              id="perm-email"
              value={permissions.email}
              onChange={(e) => onUpdatePermission('email', e.target.value as EmailAccessLevel)}
              className="h-10 min-w-[210px] rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-ink)]"
            >
              <option value="read_draft">Read & prepare drafts</option>
              <option value="read_only">Read-only triage</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Calendar */}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <label htmlFor="perm-calendar" className="block text-base font-semibold text-[var(--color-ink)]">
                Calendar
              </label>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Checks free and busy windows so Daymark can suggest appointment slots without
                exposing private event notes.
              </p>
            </div>
            <select
              id="perm-calendar"
              value={permissions.calendar}
              onChange={(e) =>
                onUpdatePermission('calendar', e.target.value as CalendarAccessLevel)
              }
              className="h-10 min-w-[210px] rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-ink)]"
            >
              <option value="read_propose">Read & propose slots</option>
              <option value="read_only">Read agenda only</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Bills & Statements */}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <label htmlFor="perm-billing" className="block text-base font-semibold text-[var(--color-ink)]">
                Bills & statements
              </label>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Compares monthly utility and card statements for spikes or duplicate charges, and
                stages drafts for you to review. Autonomous payments are permanently disabled.
              </p>
            </div>
            <select
              id="perm-billing"
              value={permissions.billing}
              onChange={(e) =>
                onUpdatePermission('billing', e.target.value as BillingAccessLevel)
              }
              className="h-10 min-w-[210px] rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-ink)]"
            >
              <option value="read_stage">Read & stage drafts</option>
              <option value="alerts_only">Due-date alerts only</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Personal Vault */}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <label htmlFor="perm-vault" className="block text-base font-semibold text-[var(--color-ink)]">
                Personal vault (IDs & address)
              </label>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Holds member numbers, vehicle plate, and mailing address for pre-filling claim and
                permit forms before you review.
              </p>
            </div>
            <select
              id="perm-vault"
              value={permissions.vault}
              onChange={(e) => onUpdatePermission('vault', e.target.value as VaultAccessLevel)}
              className="h-10 min-w-[210px] rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-ink)]"
            >
              <option value="prefill_with_approval">Pre-fill with approval</option>
              <option value="ask_each_time">Ask before reading</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </section>

      {/* Standing Safety Boundaries */}
      <section aria-labelledby="boundaries-heading" className="space-y-3">
        <div>
          <h2 id="boundaries-heading" className="text-lg font-semibold text-[var(--color-ink)]">
            Standing safety boundaries
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Clear rules governing what Daymark can never do on its own.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-rule)] rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
          {/* Locked Monetary Boundary */}
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <span className="text-base font-semibold text-[var(--color-ink)]">
                  Explicit approval for any money movement
                </span>
              </div>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Daymark can prepare a bill payment or fee form, but cannot authorize a transfer or
                charge without your confirmation.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] whitespace-nowrap shrink-0">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Always required</span>
            </span>
          </div>

          <GuardrailToggleRow
            id="rule-external-send"
            title="Require approval before sending any email or form"
            description="All drafted refund emails, clinic replies, and portal forms stay in your approval queue until confirmed."
            checked={guardrails.requireExternalSendApproval}
            onToggle={() => onToggleGuardrail('requireExternalSendApproval')}
          />

          <GuardrailToggleRow
            id="rule-calendar-hold"
            title="Require approval before adding calendar events"
            description="Daymark checks free slots passively and waits before placing new appointments on your schedule."
            checked={guardrails.requireCalendarHoldApproval}
            onToggle={() => onToggleGuardrail('requireCalendarHoldApproval')}
          />

          <GuardrailToggleRow
            id="rule-redact-numbers"
            title="Mask account numbers in previews"
            description="Displays only the last four digits of utility and checking references across your dashboard and queue."
            checked={guardrails.redactAccountNumbers}
            onToggle={() => onToggleGuardrail('redactAccountNumbers')}
          />

          <GuardrailToggleRow
            id="rule-archive-receipts"
            title="Auto-archive promotional receipts locally"
            description="Sorts non-actionable retail confirmations into a Receipts folder without deleting anything."
            checked={guardrails.autoArchiveReceipts}
            onToggle={() => onToggleGuardrail('autoArchiveReceipts')}
          />
        </div>
      </section>

      {/* Prototype Controls */}
      <section aria-labelledby="demo-controls-heading" className="space-y-3">
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 id="demo-controls-heading" className="text-base font-semibold text-[var(--color-ink)]">
              Prototype data & local storage
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Your approvals, edits, snoozes, and privacy choices are saved locally in this browser.
            </p>
          </div>

          {confirmReset ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onResetDemo();
                }}
                className="inline-flex h-10 items-center rounded-md bg-[var(--color-danger)] px-4 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
              >
                Confirm reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="inline-flex h-10 items-center rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] whitespace-nowrap shrink-0 cursor-pointer sm:self-auto"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset demo data</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

interface GuardrailToggleRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function GuardrailToggleRow({
  id,
  title,
  description,
  checked,
  onToggle,
}: GuardrailToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-5 sm:items-center">
      <div className="max-w-xl space-y-1">
        <label htmlFor={id} className="block text-base font-semibold text-[var(--color-ink)] cursor-pointer">
          {title}
        </label>
        <p className="text-sm text-[var(--color-ink-muted)]">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer ${
          checked
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
            : 'border-[var(--color-rule-strong)] bg-[var(--color-surface-muted)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
