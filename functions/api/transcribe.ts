import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * Speech to text for the admin's dictation, on Workers AI.
 *
 * The browser's own speech service is good on desktop Chrome and unreliable on
 * phones, and Firefox has none. So the admin can instead record the
 * microphone (16 kHz mono WAV, see src/lib/useDictation.ts) and send it here,
 * where Whisper transcribes it through the account's own `AI` binding — the
 * same binding the blog generator uses, so there is nothing to configure.
 *
 * Admin-only: it costs the account money per minute of audio.
 */

const MODEL = '@cf/openai/whisper-large-v3-turbo';
/** About three minutes of 16 kHz 16-bit mono, base64-encoded, with headroom. */
const MAX_BASE64_LENGTH = 9_000_000;
const LANGUAGES = new Set(['en', 'es', 'fr', 'de']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const auth = await verifyAdminRequest(env, request);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  if (!env.AI) {
    return json(
      { ok: false, error: 'Esta instalación no tiene el binding de Workers AI. Vuelve a desplegar el sitio.' },
      503
    );
  }

  let body: { audio?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Cuerpo inválido' }, 400);
  }

  const audio = typeof body.audio === 'string' ? body.audio : '';
  if (!audio) return json({ ok: false, error: 'No llegó audio.' }, 400);
  if (audio.length > MAX_BASE64_LENGTH) {
    return json({ ok: false, error: 'La grabación es demasiado larga. Graba en partes de hasta tres minutos.' }, 413);
  }

  const language = LANGUAGES.has(String(body.language)) ? String(body.language) : undefined;

  try {
    const result = await env.AI.run(MODEL, {
      audio,
      ...(language ? { language } : {}),
      // Silence at the start and end of a phone recording is where Whisper
      // invents words; the voice filter trims it, and not conditioning on its
      // own output stops a phrase from being repeated.
      vad_filter: true,
      condition_on_previous_text: false,
    });
    const text = String(result?.text ?? result?.transcription_info?.text ?? '').trim();
    return json({ ok: true, text });
  } catch (error) {
    return json(
      { ok: false, error: `Whisper no pudo transcribir: ${error instanceof Error ? error.message : String(error)}` },
      502
    );
  }
}
