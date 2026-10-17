import { getAdminPassword } from './authStore';

/** See functions/api/contact-request.ts. */
export type ContactRequestKind = 'message' | 'callback' | 'payment';

export interface ContactRequestInput {
  kind: ContactRequestKind;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  when?: string;
  context?: string;
  amount?: number | null;
  locale?: string;
  /** Honeypot; always empty from a person. */
  website?: string;
}

export interface ContactRequest extends Required<Omit<ContactRequestInput, 'website' | 'amount'>> {
  id: string;
  at: string;
  amount: number | null;
  page: string;
  done: boolean;
}

/** Keep a guest's request. Throws with a message written for the guest. */
export const submitContactRequest = async (input: ContactRequestInput): Promise<string> => {
  const response = await fetch('/api/contact-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ ...input, page: window.location.pathname }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Your request could not be sent.');
  return String(body?.id ?? '');
};

const adminHeaders = () => {
  const password = getAdminPassword();
  if (!password) throw new Error('Tu sesión expiró. Vuelve a entrar al panel.');
  return { 'Content-Type': 'application/json', 'X-Admin-Password': password };
};

export const listContactRequests = async (): Promise<ContactRequest[]> => {
  const response = await fetch('/api/contact-request', { headers: adminHeaders(), cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'No se pudieron cargar las solicitudes.');
  return Array.isArray(body?.requests) ? body.requests : [];
};

export const markContactRequest = async (id: string, done: boolean): Promise<void> => {
  const response = await fetch('/api/contact-request', {
    method: 'PATCH',
    headers: adminHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ id, done }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'No se pudo actualizar la solicitud.');
  }
};
