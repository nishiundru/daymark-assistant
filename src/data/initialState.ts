import { DaymarkState, TaskItem } from '../types';

export const INITIAL_STATE: DaymarkState = {
  userName: 'Clara',
  mails: [
    {
      id: 'mail-brighton-delay',
      fromName: 'Brighton Rail Service Alerts',
      fromAddress: 'alerts@brightonrail.example',
      subject: 'Delay notice: 17:42 Coastal Express (Nov 19)',
      receivedAt: 'Today, 07:45 AM',
      triageLabel: 'Refund eligible ($34.50)',
      assistantObservation:
        'Matched this 48-minute delay notice against your Nov 19 ticket receipt (BR-88412). Delay Repay covers a 100% single-fare refund when delays exceed 30 minutes, so I drafted the claim email for your approval.',
      extractedFacts: [
        { label: 'Booking reference', value: 'BR-88412' },
        { label: 'Arrival delay', value: '48 minutes (Platform 4)' },
        { label: 'Eligible refund', value: '$34.50' },
        { label: 'Claim deadline', value: 'Nov 28, 2026' },
      ],
      linkedTaskId: 'task-refund-brighton',
      rawBody: `Service Update for Passengers on the 17:42 Coastal Express (Nov 19):

Due to signal maintenance outside Westgate Junction, the 17:42 departure arrived at Brighton Central at 19:21 — 48 minutes behind its scheduled 18:33 arrival.

Passengers holding valid single or return tickets for this service (including online bookings such as BR-88412) are eligible for Delay Repay compensation within 9 days of travel. Submit your ticket PDF and booking code to claims@brightonrail.example.`,
    },
    {
      id: 'mail-pge-bill',
      fromName: 'Pacific Gas & Electric',
      fromAddress: 'billing@pge.example',
      subject: 'Your November energy statement is ready ($118.40)',
      receivedAt: 'Today, 07:10 AM',
      triageLabel: 'Bill spike (+$9.20)',
      assistantObservation:
        'Verified your meter reading against October ($109.20). The $9.20 increase reflects cooler evening heating rather than a billing error. Staged a payment draft for Nov 27 — waiting for your explicit monetary confirmation.',
      extractedFacts: [
        { label: 'Statement total', value: '$118.40' },
        { label: 'Prior month', value: '$109.20 (+$9.20)' },
        { label: 'Due date', value: 'Nov 29, 2026' },
        { label: 'Account', value: 'Utility Acct ending in 7719' },
      ],
      linkedTaskId: 'task-bill-pge',
      rawBody: `Hello Clara Bennett,

Your Pacific Gas & Electric statement for the billing period October 18 to November 17, 2026 is now available.

Account: 8402-7719
Total Amount Due: $118.40
Payment Due Date: November 29, 2026
Meter Usage: 412 kWh electric / 28 therms gas (compared with 384 kWh / 22 therms last month).

Please schedule payment prior to November 29 to avoid late fees.`,
    },
    {
      id: 'mail-harbor-dental',
      fromName: 'Harbor Dental Clinic',
      fromAddress: 'frontdesk@harbordental.example',
      subject: 'Openings for your 6-month cleaning with Dr. Patel',
      receivedAt: 'Yesterday, 04:20 PM',
      triageLabel: 'Calendar matched',
      assistantObservation:
        'Cross-checked all three clinic openings against your December calendar. Fri Dec 4 conflicts with your 2:00 PM Architecture Review, and Mon Dec 7 leaves only 15 minutes before standup. Thu Dec 3 at 10:30 AM sits cleanly inside a 2.5-hour free window.',
      extractedFacts: [
        { label: 'Provider', value: 'Dr. Maya Patel (420 Pier Ave)' },
        { label: 'Offered slots', value: 'Dec 3 (10:30 AM), Dec 4 (2:15 PM), Dec 7 (9:00 AM)' },
        { label: 'Best calendar fit', value: 'Thu, Dec 3 at 10:30 AM' },
        { label: 'Clinic hold expires', value: 'Tomorrow, 5:00 PM' },
      ],
      linkedTaskId: 'task-appt-dental',
      rawBody: `Hi Clara,

It is time for your routine 6-month cleaning and exam with Dr. Maya Patel at Harbor Dental Clinic (420 Pier Ave, Suite 210).

We are holding three 45-minute openings for you until tomorrow at 5:00 PM:
1. Thursday, Dec 3 at 10:30 AM
2. Friday, Dec 4 at 2:15 PM
3. Monday, Dec 7 at 9:00 AM

Reply with your preferred time and let us know if your Clearview insurance details have changed.`,
    },
    {
      id: 'mail-mercer-optical',
      fromName: 'Mercer Optical',
      fromAddress: 'receipts@merceroptical.example',
      subject: 'Itemized receipt #MO-2091 ($165.00)',
      receivedAt: 'Nov 22, 03:15 PM',
      triageLabel: 'Reimbursement form pre-filled',
      assistantObservation:
        'Pulled the service date, provider name, and $165.00 lens total from your receipt and paired them with your Clearview Member ID from your Vault. Form is pre-filled and waiting for your review.',
      extractedFacts: [
        { label: 'Receipt total', value: '$165.00' },
        { label: 'Invoice ID', value: 'MO-2091' },
        { label: 'Service date', value: 'Nov 14, 2026' },
        { label: 'Vault match', value: 'Clearview Member CV-409182' },
      ],
      linkedTaskId: 'task-form-vision',
      rawBody: `Mercer Optical — Seattle
Itemized Patient Receipt #MO-2091
Date of Service: November 14, 2026
Patient: Clara Bennett
Service: High-index single-vision prescription lenses (out-of-network)
Amount Paid: $165.00 (Card ending in 8820)

Retain this itemized receipt for your vision benefit reimbursement filing within 30 days.`,
    },
    {
      id: 'mail-cloudvault',
      fromName: 'CloudVault Billing',
      fromAddress: 'billing@cloudvault.example',
      subject: 'Upcoming annual renewal on Dec 1 ($96.00)',
      receivedAt: 'Nov 21, 09:05 AM',
      triageLabel: 'Savings check ($72/yr)',
      assistantObservation:
        'You are paying $96/yr for 2 TB while using 140 GB. Drafted a downgrade request to the 200 GB plan ($24/yr) — currently snoozed at your request until tomorrow morning.',
      extractedFacts: [
        { label: 'Renewal charge', value: '$96.00 on Dec 1' },
        { label: 'Current usage', value: '140 GB of 2,000 GB' },
        { label: 'Potential savings', value: '$72.00 per year' },
      ],
      linkedTaskId: 'task-sub-cloudvault',
      rawBody: `Your CloudVault Backup 2 TB Annual Plan (Account CV-912) is scheduled to renew automatically on December 1, 2026 for $96.00.

Current Storage Used: 140.4 GB
If you wish to downgrade to our 200 GB Essential plan ($24.00/year) or cancel before renewal, please contact billing@cloudvault.example at least 48 hours prior to December 1.`,
    },
    {
      id: 'mail-oakridge-rx',
      fromName: 'Oakridge Pharmacy',
      fromAddress: 'notifications@oakridgepharmacy.example',
      subject: 'Prescription ready for pickup (Copay $12.00)',
      receivedAt: 'Today, 08:15 AM',
      triageLabel: 'Added to Today’s agenda',
      assistantObservation:
        'No reply needed. Added the $12.00 copay and store hours note directly onto your 12:30 PM calendar pickup reminder.',
      extractedFacts: [
        { label: 'Pickup window', value: 'Today after 9:00 AM' },
        { label: 'Copay', value: '$12.00' },
        { label: 'Action taken', value: 'Read-only agenda note updated' },
      ],
      rawBody: `Oakridge Pharmacy Notification:
Your prescription #RX-7721 is ready for pickup at 118 Oakridge Way.
Estimated Copay: $12.00
Pharmacy Hours Today: 8:30 AM – 7:00 PM.`,
    },
  ],
  calendarEvents: [
    {
      id: 'cal-1',
      dayLabel: 'Tue, Nov 24 (Today)',
      dateKey: '2026-11-24',
      startTime: '09:30 AM',
      endTime: '10:00 AM',
      title: 'Elm Street Insurance renewal call',
      location: 'Phone: +1 (206) 555-0148',
      kind: 'personal',
      assistantNote: 'Policy #ES-4410 summary staged for call.',
    },
    {
      id: 'cal-2',
      dayLabel: 'Tue, Nov 24 (Today)',
      dateKey: '2026-11-24',
      startTime: '12:30 PM',
      endTime: '01:00 PM',
      title: 'Pick up prescription at Oakridge Pharmacy',
      location: '118 Oakridge Way',
      kind: 'errand',
      assistantNote: 'Daymark added $12.00 copay note from 08:15 AM pharmacy email.',
    },
    {
      id: 'cal-3',
      dayLabel: 'Tue, Nov 24 (Today)',
      dateKey: '2026-11-24',
      startTime: '04:00 PM',
      endTime: '04:30 PM',
      title: 'Submit HOA gate latch maintenance note',
      location: 'Resident portal',
      kind: 'errand',
    },
    {
      id: 'cal-4',
      dayLabel: 'Wed, Nov 25',
      dateKey: '2026-11-25',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      title: 'Quarterly budget & vendor review',
      location: 'Video call',
      kind: 'work',
    },
    {
      id: 'cal-5',
      dayLabel: 'Thu, Nov 26',
      dateKey: '2026-11-26',
      startTime: '01:30 PM',
      endTime: '02:30 PM',
      title: 'Downtown physical therapy check-in',
      location: '5th Ave Clinic',
      kind: 'personal',
      conflictNote: 'Zero travel buffer before 2:30 PM team sync on Eastside.',
    },
    {
      id: 'cal-6',
      dayLabel: 'Thu, Nov 26',
      dateKey: '2026-11-26',
      startTime: '02:30 PM',
      endTime: '03:15 PM',
      title: 'Product sprint sync',
      location: 'Office Room 3B',
      kind: 'work',
      conflictNote: 'Starts immediately as downtown clinic visit ends.',
    },
    {
      id: 'cal-7',
      dayLabel: 'Thu, Dec 3',
      dateKey: '2026-12-03',
      startTime: '10:30 AM',
      endTime: '11:15 AM',
      title: 'Proposed: Harbor Dental cleaning (Dr. Patel)',
      location: '420 Pier Ave, Suite 210',
      kind: 'proposed',
      assistantNote: 'Clear morning window 10:00 AM to 12:30 PM. Waiting for your approval.',
      linkedTaskId: 'task-appt-dental',
    },
    {
      id: 'cal-8',
      dayLabel: 'Fri, Dec 4',
      dateKey: '2026-12-04',
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      title: 'Architecture design review',
      location: 'Main conference room',
      kind: 'work',
      assistantNote: 'Blocked Harbor Dental 2:15 PM option due to overlap.',
    },
  ],
  calendarAnalysis: {
    briefSummary:
      'Your morning windows on Wed Nov 25 (after 11:30 AM) and Thu Dec 3 (10:00 AM to 12:30 PM) are your cleanest open blocks. One tight transit overlap stands out on Thu Nov 26 between your downtown clinic visit and your 2:30 PM office sync.',
    analyzedAt: 'Analyzed today at 08:20 AM',
    conflicts: [
      {
        dateLabel: 'Thu, Nov 26 (1:30 PM to 3:15 PM)',
        issue: 'Zero travel buffer between 5th Ave Clinic and your 2:30 PM office sync.',
        suggestion: 'Move the 2:30 PM sprint sync by 30 minutes or join remotely from nearby.',
      },
      {
        dateLabel: 'Fri, Dec 4 (2:15 PM clinic option)',
        issue: 'Harbor Dental offered 2:15 PM, which overlaps your Architecture design review.',
        suggestion: 'Excluded Fri Dec 4 and selected Thu Dec 3 at 10:30 AM instead.',
      },
    ],
    recommendedWindows: [
      {
        dayLabel: 'Thu, Dec 3',
        timeWindow: '10:00 AM to 12:30 PM',
        bestFor: 'Harbor Dental cleaning (45 min) with comfortable transit buffer',
      },
      {
        dayLabel: 'Wed, Nov 25',
        timeWindow: '01:00 PM to 04:00 PM',
        bestFor: 'Errands, calls, or focused admin catch-up',
      },
    ],
  },
  tasks: [
    {
      id: 'task-refund-brighton',
      title: 'Request delayed train refund',
      counterparty: 'Brighton Rail',
      category: 'refund',
      status: 'waiting',
      urgencyLabel: 'Claim window closes in 4 days',
      dueText: 'Due Nov 28',
      summary:
        'Your 17:42 commuter train arrived 48 minutes late on Nov 19. Daymark matched the delay notice against your ticket receipt and prepared a $34.50 refund email.',
      planSteps: [
        'Draft a delay-repay claim email to Brighton Rail Customer Relations.',
        'Attach booking reference BR-88412 and your Nov 19 e-ticket receipt.',
        'Wait for your confirmation before placing the message in Outbox.',
      ],
      dataUsed: [
        {
          source: 'email',
          label: 'Inbox receipt',
          detail: 'Ticket #BR-88412 ($34.50) from tickets@brightonrail.example',
        },
        {
          source: 'email',
          label: 'Service alert',
          detail: 'Nov 19 delay confirmation (48 min arrival delay, Platform 4)',
        },
      ],
      requiredSources: ['email'],
      approvalBoundary:
        'Requires your approval before sending an external email. No message is sent until you confirm.',
      payload: {
        kind: 'email',
        to: 'claims@brightonrail.example',
        subject: 'Delay Repay claim — Booking BR-88412 (Nov 19, 17:42)',
        body: `Hello Brighton Rail Claims team,

I am writing to request a Delay Repay refund for my journey on November 19, 2026 (17:42 departure, Booking Reference BR-88412).

The train arrived 48 minutes behind schedule, qualifying for a full single-fare refund of $34.50 under your Delay Repay policy. My ticket confirmation is attached for reference.

Please confirm once the refund has been processed back to the original card.

Thank you,
Clara Bennett`,
        attachmentLabel: 'BrightonRail_Receipt_BR88412.pdf (simulated)',
      },
    },
    {
      id: 'task-bill-pge',
      title: 'Approve November electric & gas bill',
      counterparty: 'Pacific Gas & Electric',
      category: 'bill',
      status: 'waiting',
      urgencyLabel: 'Due in 5 days',
      dueText: 'Due Nov 29',
      summary:
        'Your November utility statement is $118.40, which is $9.20 higher than October due to cooler evening heating. Daymark verified the meter read and staged a payment draft.',
      planSteps: [
        'Verify statement total ($118.40) against your October bill ($109.20).',
        'Stage a one-time payment from Checking ending in 4821 scheduled for Nov 27.',
        'Hold strictly in draft until you give explicit monetary approval.',
      ],
      dataUsed: [
        {
          source: 'billing',
          label: 'Utility statement',
          detail: 'Account ending in 7719, billing period Oct 18 to Nov 17 ($118.40)',
        },
        {
          source: 'billing',
          label: 'Payment method',
          detail: 'Checking ending in 4821 (read-only balance verified)',
        },
      ],
      requiredSources: ['billing'],
      approvalBoundary:
        'Requires explicit monetary approval. Daymark never moves funds or schedules bank transfers on its own.',
      requiresExplicitMoneyConfirm: true,
      payload: {
        kind: 'bill',
        payee: 'Pacific Gas & Electric',
        accountMasked: 'Utility Acct #8402-7719',
        paymentSource: 'Checking #1104-4821',
        amount: 118.4,
        previousAmount: 109.2,
        dueDate: 'Nov 29, 2026',
        scheduledDate: 'Nov 27, 2026',
        memo: 'November electricity & gas statement',
      },
    },
    {
      id: 'task-appt-dental',
      title: 'Confirm six-month dental cleaning',
      counterparty: 'Harbor Dental Clinic',
      category: 'appointment',
      status: 'waiting',
      urgencyLabel: 'Clinic holding slot until tomorrow',
      dueText: 'Reply by Nov 25',
      summary:
        'Harbor Dental offered three openings for your routine cleaning with Dr. Patel. Daymark checked your calendar and matched a clear morning slot.',
      planSteps: [
        'Cross-check clinic openings against your December calendar.',
        'Select Thu, Dec 3 at 10:30 AM (you have a clear window 10:00 AM to 12:30 PM).',
        'Wait for your confirmation before sending the booking reply and holding your calendar.',
      ],
      dataUsed: [
        {
          source: 'calendar',
          label: 'Calendar availability',
          detail: 'Free/busy check for Dec 3 to Dec 8 (event titles hidden)',
        },
        {
          source: 'email',
          label: 'Clinic message',
          detail: 'Recall notice from frontdesk@harbordental.example',
        },
      ],
      requiredSources: ['calendar', 'email'],
      approvalBoundary:
        'Requires your approval before replying to the clinic and adding an appointment to your calendar.',
      payload: {
        kind: 'appointment',
        provider: 'Dr. Maya Patel, Harbor Dental Clinic',
        location: '420 Pier Ave, Suite 210',
        selectedSlot: 'Thu, Dec 3 at 10:30 AM',
        availableSlots: [
          'Thu, Dec 3 at 10:30 AM',
          'Fri, Dec 4 at 2:15 PM',
          'Mon, Dec 7 at 9:00 AM',
        ],
        noteToOffice: 'Routine 6-month cleaning; no insurance changes since June.',
      },
    },
    {
      id: 'task-form-vision',
      title: 'Submit lens reimbursement claim',
      counterparty: 'Clearview Vision Benefit',
      category: 'form',
      status: 'waiting',
      urgencyLabel: 'Prepared from Nov 14 receipt',
      dueText: '30-day filing window',
      summary:
        'You paid $165.00 out-of-pocket for prescription lenses at Mercer Optical. Daymark pre-filled the out-of-network reimbursement form using your saved vision benefit ID.',
      planSteps: [
        'Extract service date, provider name, and receipt total from Mercer Optical PDF.',
        'Pre-fill member ID and mailing address from your local Vault.',
        'Pause at final submission so you can inspect every field before sending.',
      ],
      dataUsed: [
        {
          source: 'vault',
          label: 'Personal vault',
          detail: 'Clearview Member ID (CV-409182) and home address',
        },
        {
          source: 'email',
          label: 'Optical receipt',
          detail: 'Mercer Optical itemized invoice #MO-2091 ($165.00)',
        },
      ],
      requiredSources: ['vault', 'email'],
      approvalBoundary:
        'Requires your approval before submitting personal benefit details and receipt data.',
      payload: {
        kind: 'form',
        portalName: 'Clearview Member Reimbursement Portal (Simulated)',
        fields: [
          { id: 'member', label: 'Member ID', value: 'CV-409182' },
          { id: 'provider', label: 'Optometry provider', value: 'Mercer Optical, Seattle' },
          { id: 'serviceDate', label: 'Date of service', value: 'Nov 14, 2026' },
          { id: 'receiptNo', label: 'Invoice reference', value: 'MO-2091' },
          { id: 'claimAmount', label: 'Reimbursement requested', value: '$165.00' },
        ],
      },
    },
    {
      id: 'task-sub-cloudvault',
      title: 'Review CloudVault annual renewal',
      counterparty: 'CloudVault Backup',
      category: 'subscription',
      status: 'snoozed',
      urgencyLabel: 'Renews Dec 1 ($96.00/yr)',
      dueText: 'Snoozed until tomorrow',
      snoozedUntil: 'Tomorrow at 9:00 AM',
      summary:
        'Your CloudVault 2 TB plan is set to auto-renew for $96.00 on Dec 1. Usage shows 140 GB stored, so downgrading to the 200 GB plan ($24/yr) would save $72.',
      planSteps: [
        'Draft a downgrade request to CloudVault Billing before Dec 1 renewal.',
        'Keep your existing backups intact on the 200 GB tier.',
      ],
      dataUsed: [
        {
          source: 'email',
          label: 'Renewal notice',
          detail: 'Upcoming charge notice from billing@cloudvault.example',
        },
        {
          source: 'billing',
          label: 'Prior charge history',
          detail: 'Last billed Dec 1, 2025 ($96.00)',
        },
      ],
      requiredSources: ['email', 'billing'],
      approvalBoundary:
        'Requires your approval before requesting a plan change or sending any account email.',
      payload: {
        kind: 'email',
        to: 'billing@cloudvault.example',
        subject: 'Downgrade to 200 GB plan before Dec 1 renewal (Acct CV-912)',
        body: `Hello CloudVault Support,

Ahead of my December 1 annual renewal, please switch my account (CV-912) from the 2 TB plan ($96/year) to the 200 GB plan ($24/year).

My current storage is 140 GB, so all existing files fit comfortably within the 200 GB limit. Please send a confirmation once the renewal rate is updated.

Best regards,
Clara Bennett`,
      },
    },
  ],
  agenda: [
    {
      id: 'ag-1',
      time: '09:30 AM',
      title: 'Call with Elm Street Insurance (Policy renewal check)',
      location: 'Phone: +1 (206) 555-0148',
      prepNote: 'Policy #ES-4410 summary and last year’s premium ($612) staged for reference.',
      completed: true,
    },
    {
      id: 'ag-2',
      time: '12:30 PM',
      title: 'Pick up prescription at Oakridge Pharmacy',
      location: '118 Oakridge Way',
      prepNote: 'Ready notification received at 08:15 AM (Copay $12.00).',
      completed: false,
    },
    {
      id: 'ag-3',
      time: '04:00 PM',
      title: 'Submit monthly home HOA maintenance note',
      location: 'Online resident portal',
      prepNote: 'Drafted patio gate latch photo & unit #4B note if you want to send today.',
      completed: false,
    },
  ],
  bills: [
    {
      id: 'bill-pge',
      payee: 'Pacific Gas & Electric',
      category: 'Utilities',
      dueDate: 'Nov 29',
      amount: 118.4,
      status: 'needs_approval',
      linkedTaskId: 'task-bill-pge',
    },
    {
      id: 'bill-fiber',
      payee: 'Sonic Fiber Internet',
      category: 'Internet',
      dueDate: 'Dec 2',
      amount: 65.0,
      status: 'scheduled_simulated',
    },
    {
      id: 'bill-water',
      payee: 'City Water & Sewer',
      category: 'Utilities',
      dueDate: 'Dec 6',
      amount: 65.0,
      status: 'scheduled_simulated',
    },
    {
      id: 'bill-mobile',
      payee: 'Northstar Mobile',
      category: 'Phone',
      dueDate: 'Nov 18',
      amount: 42.0,
      status: 'paid_simulated',
    },
  ],
  activity: [
    {
      id: 'act-1',
      timestamp: 'Today, 08:16 AM',
      type: 'prep',
      title: 'Matched Oakridge Pharmacy pickup alert to today’s agenda',
      detail: 'Read pickup confirmation email and added copay note ($12.00) to your 12:30 PM reminder.',
      simulatedOutcome: 'Read-only calendar note added locally.',
      sourcesUsed: ['Email inbox (read-only)', 'Calendar (read-only)'],
    },
    {
      id: 'act-2',
      timestamp: 'Today, 07:50 AM',
      type: 'prep',
      title: 'Prepared Brighton Rail delay refund draft ($34.50)',
      detail: 'Detected Nov 19 arrival delay alert and paired it with your saved ticket confirmation BR-88412.',
      simulatedOutcome: 'Draft staged in Needs your approval. Nothing sent.',
      sourcesUsed: ['Email inbox (read & draft)'],
      taskId: 'task-refund-brighton',
    },
    {
      id: 'act-3',
      timestamp: 'Yesterday, 06:10 PM',
      type: 'approved',
      title: 'Approved Northstar Mobile bill payment ($42.00)',
      detail: 'Confirmed November statement payment from Checking ending in 4821 after verifying zero roaming fees.',
      simulatedOutcome: 'Simulated payment recorded (#SIM-88241).',
      sourcesUsed: ['Bills & statements', 'Explicit user approval'],
    },
    {
      id: 'act-4',
      timestamp: 'Nov 22, 02:05 PM',
      type: 'decision',
      title: 'Snoozed CloudVault annual renewal review',
      detail: 'Postponed plan downgrade decision until tomorrow morning.',
      simulatedOutcome: 'Moved to Snoozed queue until Nov 25, 09:00 AM.',
      sourcesUsed: ['Email inbox', 'Bills & statements'],
      taskId: 'task-sub-cloudvault',
    },
    {
      id: 'act-5',
      timestamp: 'Nov 21, 11:30 AM',
      type: 'prep',
      title: 'Archived 11 promotional store receipts automatically',
      detail: 'Sorted non-actionable order confirmations into Receipts folder per your standing rule.',
      simulatedOutcome: 'Local inbox triage only; no messages deleted.',
      sourcesUsed: ['Email inbox (read-only)'],
    },
  ],
  permissions: {
    email: 'read_draft',
    calendar: 'read_propose',
    billing: 'read_stage',
    vault: 'prefill_with_approval',
  },
  guardrails: {
    requireMoneyApproval: true,
    requireExternalSendApproval: true,
    requireCalendarHoldApproval: true,
    redactAccountNumbers: true,
    autoArchiveReceipts: true,
  },
  simulatedQueueIndex: 0,
};

