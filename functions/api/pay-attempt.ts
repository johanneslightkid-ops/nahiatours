import { verifyAdminRequest } from '../../shared/adminAuth';
import { priceBooking } from '../../shared/bookingPrice';
import { emailReady, kvOf, notifyOperator, NotifyEnv, readBrand, readNotify, sendEmail } from '../../shared/notify';

/**
 * A guest pressing a payment button, and what they say happened.
 *
 * PayPal and a pasted card link both leave for another site in another tab,
 * and nothing comes back from either: the operator learns about the payment
 * when PayPal's email arrives, if it arrives. So the press is recorded here —
 * what, how much, how the guest wants to hear back — the operator is told
 * "someone is paying right now", and when the guest returns the site asks
 * whether it worked and records the answer. An attempt nobody answers for is
 * flagged after the configured timeout (sweepOverdue, below), because that is
 * the one where the money most likely never moved.
 *
 *   POST  { action: 'start', … }    public; the id is made by the browser so
 *                                   the request can leave inside the click.
 *   POST  { action: 'confirm', … }  public; the guest's answer.
 *   GET   (admin)                   the latest attempts, newest first.
 *   PATCH (admin)  { id, status }   the operator's own verdict.
 *
 * Each attempt is its own key (`pay:<id>`), and `pay-attempts` is a short
 * index of `<started ms>:<id>`, so two answers arriving together cannot
 * overwrite each other and the sweep knows which ones are worth reading.
 */

type Env = NotifyEnv;
type Context = { request: Request; env: Env; waitUntil?: (promise: Promise<unknown>) => void };

export type AttemptStatus = 'pending' | 'paid' | 'problem' | 'later' | 'unconfirmed' | 'verified' | 'cancelled';

export interface AttemptItem {
  title: string;
  date: string;
  persons: number;
  total: number | null;
}

export interface PayAttempt {
  id: string;
  at: string;
  method: string;
  source: string;
  total: number | null;
  /** What the server makes of the items, when they are catalogue items. */
  serverTotal: number | null;
  items: AttemptItem[];
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
  /** Whether the guest wants their summary by email, and whether it went. */
  receiptSent?: boolean;
  notices: { start?: boolean; answer?: boolean; timeout?: boolean };
  /** The guest's answer came after the timeout notice had gone out. */
  late?: boolean;
}

const INDEX = 'pay-attempts';
const KEEP = 250;
const TTL = 120 * 24 * 3600;
const PER_HOUR = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);

const money = (value: number | null) => (value === null ? '—' : `US$ ${value.toFixed(2)}`);

interface IndexEntry {
  at: number;
  id: string;
}

const readIndex = async (kv: any): Promise<IndexEntry[]> => {
  try {
    const stored = await kv.get(INDEX, { type: 'json' });
    return (Array.isArray(stored) ? stored : [])
      .map((entry) => /^(\d+):(.+)$/.exec(String(entry)))
      .filter(Boolean)
      .map((match) => ({ at: Number(match![1]), id: match![2] }));
  } catch {
    return [];
  }
};

const readAttempt = async (kv: any, id: string): Promise<PayAttempt | null> => {
  try {
    return (await kv.get(`pay:${id}`, { type: 'json' })) as PayAttempt | null;
  } catch {
    return null;
  }
};

const saveAttempt = (kv: any, attempt: PayAttempt) => kv.put(`pay:${attempt.id}`, JSON.stringify(attempt), { expirationTtl: TTL });

const contactLine = (attempt: PayAttempt) => {
  const ways = [
    attempt.contact.whatsapp && 'WhatsApp',
    attempt.contact.email && 'email',
    attempt.contact.call && 'llamada / call',
  ].filter(Boolean);
  return ways.length ? ways.join(' + ') : '—';
};

/** The part of every operator message that says who and what. */
const describe = (attempt: PayAttempt) =>
  [
    ...attempt.items.map(
      (item) =>
        `• ${item.title}${item.date ? ` — ${item.date}` : ''}${item.persons ? ` — ${item.persons} pax` : ''}${item.total ? ` — ${money(item.total)}` : ''}`
    ),
    '',
    `Total: ${money(attempt.total)}${attempt.serverTotal !== null && attempt.total !== null && Math.abs(attempt.serverTotal - attempt.total) > 0.5 ? ` (catálogo / catalogue: ${money(attempt.serverTotal)})` : ''}`,
    `Método / Method: ${attempt.method}`,
    attempt.name ? `Cliente / Guest: ${attempt.name}` : '',
    attempt.phone ? `Tel / WhatsApp: ${attempt.phone}` : '',
    attempt.email ? `Email: ${attempt.email}` : '',
    `Quiere contacto por / Wants to hear back by: ${contactLine(attempt)}`,
    attempt.note ? `Nota / Note: ${attempt.note}` : '',
    `Ref: ${attempt.id}`,
  ]
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''))
    .join('\n');

