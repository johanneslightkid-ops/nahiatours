/**
 * Who last deployed each Worker, and how.
 *
 * Three sites share one Cloudflare account and one repository, and a site that
 * starts serving another one's pages has exactly two possible causes:
 * something deployed the wrong build INTO the Worker, or the domain is
 * attached to a different Worker. From outside they look identical.
 *
 * Cloudflare records a deployment history per script, including an annotation
 * saying what triggered each one. That distinguishes the two in one request:
 * if the Worker's newest deployment is not the one this repository's workflow
 * made, something else is writing to it.
 *
 * Read-only. It prints ids, timestamps and trigger annotations — never a
 * binding value, never a secret.
 */

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const cf = async (path) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => null);
  if (!body || body.success !== true) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(detail || `HTTP ${res.status} from ${path}`);
  }
  return body.result;
};

const main = async () => {
  if (!TOKEN) {
    console.warn('[deployments] no CLOUDFLARE_API_TOKEN — nothing to inspect.');
    return;
  }
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (await cf('/accounts?per_page=50').then((a) => a[0]?.id));

  const scripts = (process.env.WORKER_NAMES || 'nahiatours,beautifull,transporturist,ldvip,amigotours')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const name of scripts) {
    console.log(`\n═══ ${name} ═══`);
    try {
      const result = await cf(`/accounts/${accountId}/workers/scripts/${name}/deployments`);
      const list = (result?.deployments || []).slice(-6).reverse();
      if (!list.length) {
        console.log('  no deployment history');
      }
      for (const d of list) {
        const a = d.annotations || {};
        console.log(
          `  ${d.created_on}  ${d.id?.slice(0, 8) || '?'}  ` +
            `by ${d.author_email || 'unknown'}  ` +
            `via ${a['workers/triggered_by'] || 'unknown'}` +
            (a['workers/message'] ? `  — ${a['workers/message']}` : '')
        );
      }
    } catch (error) {
      console.log(`  could not read deployments: ${error.message}`);
    }

    // And which hostnames Cloudflare will send to this script. A domain on the
    // wrong Worker is the other half of the question.
    try {
      const domains = await cf(`/accounts/${accountId}/workers/domains?service=${name}`);
      const names = (domains || []).map((d) => d.hostname);
      console.log(`  custom domains: ${names.length ? names.join(', ') : '(none)'}`);
    } catch (error) {
      console.log(`  custom domains: unreadable (${error.message})`);
    }
  }
};

main().catch((error) => {
  console.warn(`[deployments] ${error.message}`);
});