export const SIMULATED_INCOMING_ITEMS: Array<Omit<TaskItem, 'id'>> = [
  {
    title: 'Dispute duplicate coffee subscription charge',
    counterparty: 'Roast & Hearth Co.',
    category: 'refund',
    status: 'waiting',
    urgencyLabel: 'Duplicate charge detected today',
    dueText: 'Review this week',
    summary:
      'Your card statement shows two identical $22.00 charges from Roast & Hearth on Nov 23 (Ref #RH-551 and #RH-552). Daymark drafted a polite refund request.',
    planSteps: [
      'Draft an email to support@roastandhearth.example noting both transaction IDs.',
      'Hold until you review and approve sending.',
    ],
    dataUsed: [
      {
        source: 'billing',
        label: 'Statement alert',
        detail: 'Two $22.00 charges on Nov 23 (#RH-551, #RH-552)',
      },
      {
        source: 'email',
        label: 'Order confirmation',
        detail: 'Single order #10492 confirmation from Roast & Hearth',
      },
    ],
    requiredSources: ['billing', 'email'],
    approvalBoundary:
      'Requires your approval before emailing the merchant. No chargeback or payment action is taken.',
    payload: {
      kind: 'email',
      to: 'support@roastandhearth.example',
      subject: 'Duplicate charge on Nov 23 — Order #10492 ($22.00)',
      body: `Hello Roast & Hearth team,

I noticed two identical $22.00 charges on my statement from November 23 for Order #10492 (references #RH-551 and #RH-552), though only one shipment was ordered.

Could you please reverse the duplicate $22.00 charge? Thank you for taking a look.

Best,
Clara Bennett`,
    },
  },
  {
    title: 'Renew residential street parking permit',
    counterparty: 'City Mobility Office',
    category: 'form',
    status: 'waiting',
    urgencyLabel: 'Current permit expires Dec 10',
    dueText: 'Due Dec 8',
    summary:
      'Your Zone 4 residential parking permit expires in 16 days. Daymark pre-filled the renewal application from your Vault registration.',
    planSteps: [
      'Populate license plate, Zone 4 address, and permit number from Vault.',
      'Wait for your explicit approval before submitting the simulated renewal form ($35.00 fee).',
    ],
    dataUsed: [
      {
        source: 'vault',
        label: 'Personal vault',
        detail: 'Vehicle plate (7KTR492) and Zone 4 permit #Z4-11804',
      },
      {
        source: 'email',
        label: 'City notice',
        detail: 'Renewal reminder from permits@citymobility.example',
      },
    ],
    requiredSources: ['vault', 'email'],
    approvalBoundary:
      'Requires your approval for both form submission and the $35.00 renewal fee.',
    requiresExplicitMoneyConfirm: true,
    payload: {
      kind: 'form',
      portalName: 'City Mobility Resident Permit Portal (Simulated)',
      fields: [
        { id: 'permitNo', label: 'Existing permit number', value: 'Z4-11804' },
        { id: 'plate', label: 'License plate', value: '7KTR492' },
        { id: 'zone', label: 'Residential zone', value: 'Zone 4, North Pier' },
        { id: 'fee', label: 'Annual renewal fee', value: '$35.00' },
      ],
    },
  },
];
