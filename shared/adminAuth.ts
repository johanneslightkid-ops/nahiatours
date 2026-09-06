/**
 * Admin password checking — one implementation, server side only.
 *
 * This used to be four copies with three different hardcoded fallbacks
 * ('toursadmin' in upload, 'c@n@rio2690' in data / cf-ai / social-publish), so
 * a deployment that never set ADMIN_PASSWORD silently accepted a password
 * anyone could read in the public repo. There is no fallback now: with nothing
 * configured, admin writes fail closed and say so.
 */

export const ADMIN_PASSWORD_HEADER = 'X-Admin-Password';

export interface AdminAuthEnv {
  ADMIN_PASSWORD?: string;
  /** Historical alias — some deployments only ever set the VITE_ copy. */
  VITE_ADMIN_PASSWORD?: string;
  [key: string]: unknown;
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

const configuredPassword = (env: AdminAuthEnv): string | null => {
  const password = env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD;
  return typeof password === 'string' && password.length > 0 ? password : null;
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

/** Check a password against the deployment's configured one. */
export const verifyAdminPassword = (
  env: AdminAuthEnv,
  provided: string | null
): AdminAuthResult => {
  const expected = configuredPassword(env);
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
): AdminAuthResult =>
  verifyAdminPassword(env, request.headers.get(ADMIN_PASSWORD_HEADER));
