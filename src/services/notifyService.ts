import { getAdminPassword } from './authStore';

/** See shared/notify.ts and functions/api/{notify-config,activity,pay-attempt,send-summary}.ts. */

export interface NotifyFlags {
  /** Guests can have summaries and receipts emailed to them. */
  guestEmail: boolean;
  /** The operator is told about payment presses by the server itself. */
  operatorAlerts: boolean;
}

export type EmailProvider = 'none' | 'brevo' | 'resend';

export interface NotifyConfig {
  operatorEmail: string;
  operatorWhatsApp: string;
  notifyOnPayClick: boolean;
  notifyOnConfirm: boolean;
  notifyOnTimeout: boolean;
  confirmTimeoutMin: number;
  notifyOnRequest: boolean;
  emailProvider: EmailProvider;
  emailFrom: string;
  emailFromName: string;
  guestEmails: boolean;
}

export interface NotifyAdminView {
  config: NotifyConfig;
  emailKeySet: boolean;
  callmebotKeySet: boolean;
  emailReady: boolean;
  whatsAppReady: boolean;
}

const NONE: NotifyFlags = { guestEmail: false, operatorAlerts: false };
let flags: Promise<NotifyFlags> | null = null;

/** Asked once per page load; a failure means "no extra channels". */
export const getNotifyFlags = (): Promise<NotifyFlags> => {
  if (!flags) {
    flags = fetch('/api/notify-config')
      .then((response) => (response.ok ? response.json() : NONE))
      .then((body) => ({ guestEmail: Boolean(body?.guestEmail), operatorAlerts: Boolean(body?.operatorAlerts) }))
      .catch(() => NONE);
  }
  return flags;
};

/** Email the guest their cart. Throws with a message written for the guest. */
export const emailCartSummary = async (input: {
  email: string;
  name?: string;
  locale: string;
  items: Array<{ category: string; serviceId?: number | string; title: string; date?: string; persons: number; quantities?: Record<string, number>; total?: number | null }>;
}) => {
  const response = await fetch('/api/send-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'The email could not be sent.');
};

const adminHeaders = () => {
  const password = getAdminPassword();
  if (!password) throw new Error('Tu sesión expiró. Vuelve a entrar al panel.');
  return { 'Content-Type': 'application/json', 'X-Admin-Password': password };
};

const adminCall = async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, { ...init, headers: adminHeaders(), cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Error ${response.status}`);
  return body as T;
};

export const getNotifyAdmin = () => adminCall<NotifyAdminView>('/api/notify-config');

export const saveNotifyAdmin = (patch: {
  config?: Partial<NotifyConfig>;
  emailApiKey?: string;
  callmebotApiKey?: string;
  clearEmailApiKey?: boolean;
  clearCallmebotApiKey?: boolean;
}) => adminCall<NotifyAdminView>('/api/notify-config', { method: 'PUT', body: JSON.stringify(patch) });

export const testNotify = (channel: 'email' | 'whatsapp' | 'both') =>
  adminCall<{ ok: boolean; error?: string; email?: boolean; whatsapp?: boolean }>('/api/notify-config', {
    method: 'POST',
    body: JSON.stringify({ action: 'test', channel }),
  });

export interface ActivityEvent {
  type: string;
  at: number;
  data: Record<string, string | number | boolean>;
}

export interface ActivityBatch {
  at: number;
  session: string;
  locale: string;
  page: string;
  country: string;
  device: string;
  events: ActivityEvent[];
}

export const listActivity = (cursor?: string) =>
  adminCall<{ batches: ActivityBatch[]; cursor: string | null }>(`/api/activity?limit=80${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);

/** One row per visit, for the charts (shared/activityRollup.ts). `partial`: more to fold — ask again. */
export const getActivitySummary = (since: string) =>
  adminCall<{ rows: import('../lib/activityInsights').SessionRow[]; partial: boolean; folded: number }>(
    `/api/activity?summary=1&since=${encodeURIComponent(since)}`
  );

export type AttemptStatus = 'pending' | 'paid' | 'problem' | 'later' | 'unconfirmed' | 'verified' | 'cancelled';

export interface PayAttemptRecord {
  id: string;
  at: string;
  method: string;
  source: string;
  total: number | null;
  serverTotal: number | null;
  items: Array<{ title: string; date: string; persons: number; total: number | null }>;
  name: string;
  phone: string;
  email: string;
  contact: { whatsapp: boolean; email: boolean; call: boolean };
  locale: string;
  page: string;
  status: AttemptStatus;
  answeredAt?: string;
  note?: string;
  reference?: string;
  receiptSent?: boolean;
  late?: boolean;
  notices: { start?: boolean; answer?: boolean; timeout?: boolean };
}

export const listPayAttempts = () => adminCall<{ attempts: PayAttemptRecord[] }>('/api/pay-attempt?limit=120');

export const setPayAttemptStatus = (id: string, status: AttemptStatus) =>
  adminCall<{ ok: boolean }>('/api/pay-attempt', { method: 'PATCH', body: JSON.stringify({ id, status }) });
