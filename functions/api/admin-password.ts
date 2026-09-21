import { ADMIN_PASSWORD_HEADER, changeAdminPassword, AdminAuthEnv } from '../../shared/adminAuth';

/**
 * Change the admin password.
 *
 * POST, with the CURRENT password in the X-Admin-Password header and the new
 * one in the body. The header carries the current password rather than the
 * body carrying both, so this endpoint is authenticated exactly like every
 * other admin write and nothing special has to be remembered about it.
 *
 * Never cached: the response says whether a password was accepted.
 */
export async function onRequest(context: { request: Request; env: AdminAuthEnv }) {
  const { request, env } = context;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let newPassword = '';
  try {
    const body = (await request.json()) as { newPassword?: unknown };
    newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return json({ error: 'Cuerpo de la petición inválido.' }, 400);
  }

  const result = await changeAdminPassword(
    env,
    request.headers.get(ADMIN_PASSWORD_HEADER),
    newPassword
  );

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json({ ok: true });
}
