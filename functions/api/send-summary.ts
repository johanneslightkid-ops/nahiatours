import { priceBooking } from '../../shared/bookingPrice';
import { emailReady, kvOf, NotifyEnv, readBrand, readNotify, sendEmail } from '../../shared/notify';

/**
 * Email a guest the summary of their cart.
 *
 * Only exists when the operator has set up an email provider (see
 * shared/notify.ts) and allows guest emails; the storefront hides the button
 * otherwise. Because it sends from the operator's own address to any address
 * typed in, it is built so it cannot be used to send anything else: the text
 * is composed here from the items, every price is the catalogue's where the
 * catalogue knows the item, there is no free-text field, and it is limited to
 * a few a day per address and per recipient.
 *
 *   POST { email, name?, items: [{ category, serviceId, title, date, persons, quantities, total }], locale }
 */

const PER_DAY_IP = 6;
const PER_DAY_TO = 3;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .trim()
    .slice(0, max);

const COPY: Record<string, { subject: string; hello: string; intro: string; people: string; total: string; questions: string; open: string }> = {
  en: {
    subject: 'Your trip summary',
    hello: 'Hello',
    intro: 'here is the summary of what you picked. Nothing is booked until we confirm it with you personally.',
    people: 'people',
    total: 'Total',
    questions: 'Questions or changes? Just reply to this email or write to us on WhatsApp:',
    open: 'Your cart:',
  },
  es: {
    subject: 'El resumen de tu viaje',
    hello: 'Hola',
    intro: 'aquí tienes el resumen de lo que elegiste. Nada queda reservado hasta que lo confirmemos contigo personalmente.',
    people: 'personas',
    total: 'Total',
    questions: '¿Preguntas o cambios? Responde a este correo o escríbenos por WhatsApp:',
    open: 'Tu carrito:',
  },
  de: {
    subject: 'Ihre Reiseübersicht',
    hello: 'Hallo',
    intro: 'hier ist die Übersicht Ihrer Auswahl. Gebucht ist erst, wenn wir es persönlich mit Ihnen bestätigt haben.',
    people: 'Personen',
    total: 'Gesamt',
    questions: 'Fragen oder Änderungen? Antworten Sie einfach auf diese E-Mail oder schreiben Sie uns auf WhatsApp:',
    open: 'Ihr Warenkorb:',
  },
  fr: {
    subject: 'Le résumé de votre voyage',
    hello: 'Bonjour',
    intro: 'voici le résumé de votre sélection. Rien n’est réservé tant que nous ne l’avons pas confirmé avec vous personnellement.',
    people: 'personnes',
    total: 'Total',
    questions: 'Des questions ou des changements ? Répondez à cet e-mail ou écrivez-nous sur WhatsApp :',
    open: 'Votre panier :',
  },
};

const recent = new Map<string, number[]>();
const tooMany = (key: string, max: number) => {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((at) => now - at < 24 * 3600_000);
  if (hits.length >= max) return true;
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 4000) recent.clear();
  return false;
};

export async function onRequest(context: { request: Request; env: NotifyEnv }) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { config, secrets } = await readNotify(env);
  if (!emailReady(config, secrets) || !config.guestEmails) return json({ error: 'Email is not available.' }, 503);

  const body: any = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
  if (String(body.website ?? '').trim()) return json({ ok: true });
  const to = String(body.email ?? '').trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'That email address does not look right.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const kv = kvOf(env);
  // In memory for a burst, in KV for the day (one write per email sent).
  if (tooMany(`ip:${ip}`, PER_DAY_IP) || tooMany(`to:${to.toLowerCase()}`, PER_DAY_TO)) {
    return json({ error: 'Too many emails today — please try again tomorrow.' }, 429);
  }
  if (kv) {
    const limitKey = `rl:summary:${ip}`;
    const used = Number((await kv.get(limitKey).catch(() => null)) ?? 0) || 0;
    if (used >= PER_DAY_IP) return json({ error: 'Too many emails today — please try again tomorrow.' }, 429);
    await kv.put(limitKey, String(used + 1), { expirationTtl: 24 * 3600 }).catch(() => undefined);
  }

  const lang = ['es', 'de', 'fr'].includes(body.locale) ? body.locale : 'en';
  const t = COPY[lang];
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 12);
  if (items.length === 0) return json({ error: 'The cart is empty.' }, 400);

  const lines: string[] = [];
  let total = 0;
  for (const item of items) {
    const title = text(item?.title, 100) || '—';
    const persons = Math.max(1, Math.min(60, Math.floor(Number(item?.persons) || 1)));
    const priced = await priceBooking(env as any, {
      category: text(item?.category, 20) || 'tours',
      serviceId: item?.serviceId,
      title,
      persons,
      quantities: item?.quantities,
      amount: Number(item?.total) || undefined,
      locale: lang,
    });
    const amount = priced.ok ? priced.booking.total : null;
    if (amount) total += amount;
    lines.push(
      `• ${title}${text(item?.date, 50) ? ` — ${text(item?.date, 50)}` : ''} — ${persons} ${t.people}${amount ? ` — US$ ${amount.toFixed(2)}` : ''}`
    );
  }

  const brand = await readBrand(env);
  const brandName = brand.brandName || config.emailFromName || '';
  const phone = brand.phoneNumber || config.operatorWhatsApp || '';
  const digits = phone.replace(/\D/g, '');
  const name = text(body.name, 60);
  const origin = new URL(request.url).origin;

  const message = [
    `${t.hello}${name ? ` ${name}` : ''},`,
    '',
    t.intro,
    '',
    ...lines,
    '',
    total > 0 ? `${t.total}: US$ ${total.toFixed(2)}` : '',
    '',
    t.questions,
    digits ? `https://wa.me/${digits}` : phone,
    '',
    `${t.open} ${origin}/cart`,
    '',
    brandName,
  ]
    .filter((line, index, all) => line !== '' || all[index - 1] !== '')
    .join('\n');

  const sent = await sendEmail(env, {
    to,
    subject: brandName ? `${t.subject} — ${brandName}` : t.subject,
    text: message,
    replyTo: /@/.test(config.operatorEmail) ? config.operatorEmail : undefined,
  });
  return sent.ok ? json({ ok: true }) : json({ error: 'The email could not be sent just now.' }, 502);
}
