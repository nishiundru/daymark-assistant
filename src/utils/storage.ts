import { INITIAL_STATE } from '../data/initialState';
import { DaymarkState, NavTab } from '../types';

const STORAGE_KEY = 'daymark_prototype_state_v2';

export function loadDaymarkState(): DaymarkState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<DaymarkState>;
    if (
      !parsed ||
      !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.mails) ||
      !Array.isArray(parsed.calendarEvents) ||
      !parsed.permissions
    ) {
      return INITIAL_STATE;
    }
    return {
      ...INITIAL_STATE,
      ...parsed,
      guardrails: {
        ...INITIAL_STATE.guardrails,
        ...(parsed.guardrails ?? {}),
        requireMoneyApproval: true,
      },
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveDaymarkState(state: DaymarkState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function resetDaymarkState(): DaymarkState {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return INITIAL_STATE;
}

export function getInitialNavFromUrl(): { tab: NavTab; taskId: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const taskId = params.get('task');
    const validTabs: NavTab[] = ['briefing', 'mail', 'calendar', 'queue', 'privacy'];
    const tab = validTabs.includes(tabParam as NavTab) ? (tabParam as NavTab) : 'briefing';
    return { tab, taskId };
  } catch {
    return { tab: 'briefing', taskId: null };
  }
}

export function syncUrlParams(tab: NavTab, taskId: string | null): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    if (taskId && tab === 'queue') {
      url.searchParams.set('task', taskId);
    } else {
      url.searchParams.delete('task');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history API issues
  }
}

export function formatTimeStampNow(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Today, ${timeStr}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function maskAccountString(value: string, redact: boolean): string {
  if (!redact) return value;
  return value.replace(/#\d{4}-(\d{4})/g, 'ending in $1');
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'refund':
      return 'Refund draft';
    case 'appointment':
      return 'Appointment';
    case 'bill':
      return 'Bill payment';
    case 'form':
      return 'Benefit form';
    case 'subscription':
      return 'Renewal check';
    default:
      return 'Task';
  }
}
