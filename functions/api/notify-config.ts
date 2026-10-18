import { verifyAdminRequest } from '../../shared/adminAuth';
import {
  DEFAULT_NOTIFY,
  emailReady,
  NotifyConfig,
  NotifyEnv,
  notifyOperator,
  publicNotifyFlags,
  readNotify,
  sendEmail,
  sendOperatorWhatsApp,
  whatsAppReady,
  writeNotify,
} from '../../shared/notify';

/**
 * The notification settings (see shared/notify.ts).
 *
 *   GET            public: which guest channels exist ({ guestEmail }).
 *                  admin:  the settings, and whether each key is set.
 *   PUT  (admin)   change settings; a key is only replaced when one is sent.
 *   POST (admin)   { action: 'test', channel: 'email' | 'whatsapp' | 'both' }.
 */

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

const adminView = (config: NotifyConfig, secrets: { emailApiKey: string; callmebotApiKey: string }) => ({
  config,
  emailKeySet: Boolean(secrets.emailApiKey),
  callmebotKeySet: Boolean(secrets.callmebotApiKey),
  emailReady: emailReady(config, secrets),
  whatsAppReady: whatsAppReady(config, secrets),
});

export async function onRequest(context: { request: Request; env: NotifyEnv }) {
  const { request, env } = context;
  const { config, secrets } = await readNotify(env);

  if (request.method === 'GET') {
    if (request.headers.get('X-Admin-Password')) {
      const auth = await verifyAdminRequest(env as any, request);
      if (!auth.ok) return json({ error: auth.error }, auth.status);
      return json(adminView(config, secrets));
    }
    return json(publicNotifyFlags(config, secrets), 200, 'public, max-age=60');
  }

  const auth = await verifyAdminRequest(env as any, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const body: any = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

  if (request.method === 'PUT') {
    const patch = body.config ?? {};
    const next: NotifyConfig = { ...DEFAULT_NOTIFY, ...config };
    if ('operatorEmail' in patch) next.operatorEmail = text(patch.operatorEmail, 120);
    if ('operatorWhatsApp' in patch) next.operatorWhatsApp = text(patch.operatorWhatsApp, 30);
    if ('emailFrom' in patch) next.emailFrom = text(patch.emailFrom, 120);
    if ('emailFromName' in patch) next.emailFromName = text(patch.emailFromName, 80);
    if ('emailProvider' in patch) next.emailProvider = ['brevo', 'resend'].includes(patch.emailProvider) ? patch.emailProvider : 'none';
    for (const flag of ['notifyOnPayClick', 'notifyOnConfirm', 'notifyOnTimeout', 'notifyOnRequest', 'guestEmails'] as const) {
      if (flag in patch) next[flag] = Boolean(patch[flag]);
    }
    if ('confirmTimeoutMin' in patch) {
      const minutes = Math.round(Number(patch.confirmTimeoutMin));
      next.confirmTimeoutMin = Number.isFinite(minutes) ? Math.min(24 * 60, Math.max(5, minutes)) : 30;
    }
    const nextSecrets = { ...secrets };
    if (text(body.emailApiKey, 400)) nextSecrets.emailApiKey = text(body.emailApiKey, 400);
    if (text(body.callmebotApiKey, 100)) nextSecrets.callmebotApiKey = text(body.callmebotApiKey, 100);
    if (body.clearEmailApiKey) nextSecrets.emailApiKey = '';
    if (body.clearCallmebotApiKey) nextSecrets.callmebotApiKey = '';
    await writeNotify(env, next, nextSecrets);
    return json(adminView(next, nextSecrets));
  }

  if (request.method === 'POST' && body.action === 'test') {
    const channel = body.channel ?? 'both';
    const subject = '✅ Prueba de avisos / Notification test';
    const message = `Este es un mensaje de prueba de tu sitio. Si lo recibes, los avisos funcionan.\nThis is a test from your website — notifications work.\n\n${new Date().toISOString()}`;
    if (channel === 'email') {
      if (!/@/.test(config.operatorEmail)) return json({ ok: false, error: 'Falta el correo del operador.' }, 400);
      return json(await sendEmail(env, { to: config.operatorEmail, subject, text: message }));
    }
    if (channel === 'whatsapp') return json(await sendOperatorWhatsApp(env, `${subject}\n${message}`));
    return json({ ok: true, ...(await notifyOperator(env, subject, message)) });
  }

  return json({ error: 'Method not allowed' }, 405);
}
