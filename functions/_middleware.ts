import { canonicalRedirect, CanonicalEnv } from '../shared/canonical';

/**
 * Canonical-host redirect for the Pages deployment.
 *
 * The policy itself lives in shared/canonical.ts so the Worker entry point
 * (worker/index.ts) applies exactly the same rule. Preview hosts are no longer
 * redirected away — see that module for why.
 */
export async function onRequest(context: {
  request: Request;
  env: CanonicalEnv;
  next: () => Promise<Response>;
}) {
  const { request, env, next } = context;

  const redirect = canonicalRedirect(new URL(request.url), env);
  if (redirect) {
    return redirect;
  }

  return next();
}
