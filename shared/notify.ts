/**
 * Telling people things without a person sending them.
 *
 * Two channels, both free and both optional:
 *
 *   EMAIL     Brevo (300 a day free, a single verified sender address, no
 *             domain needed) or Resend (100 a day free). Either reaches any
 *             recipient, which is what a receipt to a guest needs. Cloudflare's
 *             own send_email binding only reaches verified addresses on a zone
 *             this site does not have, and MailChannels' free Workers relay
 *             ended in 2024, so neither is used.
 *   WHATSAPP  CallMeBot, a free gateway that delivers to the operator's own
 *             number once that number has said hello to its bot. It cannot
 *             write to guests: there is no free way for a server to start a
 *             WhatsApp conversation with a stranger. Guests get wa.me links.
 *
 * The operator turns each on in the admin by pasting a key. With no key a
 * channel is simply absent — the storefront hides what would need it.
 *
 * Settings live in this site's KV under `notify-config`; the keys in it are
 * write-only (the admin is told whether one is set, never what it is).
 */

export type EmailProvider = 'none' | 'brevo' | 'resend';

export interface NotifyConfig {
  /** Where operator notices go. */
  operatorEmail: string;
  /** The operator's own WhatsApp number, for CallMeBot. */
  operatorWhatsApp: string;
  /** "Someone is paying right now" when a payment button is pressed. */
  notifyOnPayClick: boolean;
  /** "They confirm / report a problem" when the guest answers on return. */
  notifyOnConfirm: boolean;
  /** "Nobody confirmed after N minutes" when the guest never answers. */
  notifyOnTimeout: boolean;
  confirmTimeoutMin: number;
  /** New call-back requests and contact-form messages. */
  notifyOnRequest: boolean;
  emailProvider: EmailProvider;
  /** The sender address verified with the provider. */
  emailFrom: string;
  emailFromName: string;
  /** Let guests have summaries and receipts emailed to them. */
  guestEmails: boolean;
}

export interface NotifySecrets {
  emailApiKey: string;
  callmebotApiKey: string;
}

export const DEFAULT_NOTIFY: NotifyConfig = {
  operatorEmail: '',
  operatorWhatsApp: '',
  notifyOnPayClick: true,
  notifyOnConfirm: true,
  notifyOnTimeout: true,
  confirmTimeoutMin: 30,
  notifyOnRequest: true,
  emailProvider: 'none',
  emailFrom: '',
  emailFromName: '',
  guestEmails: true,
};

const KEY = 'notify-config';

export interface NotifyEnv {
  DATA_KV_F?: any;
  DATA_KV?: any;
  [key: string]: unknown;
}

export const kvOf = (env: NotifyEnv) => {
  const kv = env.DATA_KV_F ?? env.DATA_KV;
  return kv && typeof kv.get === 'function' ? kv : null;
};

export const readNotify = async (env: NotifyEnv): Promise<{ config: NotifyConfig; secrets: NotifySecrets }> => {
  const kv = kvOf(env);
  let stored: any = null;
  try {
    stored = kv ? await kv.get(KEY, { type: 'json' }) : null;
  } catch {
    stored = null;
  }
  const config = { ...DEFAULT_NOTIFY, ...(stored?.config ?? {}) } as NotifyConfig;
  const secrets: NotifySecrets = {
    emailApiKey: String(stored?.secrets?.emailApiKey ?? ''),
    callmebotApiKey: String(stored?.secrets?.callmebotApiKey ?? ''),
  };
  return { config, secrets };
};

export const writeNotify = async (env: NotifyEnv, config: NotifyConfig, secrets: NotifySecrets) => {
  const kv = kvOf(env);
  if (!kv) throw new Error('No KV namespace is bound to this deployment.');
  await kv.put(KEY, JSON.stringify({ config, secrets }));
};

export const emailReady = (config: NotifyConfig, secrets: NotifySecrets) =>
  config.emailProvider !== 'none' && Boolean(secrets.emailApiKey) && /@/.test(config.emailFrom);

export const whatsAppReady = (config: NotifyConfig, secrets: NotifySecrets) =>
  Boolean(secrets.callmebotApiKey) && config.operatorWhatsApp.replace(/\D/g, '').length >= 8;

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text, shown as readable HTML too (line breaks kept, nothing else). */
export const textToHtml = (text: string) =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#14302c">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;

