import { CalendarEvent } from '../types';

export interface MailAnalysisOutput {
  category: string;
  counterparty: string;
  proposedActionTitle: string;
  dueText: string;
  urgencyLabel: string;
  summary: string;
  anomalyOrOpportunity: string;
  keyFacts: Array<{ label: string; value: string }>;
  planSteps: string[];
  approvalBoundary: string;
  requiresExplicitMoneyConfirm: boolean;
  draftTo: string;
  draftSubject: string;
  draftBody: string;
  amount?: number;
  proposedSlot?: string;
}

export interface CalendarAnalysisOutput {
  briefSummary: string;
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

export interface AskAssistantOutput {
  reply: string;
  shouldStageTask: boolean;
  taskCategory?: string;
  taskTitle?: string;
  counterparty?: string;
  dueText?: string;
  summary?: string;
  planSteps?: string[];
  approvalBoundary?: string;
  draftTo?: string;
  draftSubject?: string;
  draftBody?: string;
}

async function postJsonOrDetectStatic<T>(
  url: string,
  payload: unknown
): Promise<{ mode: 'server'; data: T } | { mode: 'static' }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { mode: 'static' };
  }

  const contentType = response.headers.get('content-type') || '';
  if (response.status === 404 || !contentType.includes('application/json')) {
    return { mode: 'static' };
  }

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || 'Assistant request failed.');
  }

  return { mode: 'server', data: json as T };
}