const OUTCOME: Record<string, { es: string; en: string; icon: string }> = {
  paid: { icon: '✅', es: 'El cliente confirma que PAGÓ', en: 'The guest confirms they PAID' },
  problem: { icon: '⚠️', es: 'El cliente reporta un PROBLEMA con el pago', en: 'The guest reports a PROBLEM with the payment' },
  later: { icon: '⏳', es: 'El cliente NO pagó todavía (pagará después)', en: 'The guest has NOT paid yet (will pay later)' },
  verified: { icon: '✅', es: 'Pago con tarjeta confirmado por el banco', en: 'Card payment confirmed by the processor' },
  cancelled: { icon: '↩️', es: 'El cliente canceló en la página de pago', en: 'The guest cancelled on the payment page' },
};

/** What the guest is emailed after answering, in their language. */
const guestMessage = (attempt: PayAttempt, brand: string) => {
  const lines = attempt.items.map((item) => `• ${item.title}${item.date ? ` — ${item.date}` : ''}${item.persons ? ` — ${item.persons}` : ''}`);
  const copy: Record<string, { subject: string; hello: string; paid: string; other: string; total: string; keep: string; bye: string }> = {
    en: {
      subject: `Your booking with ${brand}`,
      hello: `Hello${attempt.name ? ` ${attempt.name}` : ''},`,
      paid: 'thank you — we have your confirmation that the payment went through. We will check it and confirm your booking personally.',
      other: 'thank you for letting us know. Nothing is lost: we will get in touch to sort out the payment with you.',
      total: 'Total',
      keep: 'Please keep the payment receipt (PayPal or your bank emails it to you) — and a screenshot of it, if you took one.',
      bye: 'See you soon!',
    },
    es: {
      subject: `Tu reserva con ${brand}`,
      hello: `Hola${attempt.name ? ` ${attempt.name}` : ''},`,
      paid: 'gracias — recibimos tu confirmación de que el pago se hizo. Lo revisamos y te confirmamos la reserva personalmente.',
      other: 'gracias por avisarnos. No se pierde nada: te contactamos para resolver el pago contigo.',
      total: 'Total',
      keep: 'Guarda el comprobante del pago (PayPal o tu banco te lo envían por correo) y la captura de pantalla, si la hiciste.',
      bye: '¡Hasta pronto!',
    },
    de: {
      subject: `Ihre Buchung bei ${brand}`,
      hello: `Hallo${attempt.name ? ` ${attempt.name}` : ''},`,
      paid: 'danke — Sie haben bestätigt, dass die Zahlung geklappt hat. Wir prüfen sie und bestätigen Ihre Buchung persönlich.',
      other: 'danke für die Nachricht. Es geht nichts verloren: Wir melden uns und klären die Zahlung mit Ihnen.',
      total: 'Gesamt',
      keep: 'Bitte bewahren Sie den Zahlungsbeleg auf (PayPal oder Ihre Bank schickt ihn per E-Mail) — und den Screenshot, falls Sie einen gemacht haben.',
      bye: 'Bis bald!',
    },
    fr: {
      subject: `Votre réservation avec ${brand}`,
      hello: `Bonjour${attempt.name ? ` ${attempt.name}` : ''},`,
      paid: 'merci — vous nous avez confirmé que le paiement est passé. Nous le vérifions et confirmons votre réservation personnellement.',
      other: 'merci de nous avoir prévenus. Rien n’est perdu : nous vous contactons pour régler le paiement avec vous.',
      total: 'Total',
      keep: 'Gardez le reçu du paiement (PayPal ou votre banque vous l’envoie par e-mail) — et la capture d’écran, si vous en avez fait une.',
      bye: 'À bientôt !',
    },
  };
  const t = copy[attempt.locale] ?? copy.en;
  const paid = attempt.status === 'paid' || attempt.status === 'verified';
  return {
    subject: t.subject,
    text: [t.hello, '', paid ? t.paid : t.other, '', ...lines, '', `${t.total}: ${money(attempt.total)}`, `Ref: ${attempt.id}`, '', t.keep, '', t.bye, brand].join('\n'),
  };
};

const brandName = async (env: Env, fallback: string) => (await readBrand(env)).brandName || fallback || 'Tours';

const later = (context: Context, job: Promise<unknown>) => {
  if (context.waitUntil) context.waitUntil(job.catch(() => undefined));
  else return job.catch(() => undefined);
};

/** Per isolate: enough to stop a loop hammering the operator's phone. */
const recent = new Map<string, number[]>();
const throttled = (ip: string) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < 3600_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 2000) recent.clear();
  return hits.length > PER_HOUR;
};