export const sendEmail = async (env: NotifyEnv, message: EmailMessage): Promise<{ ok: boolean; error?: string }> => {
  const { config, secrets } = await readNotify(env);
  if (!emailReady(config, secrets)) return { ok: false, error: 'Email is not configured.' };
  const html = message.html ?? textToHtml(message.text);
  try {
    if (config.emailProvider === 'brevo') {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': secrets.emailApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: config.emailFrom, name: config.emailFromName || undefined },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: html,
          ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
        }),
      });
      if (!response.ok) return { ok: false, error: `Brevo ${response.status}: ${(await response.text()).slice(0, 200)}` };
      return { ok: true };
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secrets.emailApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.emailFromName ? `${config.emailFromName} <${config.emailFrom}>` : config.emailFrom,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
    if (!response.ok) return { ok: false, error: `Resend ${response.status}: ${(await response.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message ?? error).slice(0, 200) };
  }
};

/** A WhatsApp message to the operator's own number, through CallMeBot. */
export const sendOperatorWhatsApp = async (env: NotifyEnv, text: string): Promise<{ ok: boolean; error?: string }> => {
  const { config, secrets } = await readNotify(env);
  if (!whatsAppReady(config, secrets)) return { ok: false, error: 'WhatsApp notices are not configured.' };
  const phone = config.operatorWhatsApp.replace(/[^\d+]/g, '');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(secrets.callmebotApiKey)}`;
  try {
    const response = await fetch(url);
    const body = await response.text();
    // CallMeBot answers 200 with an HTML page either way; failures say so in it.
    if (!response.ok || /error|invalid|not\s+allowed/i.test(body.slice(0, 600))) {
      return { ok: false, error: `CallMeBot: ${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message ?? error).slice(0, 200) };
  }
};

/** Tell the operator, on every channel that is set up. Never throws. */
export const notifyOperator = async (
  env: NotifyEnv,
  subject: string,
  text: string
): Promise<{ email?: boolean; whatsapp?: boolean }> => {
  const { config, secrets } = await readNotify(env);
  const result: { email?: boolean; whatsapp?: boolean } = {};
  const jobs: Promise<void>[] = [];
  if (emailReady(config, secrets) && /@/.test(config.operatorEmail)) {
    jobs.push(sendEmail(env, { to: config.operatorEmail, subject, text }).then((r) => void (result.email = r.ok)));
  }
  if (whatsAppReady(config, secrets)) {
    jobs.push(sendOperatorWhatsApp(env, `${subject}\n\n${text}`).then((r) => void (result.whatsapp = r.ok)));
  }
  await Promise.all(jobs);
  return result;
};

/**
 * The site's name and number, for the text of an email: the admin's saved
 * brand settings, else the copy bundled with the build.
 */
export const readBrand = async (env: NotifyEnv): Promise<{ brandName: string; phoneNumber: string }> => {
  const pick = (value: any) => ({
    brandName: String(value?.brandName ?? value?.record?.brandName ?? '').trim(),
    phoneNumber: String(value?.phoneNumber ?? value?.record?.phoneNumber ?? '').trim(),
  });
  const kv = kvOf(env);
  try {
    const stored = kv ? pick(await kv.get('brand', { type: 'json' })) : null;
    if (stored?.brandName) return stored;
  } catch {
    /* fall through to the bundled copy */
  }
  const assets = (env as any).ASSETS;
  if (assets && typeof assets.fetch === 'function') {
    try {
      const response = await assets.fetch(new Request('https://assets.local/data/brand.json'));
      if (response.ok) return pick(await response.json());
    } catch {
      /* no brand at all: callers have a fallback */
    }
  }
  return { brandName: '', phoneNumber: '' };
};

/**
 * What the storefront may know: whether guests can be emailed, and whether
 * the operator hears about a payment press without the guest's help (when
 * not, the payment buttons still open WhatsApp to tell them, as before).
 */
export const publicNotifyFlags = (config: NotifyConfig, secrets: NotifySecrets) => ({
  guestEmail: emailReady(config, secrets) && config.guestEmails,
  operatorAlerts:
    config.notifyOnPayClick &&
    (whatsAppReady(config, secrets) || (emailReady(config, secrets) && /@/.test(config.operatorEmail))),
});
