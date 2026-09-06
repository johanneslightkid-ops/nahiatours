import { verifyAdminRequest, AdminAuthEnv } from '../../shared/adminAuth';

/**
 * Admin login check.
 *
 * The admin gate used to compare against `import.meta.env.VITE_ADMIN_PASSWORD`,
 * a value baked into the JavaScript bundle at build time. That had two
 * problems: the password shipped to every visitor, and if the build did not
 * happen to have the variable set the constant became an empty string and no
 * password could ever be right — which is what locked admin out on the Worker
 * deployment, where wrangler.toml [vars] are runtime values the Vite build
 * never sees.
 *
 * So the check happens here instead, against the same runtime variable the
 * write endpoints already use. Nothing secret reaches the browser.
 */
export async function onRequest(context: { request: Request; env: AdminAuthEnv }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST requests are allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    });
  }

  const result = verifyAdminRequest(env, request);

  return new Response(
    JSON.stringify(result.ok ? { ok: true } : { ok: false, error: result.error }),
    {
      status: result.ok ? 200 : result.status,
      headers: {
        'Content-Type': 'application/json',
        // An auth result must never be cached, by the browser or by an edge.
        'Cache-Control': 'no-store',
      },
    }
  );
}