const parseItems = (raw: unknown): AttemptItem[] =>
  (Array.isArray(raw) ? raw : []).slice(0, 12).map((item: any) => {
    const total = Number(item?.total);
    return {
      title: text(item?.title, 120) || '—',
      date: text(item?.date, 60),
      persons: Math.max(0, Math.min(200, Math.floor(Number(item?.persons) || 0))),
      total: Number.isFinite(total) && total > 0 && total < 100000 ? Math.round(total * 100) / 100 : null,
    };
  });

export async function onRequest(context: Context) {
  const { request, env } = context;
  const kv = kvOf(env);
  if (!kv) return json({ error: 'Payments cannot be recorded on this deployment.' }, 503);

  if (request.method === 'POST') {
    const body: any = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
    const id = text(body.id, 40);
    if (!/^[a-z0-9]{8,40}$/i.test(id)) return json({ error: 'Invalid reference.' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (throttled(ip)) return json({ error: 'Too many requests.' }, 429);
    const { config } = await readNotify(env);

    if (body.action === 'start') {
      const existing = await readAttempt(kv, id);
      if (existing) return json({ ok: true, id });

      const items = parseItems(body.items);
      if (items.length === 0) return json({ error: 'Nothing to pay for.' }, 400);
      const total = Number(body.total);
      // The catalogue's opinion of the same items, so the operator can see a
      // page that asked for less than the tours cost.
      const priced = await priceBooking(env as any, {
        items: (Array.isArray(body.items) ? body.items : []).slice(0, 12).map((item: any) => ({
          category: text(item?.category, 20) || 'tours',
          serviceId: item?.serviceId,
          title: text(item?.title, 120),
          persons: Number(item?.persons) || 1,
          quantities: item?.quantities,
          amount: Number(item?.total) || undefined,
        })),
        locale: body.locale,
      }).catch(() => null);

      const attempt: PayAttempt = {
        id,
        at: new Date().toISOString(),
        method: text(body.method, 40) || 'unknown',
        source: text(body.source, 40) || 'direct',
        total: Number.isFinite(total) && total > 0 && total < 100000 ? Math.round(total * 100) / 100 : null,
        serverTotal: priced && priced.ok ? priced.booking.total : null,
        items,
        name: text(body.name, 80),
        phone: text(body.phone, 40),
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(body.email, 120)) ? text(body.email, 120) : '',
        contact: {
          whatsapp: Boolean(body.contact?.whatsapp),
          email: Boolean(body.contact?.email),
          call: Boolean(body.contact?.call),
        },
        locale: ['es', 'de', 'fr'].includes(body.locale) ? body.locale : 'en',
        page: text(body.page, 120),
        status: 'pending',
        notices: {},
      };

      if (config.notifyOnPayClick) {
        attempt.notices.start = true;
        const subject = `💳 Pago en curso / Payment in progress — ${money(attempt.total)}`;
        const message = [
          'Un cliente está pagando ahora mismo / A guest is paying right now:',
          '',
          describe(attempt),
          '',
          `Si en ${config.confirmTimeoutMin} min no confirma, te aviso. / If they do not confirm within ${config.confirmTimeoutMin} min, you will hear again.`,
        ].join('\n');
        await later(context, notifyOperator(env, subject, message));
      }

      await saveAttempt(kv, attempt);
      const index = await readIndex(kv);
      const entries = [{ at: Date.parse(attempt.at), id }, ...index.filter((entry) => entry.id !== id)].slice(0, KEEP);
      await kv.put(INDEX, JSON.stringify(entries.map((entry) => `${entry.at}:${entry.id}`)));
      return json({ ok: true, id });
    }

    if (body.action === 'confirm') {
      const attempt = await readAttempt(kv, id);
      if (!attempt) return json({ error: 'No such payment.' }, 404);
      const outcome = ['paid', 'problem', 'later', 'verified', 'cancelled'].includes(body.outcome) ? body.outcome : null;
      if (!outcome) return json({ error: 'Invalid answer.' }, 400);
      // A gateway's verdict is not overturned by a later click.
      if (attempt.status === 'verified' && outcome !== 'verified') return json({ ok: true, status: attempt.status });

      const wasTimedOut = attempt.status === 'unconfirmed' || Boolean(attempt.notices.timeout);
      attempt.status = outcome;
      attempt.answeredAt = new Date().toISOString();
      attempt.late = wasTimedOut || undefined;
      if (text(body.note, 600)) attempt.note = text(body.note, 600);
      if (text(body.reference, 120)) attempt.reference = text(body.reference, 120);
      if (text(body.name, 80)) attempt.name = text(body.name, 80);
      if (text(body.phone, 40)) attempt.phone = text(body.phone, 40);
      const email = text(body.email, 120);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) attempt.email = email;
      if (body.contact && typeof body.contact === 'object') {
        attempt.contact = {
          whatsapp: Boolean(body.contact.whatsapp),
          email: Boolean(body.contact.email),
          call: Boolean(body.contact.call),
        };
      }

      const jobs: Promise<unknown>[] = [];
      if (config.notifyOnConfirm && !attempt.notices.answer) {
        attempt.notices.answer = true;
        const o = OUTCOME[outcome];
        const subject = `${o.icon} ${o.es} / ${o.en} — ${money(attempt.total)}`;
        const message = [
          wasTimedOut ? '(Respuesta tardía, después del aviso de tiempo / Late answer, after the timeout notice)\n' : '',
          describe(attempt),
        ]
          .filter(Boolean)
          .join('\n');
        jobs.push(notifyOperator(env, subject, message));
      }

      const { secrets } = await readNotify(env);
      const wantsEmail = Boolean(body.sendReceipt) && attempt.email && config.guestEmails && emailReady(config, secrets);
      if (wantsEmail && !attempt.receiptSent) {
        attempt.receiptSent = true;
        const message = guestMessage(attempt, await brandName(env, config.emailFromName));
        jobs.push(sendEmail(env, { to: attempt.email, subject: message.subject, text: message.text, replyTo: config.operatorEmail || undefined }));
      }
      if (jobs.length) await later(context, Promise.all(jobs));
      await saveAttempt(kv, attempt);
      return json({ ok: true, status: attempt.status, receipt: Boolean(wantsEmail) });
    }

    return json({ error: 'Unknown action.' }, 400);
  }

  if (request.method === 'GET' || request.method === 'PATCH') {
    const auth = await verifyAdminRequest(env as any, request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    if (request.method === 'PATCH') {
      const body: any = await request.json().catch(() => null);
      const attempt = body?.id ? await readAttempt(kv, text(body.id, 40)) : null;
      if (!attempt) return json({ error: 'No such payment.' }, 404);
      const status = ['pending', 'paid', 'problem', 'later', 'unconfirmed', 'verified', 'cancelled'].includes(body.status) ? body.status : null;
      if (!status) return json({ error: 'Invalid status.' }, 400);
      attempt.status = status;
      await saveAttempt(kv, attempt);
      return json({ ok: true });
    }

    const index = await readIndex(kv);
    const limit = Math.min(KEEP, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 80));
    const attempts = (await Promise.all(index.slice(0, limit).map((entry) => readAttempt(kv, entry.id)))).filter(Boolean);
    return json({ attempts });
  }

  return json({ error: 'Method not allowed' }, 405);
}