function staticAnalyzeMail(params: {
  sender: string;
  subject: string;
  rawEmailText: string;
  emailPermission: string;
}): MailAnalysisOutput {
  if (params.emailPermission === 'paused') {
    throw new Error(
      'Email inbox reading is paused in Privacy & access. Resume access to analyze mail.'
    );
  }

  const text = `${params.subject}\n${params.rawEmailText}`;
  const lower = text.toLowerCase();

  const amountMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : undefined;
  const emailMatch = params.rawEmailText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const senderEmailMatch = params.sender.match(/<([^>]+)>/) || params.sender.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const replyTo = emailMatch?.[0] || senderEmailMatch?.[1] || senderEmailMatch?.[0] || 'support@example.com';

  const senderName =
    params.sender.split('<')[0].trim() ||
    (replyTo.split('@')[1]?.split('.')[0] ?? 'Sender').replace(/^./, (c) => c.toUpperCase());

  const refMatch = text.match(/(?:ref(?:erence)?|booking|confirmation|code|invoice|account|#)[:\s#]*([A-Z0-9-]{4,14})/i);
  const dateMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i);

  let category = 'refund';
  let proposedActionTitle = `Follow up with ${senderName}`;
  let anomalyOrOpportunity = 'Actionable notice extracted locally (static mode)';
  let requiresExplicitMoneyConfirm = false;
  let proposedSlot: string | undefined;

  if (lower.includes('delay') || lower.includes('refund') || lower.includes('duplicate') || lower.includes('compensation')) {
    category = 'refund';
    proposedActionTitle = `Request ${amount ? `$${amount.toFixed(2)} ` : ''}refund from ${senderName}`;
    anomalyOrOpportunity = amount
      ? `Potential $${amount.toFixed(2)} refund detected (static mode)`
      : 'Refund opportunity detected (static mode)';
  } else if (lower.includes('appointment') || lower.includes('reschedule') || lower.includes('slot') || lower.includes('dr.')) {
    category = 'appointment';
    proposedActionTitle = `Confirm appointment with ${senderName}`;
    proposedSlot = dateMatch ? `${dateMatch[0]} (morning window)` : 'Thu, Dec 3 at 10:30 AM';
    anomalyOrOpportunity = 'Scheduling request matched (static mode)';
  } else if (lower.includes('due') || lower.includes('statement') || lower.includes('bill') || lower.includes('payment')) {
    category = 'bill';
    requiresExplicitMoneyConfirm = true;
    proposedActionTitle = `Review ${senderName} bill${amount ? ` ($${amount.toFixed(2)})` : ''}`;
    anomalyOrOpportunity = amount
      ? `Bill due: $${amount.toFixed(2)} (static mode)`
      : 'Bill statement staged (static mode)';
  } else if (lower.includes('renew') || lower.includes('subscription')) {
    category = 'subscription';
    proposedActionTitle = `Review ${senderName} renewal`;
    anomalyOrOpportunity = 'Renewal check staged (static mode)';
  }

  const keyFacts: Array<{ label: string; value: string }> = [
    { label: 'Counterparty', value: senderName },
  ];
  if (amount !== undefined) {
    keyFacts.push({ label: 'Amount spotted', value: `$${amount.toFixed(2)}` });
  }
  if (refMatch?.[1]) {
    keyFacts.push({ label: 'Reference', value: refMatch[1] });
  }
  if (dateMatch?.[0]) {
    keyFacts.push({ label: 'Date mentioned', value: dateMatch[0] });
  }

  return {
    category,
    counterparty: senderName,
    proposedActionTitle,
    dueText: dateMatch?.[0] ? `Due ${dateMatch[0]}` : 'Review soon',
    urgencyLabel: 'Extracted locally in static GitHub Pages mode',
    summary: `Read message from ${senderName} (${params.subject}). Extracted key facts and staged a draft for your review.`,
    anomalyOrOpportunity,
    keyFacts,
    planSteps: [
      `Extract key dates, references, and amounts from ${senderName}'s notice.`,
      'Stage a draft response or payment for your explicit approval.',
    ],
    approvalBoundary: requiresExplicitMoneyConfirm
      ? 'Requires explicit monetary approval. Daymark never moves funds autonomously.'
      : 'Requires your approval before sending any external reply.',
    requiresExplicitMoneyConfirm,
    draftTo: replyTo,
    draftSubject: `Re: ${params.subject}`,
    draftBody: `Hello ${senderName} team,\n\nRegarding "${params.subject}"${refMatch?.[1] ? ` (Ref: ${refMatch[1]})` : ''}${amount ? ` for $${amount.toFixed(2)}` : ''}, please confirm next steps.\n\nThank you,\nClara Bennett`,
    amount,
    proposedSlot,
  };
}

function staticAnalyzeCalendar(params: {
  events: CalendarEvent[];
  focusGoal: string;
  calendarPermission: string;
}): CalendarAnalysisOutput {
  if (params.calendarPermission === 'paused') {
    throw new Error(
      'Calendar access is paused in Privacy & access. Resume calendar access to run schedule analysis.'
    );
  }

  const conflicts = params.events
    .filter((ev) => Boolean(ev.conflictNote))
    .map((ev) => ({
      dateLabel: `${ev.dayLabel} (${ev.startTime})`,
      issue: ev.conflictNote || 'Tight transition between back-to-back events.',
      suggestion: 'Add a 30-minute travel buffer or shift one block.',
    }));

  const goal = params.focusGoal.trim();
  return {
    briefSummary: goal
      ? `Static GitHub Pages analysis for "${goal}": your cleanest open blocks are Wed Nov 25 afternoon (1:00 PM to 4:00 PM) and Thu Dec 3 morning (10:00 AM to 12:30 PM).`
      : 'Static GitHub Pages analysis: Wed Nov 25 afternoon and Thu Dec 3 morning remain your clearest unscheduled blocks.',
    conflicts,
    recommendedWindows: [
      {
        dayLabel: 'Wed, Nov 25',
        timeWindow: '01:00 PM to 04:00 PM',
        bestFor: goal || 'Errands, phone calls, or 60-minute appointments',
      },
      {
        dayLabel: 'Thu, Dec 3',
        timeWindow: '10:00 AM to 12:30 PM',
        bestFor: 'Harbor Dental cleaning and calm morning blocks',
      },
    ],
    suggestedHoldTitle: goal ? `Scheduled block: ${goal.slice(0, 40)}` : 'Admin & errand block',
    suggestedHoldSlot: 'Wed, Nov 25 at 1:30 PM',
    suggestedHoldNote: 'Proposed locally from open afternoon window (static GitHub Pages mode).',
  };
}

function staticAskAssistant(params: {
  requestText: string;
  context: {
    waitingTasks?: Array<{ title: string; counterparty: string; dueText: string }>;
    upcomingBills?: Array<{ payee: string; dueDate: string; amount: number; status: string }>;
  };
}): AskAssistantOutput {
  const q = params.requestText.trim();
  const lower = q.toLowerCase();

  if (lower.includes('bill') || lower.includes('owe') || lower.includes('pay')) {
    const openBills = (params.context.upcomingBills || []).filter(
      (b) => b.status !== 'paid_simulated'
    );
    const total = openBills.reduce((s, b) => s + b.amount, 0);
    const list = openBills
      .map((b) => `${b.payee} ($${b.amount.toFixed(2)}, due ${b.dueDate})`)
      .join('; ');
    return {
      reply: `You have ${openBills.length} open bills totaling $${total.toFixed(2)}: ${list}. Pacific Gas & Electric is waiting in Approvals for your explicit confirmation.`,
      shouldStageTask: false,
    };
  }

  if (lower.includes('schedule') || lower.includes('free') || lower.includes('calendar') || lower.includes('dec')) {
    return {
      reply:
        'Looking at your schedule, Wed Nov 25 (1:00 PM to 4:00 PM) and Thu Dec 3 (10:00 AM to 12:30 PM) are completely open. Avoid Thu Nov 26 afternoon, which already has a tight transit transition.',
      shouldStageTask: false,
    };
  }

  return {
    reply: `I prepared a draft based on your request ("${q}") in static GitHub Pages mode and staged it in Approvals so you can edit or confirm before anything is sent.`,
    shouldStageTask: true,
    taskCategory: 'refund',
    taskTitle: q.length > 52 ? `${q.slice(0, 49)}...` : q,
    counterparty: 'Requested draft',
    dueText: 'Ready for review',
    summary: `Drafted from your request: "${q}"`,
    planSteps: [
      'Review and customize the recipient and message text.',
      'Approve in the queue when ready to simulate sending.',
    ],
    approvalBoundary: 'Requires your explicit approval before sending.',
    draftTo: 'contact@example.com',
    draftSubject: `Follow-up: ${q.slice(0, 48)}`,
    draftBody: `Hello,\n\n${q}\n\nBest regards,\nClara Bennett`,
  };
}

export async function analyzeMailRequest(params: {
  sender: string;
  subject: string;
  rawEmailText: string;
  calendarSummary: string;
  emailPermission: string;
}): Promise<{ analysis: MailAnalysisOutput; mode: 'server' | 'static' }> {
  const res = await postJsonOrDetectStatic<{ analysis: MailAnalysisOutput }>(
    '/api/assistant/analyze-mail',
    params
  );
  if (res.mode === 'server') {
    return { analysis: res.data.analysis, mode: 'server' };
  }
  return { analysis: staticAnalyzeMail(params), mode: 'static' };
}

export async function analyzeCalendarRequest(params: {
  events: CalendarEvent[];
  pendingAppointments: unknown[];
  focusGoal: string;
  calendarPermission: string;
}): Promise<{ analysis: CalendarAnalysisOutput; mode: 'server' | 'static' }> {
  const res = await postJsonOrDetectStatic<{ analysis: CalendarAnalysisOutput }>(
    '/api/assistant/analyze-calendar',
    params
  );
  if (res.mode === 'server') {
    return { analysis: res.data.analysis, mode: 'server' };
  }
  return { analysis: staticAnalyzeCalendar(params), mode: 'static' };
}

export async function askAssistantRequest(params: {
  requestText: string;
  context: {
    waitingTasks?: Array<{ title: string; counterparty: string; dueText: string }>;
    upcomingBills?: Array<{ payee: string; dueDate: string; amount: number; status: string }>;
    calendarEvents?: unknown[];
    recentMails?: unknown[];
    permissions?: unknown;
  };
}): Promise<{ result: AskAssistantOutput; mode: 'server' | 'static' }> {
  const res = await postJsonOrDetectStatic<{ result: AskAssistantOutput }>(
    '/api/assistant/ask',
    params
  );
  if (res.mode === 'server') {
    return { result: res.data.result, mode: 'server' };
  }
  return { result: staticAskAssistant(params), mode: 'static' };
}
