/**
 * Admin password checking — one implementation, server side only.
 *
 * This used to be four copies with three different hardcoded fallbacks
 * ('toursadmin' in upload, 'c@n@rio2690' in data / cf-ai / social-publish), so
 * a deployment that never set ADMIN_PASSWORD silently accepted a password
 * anyone could read in the public repo. There is no fallback now: with nothing
 * configured, admin writes fail closed and say so.
 *
 * WHERE THE PASSWORD LIVES. Two places, in this order:
 *
 *   1. KV, under `admin-password`. Written by the admin panel, so an operator
 *      can change it without a redeploy and without anyone touching wrangler.
 *   2. The ADMIN_PASSWORD var in wrangler.toml. The INITIAL password, and the
 *      only one a deployment has before somebody changes it. It is committed
 *      in plaintext, so it is a starting point, not a secret.
 *
 * Once KV holds a password the var stops mattering, which is the point: the
 * value in the repository is no longer the way in. Deleting the KV key puts
 * the var back in charge, which is the recovery path if a password is lost.
 */

export const ADMIN_PASSWORD_HEADER = 'X-Admin-Password';

/** KV key the operator-set password lives under. */
export const ADMIN_PASSWORD_KEY = 'admin-password';

/** Short enough to be typable, long enough not to be walked into. */
export const ADMIN_PASSWORD_MIN_LENGTH = 4;

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AdminAuthEnv {
  ADMIN_PASSWORD?: string;
  /** Historical alias — some deployments only ever set the VITE_ copy. */
  VITE_ADMIN_PASSWORD?: string;
  DATA_KV_F?: KVLike;
  DATA_KV?: KVLike;
  [key: string]: unknown;
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

/**
 * Prefer a site-specific binding `DATA_KV_F` if present, otherwise fall back
 * to `DATA_KV` — the same order functions/api/data.ts uses.
 */
export const adminKv = (env: AdminAuthEnv): KVLike | null =>
  (env.DATA_KV_F ?? env.DATA_KV) ?? null;

const configuredPassword = (env: AdminAuthEnv): string | null => {
  const password = env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD;
  return typeof password === 'string' && password.length > 0 ? password : null;
};

/**
 * The password this deployment currently accepts.
 *
 * A KV read that throws is treated as "KV said nothing" rather than as a
 * failure: a namespace that is unreachable should not lock the operator out
 * of a site whose wrangler var still holds a usable password.
 */
const resolvePassword = async (env: AdminAuthEnv): Promise<string | null> => {
  const kv = adminKv(env);
  if (kv) {
    try {
      const stored = await kv.get(ADMIN_PASSWORD_KEY);
      if (typeof stored === 'string' && stored.length > 0) {
        return stored;
      }
    } catch (error) {
      console.warn('[adminAuth] KV lookup failed, falling back to the env var:', error);
    }
  }
  return configuredPassword(env);
};

/**
 * Constant-time-ish comparison. Not a defence against a serious timing attack
 * over the network, but it costs nothing and avoids the trivial early-exit of
 * `===` on a secret.
 */
const matches = (expected: string, provided: string): boolean => {
  if (expected.length !== provided.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
};

/** Check a password against the one this deployment currently accepts. */
export const verifyAdminPassword = async (
  env: AdminAuthEnv,
  provided: string | null
): Promise<AdminAuthResult> => {
  const expected = await resolvePassword(env);
  if (!expected) {
    return {
      ok: false,
      status: 500,
      error:
        'ADMIN_PASSWORD is not configured for this deployment. Set it as a ' +
        'variable on the Worker (or with `wrangler secret put ADMIN_PASSWORD`).',
    };
  }
  if (!provided || !matches(expected, provided)) {
    return { ok: false, status: 401, error: 'Invalid admin password.' };
  }
  return { ok: true };
};

/** Same check, reading the password straight off the request headers. */
export const verifyAdminRequest = (
  env: AdminAuthEnv,
  request: Request
): Promise<AdminAuthResult> =>
  verifyAdminPassword(env, request.headers.get(ADMIN_PASSWORD_HEADER));

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; status: 400 | 401 | 500 | 503; error: string };

/**
 * Replace the password, having checked the current one.
 *
 * Requires KV: there is nowhere else a running Worker can write that survives
 * the request. A deployment with no namespace bound gets a 503 that says so,
 * rather than a success that quietly changes nothing.
 */
export const changeAdminPassword = async (
  env: AdminAuthEnv,
  currentPassword: string | null,
  newPassword: string
): Promise<PasswordChangeResult> => {
  const auth = await verifyAdminPassword(env, currentPassword);
  if (!auth.ok) {
    return auth.status === 401
      ? { ok: false, status: 401, error: 'La contraseña actual no es correcta.' }
      : { ok: false, status: 500, error: auth.error };
  }

  const next = typeof newPassword === 'string' ? newPassword.trim() : '';
  if (next.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `La nueva contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }
  if (next === currentPassword) {
    return {
      ok: false,
      status: 400,
      error: 'La nueva contraseña es igual a la actual.',
    };
  }

  const kv = adminKv(env);
  if (!kv) {
    return {
      ok: false,
      status: 503,
      error:
        'Esta instalación no tiene almacenamiento KV, así que no hay dónde guardar ' +
        'la contraseña. Conecta un namespace KV al Worker y vuelve a intentarlo.',
    };
  }

  try {
    await kv.put(ADMIN_PASSWORD_KEY, next);
    return { ok: true };
  } catch (error: any) {
    console.error('[adminAuth] could not write the new password:', error);
    return {
      ok: false,
      status: 500,
      error: 'No se pudo guardar la contraseña. Inténtalo de nuevo.',
    };
  }
};