/**
 * Tell the operator about every attempt nobody answered for in time.
 *
 * There is no cron here (the free plan's five schedules do not stretch to six
 * sites), so the worker calls this now and then while serving /api requests;
 * a `scheduled` handler calls it too, for when a schedule is added. It reads
 * a single index and only the attempts still pending, so it is cheap to run.
 */
/** Attempts this isolate has seen answered or flagged; never read again. */
const settled = new Set<string>();

export const sweepOverdue = async (env: NotifyEnv): Promise<number> => {
  const kv = kvOf(env);
  if (!kv) return 0;
  const { config } = await readNotify(env);
  const index = await readIndex(kv);
  if (index.length === 0) return 0;
  const cutoff = Date.now() - config.confirmTimeoutMin * 60_000;
  // Old enough to be overdue, young enough to still matter, and not already
  // seen settled by this isolate: usually none at all, so usually no reads.
  const due = index.filter((entry) => entry.at <= cutoff && entry.at > Date.now() - 48 * 3600_000 && !settled.has(entry.id));
  const attempts = (await Promise.all(due.slice(0, 40).map((entry) => readAttempt(kv, entry.id)))).filter(Boolean) as PayAttempt[];
  let flagged = 0;
  for (const attempt of attempts) {
    if (attempt.status !== 'pending') settled.add(attempt.id);
    if (attempt.status !== 'pending' || attempt.notices.timeout) continue;
    if (Date.parse(attempt.at) > cutoff) continue;
    attempt.status = 'unconfirmed';
    attempt.notices.timeout = true;
    if (config.notifyOnTimeout) {
      const subject = `⏰ Pago sin confirmar / Payment not confirmed — ${money(attempt.total)}`;
      const message = [
        `Nadie respondió en ${config.confirmTimeoutMin} min si el pago funcionó: puede que NO se haya completado. Revisa PayPal / tu portal de pagos y contacta al cliente.`,
        `Nobody answered within ${config.confirmTimeoutMin} min whether the payment worked: it may NOT have gone through. Check PayPal / your payment portal and contact the guest.`,
        '',
        describe(attempt),
      ].join('\n');
      await notifyOperator(env, subject, message);
    }
    await saveAttempt(kv, attempt);
    settled.add(attempt.id);
    flagged += 1;
  }
  if (settled.size > 5000) settled.clear();
  return flagged;
};
