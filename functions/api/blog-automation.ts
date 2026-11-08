import { verifyAdminRequest } from '../../shared/adminAuth';
import {
  DEFAULT_BLOG_AUTOMATION_CONFIG,
  normalizeBlogAutomationConfig,
  type BlogAutomationInterval,
} from '../../shared/blogAutomation';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const auth = await verifyAdminRequest(env, request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const kv = env.DATA_KV_F ?? env.DATA_KV;
  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
    return json({ ok: false, error: 'Automatic blog generation requires the site KV namespace.' }, 503);
  }

  let body: { action?: string; enabled?: unknown; intervalHours?: unknown };
  try {
    body = await request.json() as { action?: string; enabled?: unknown; intervalHours?: unknown };
  } catch {
    return json({ ok: false, error: 'Expected a valid JSON request body.' }, 400);
  }

  try {
    const raw = await kv.get('blog-automation');
    let current = DEFAULT_BLOG_AUTOMATION_CONFIG;
    if (raw !== null) {
      try {
        current = normalizeBlogAutomationConfig(JSON.parse(raw));
      } catch {
        return json({ ok: false, error: 'Saved automation settings are invalid JSON; correct them in site KV before continuing.' }, 500);
      }
    }

    if (body.action === 'load') return json({ ok: true, config: current });
    if (body.action !== 'save') return json({ ok: false, error: 'Unknown blog automation action.' }, 400);
    if (typeof body.enabled !== 'boolean') return json({ ok: false, error: 'Choose whether automatic generation is enabled.' }, 400);
    if (body.intervalHours !== 6 && body.intervalHours !== 12 && body.intervalHours !== 24) {
      return json({ ok: false, error: 'Generation interval must be 6, 12, or 24 hours.' }, 400);
    }

    const config = {
      ...current,
      enabled: body.enabled,
      intervalHours: body.intervalHours as BlogAutomationInterval,
    };
    await kv.put('blog-automation', JSON.stringify(config));
    return json({ ok: true, config });
  } catch (error) {
    console.error('[blog automation] Failed to load or save settings:', error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Could not access blog automation settings.',
    }, 503);
  }
}
