/**
 * Move a hostname from a Cloudflare Pages project onto a Worker.
 *
 * THIS TAKES A LIVE SITE OFF A DOMAIN. Cloudflare will not let two things
 * claim one hostname, so the only way to attach it to a Worker is to release
 * it from the Pages project first — and between those two calls the domain
 * resolves to nothing. That window is why this is a deliberate, manual
 * workflow with a typed confirmation rather than a step in a deploy.
 *
 * What it does NOT do: delete the Pages project, touch its builds, or remove
 * its own *.pages.dev hostname. The old site stays exactly where it is and
 * stays reachable there; only the custom domain moves.
 *
 * It is written to be safe to run twice. Each step checks the current state
 * first, so a re-run after a half-finished move finishes the job instead of
 * failing on the part that already succeeded.
 */

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const HOST = (process.env.MOVE_HOST || '').trim();
const WORKER = (process.env.MOVE_TO_WORKER || '').trim();
const CONFIRM = (process.env.MOVE_CONFIRM || '').trim();

const cf = async (path, init = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!body || body.success !== true) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
    const err = new Error(detail || `HTTP ${res.status} from ${path}`);
    err.status = res.status;
    err.codes = (body?.errors || []).map((e) => e.code);
    throw err;
  }
  return body.result;
};

const main = async () => {
  if (!TOKEN) throw new Error('no CLOUDFLARE_API_TOKEN');
  if (!HOST || !WORKER) throw new Error('set MOVE_HOST and MOVE_TO_WORKER');
  if (CONFIRM !== HOST) {
    throw new Error(
      `refusing to move "${HOST}": the confirmation input must repeat the hostname exactly. ` +
        `This call takes a live site off a domain, so it does not run on a typo.`
    );
  }

  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (await cf('/accounts?per_page=50').then((a) => a[0]?.id));
  console.log(`[move] ${HOST}  →  Worker "${WORKER}"  (account ${accountId})\n`);

  // ── 0. The Worker has to exist first. Attaching a domain to a Worker that
  //       is not deployed yet would release the hostname into nothing.
  const scripts = await cf(`/accounts/${accountId}/workers/scripts`);
  if (!(scripts || []).some((s) => s.id === WORKER)) {
    throw new Error(
      `Worker "${WORKER}" does not exist on this account. Deploy it before moving a domain to it.`
    );
  }
  console.log(`  ✓ Worker "${WORKER}" exists`);

  // ── 1. Who holds it now.
  const zones = await cf('/zones?per_page=100');
  const zone = (zones || []).find((z) => HOST === z.name || HOST.endsWith(`.${z.name}`));
  if (!zone) throw new Error(`no zone on this account covers ${HOST}`);
  console.log(`  ✓ zone ${zone.name} (${zone.id})`);

  const pages = await cf(`/accounts/${accountId}/pages/projects`);
  const owner = (pages || []).find((p) => (p.domains || []).includes(HOST));

  // ── 2. Release it from Pages, if Pages still has it.
  if (owner) {
    console.log(`\n  ${HOST} is currently on the Pages project "${owner.name}".`);
    console.log(`  Its own ${owner.name}.pages.dev keeps working — only the custom domain moves.`);
    await cf(
      `/accounts/${accountId}/pages/projects/${owner.name}/domains/${encodeURIComponent(HOST)}`,
      { method: 'DELETE' }
    );
    console.log(`  ✓ released from "${owner.name}"`);
  } else {
    console.log(`\n  no Pages project currently claims ${HOST} — nothing to release`);
  }

  // ── 3. Clear the address record the old owner left behind.
  //
  //       Releasing a hostname from Pages does NOT remove the DNS record Pages
  //       created for it. Cloudflare then refuses to attach the hostname to a
  //       Worker — "already has externally managed DNS records", error 100117 —
  //       because a Workers custom domain manages the record itself and will
  //       not fight one it did not write.
  //
  //       So the leftover has to go, and it is the record that still points at
  //       the site we have just disconnected: leaving it is not "safe", it is
  //       the domain resolving to a Pages project that no longer answers for
  //       it. Only A, AAAA and CNAME for this exact name are touched. MX, TXT,
  //       SPF, DKIM, CAA and every record for any other name are left alone —
  //       mail and verification must not be collateral damage of a site move.
  const ADDRESS_TYPES = new Set(['A', 'AAAA', 'CNAME']);
  const attach = () =>
    cf(`/accounts/${accountId}/workers/domains`, {
      method: 'PUT',
      body: JSON.stringify({
        zone_id: zone.id,
        hostname: HOST,
        service: WORKER,
        environment: 'production',
      }),
    });

  const clearAddressRecords = async () => {
    const records = await cf(
      `/zones/${zone.id}/dns_records?name=${encodeURIComponent(HOST)}&per_page=100`
    );
    const stale = (records || []).filter(
      (r) => r.name === HOST && ADDRESS_TYPES.has(r.type)
    );
    const kept = (records || []).filter((r) => !ADDRESS_TYPES.has(r.type));
    if (kept.length) {
      console.log(
        `  · leaving ${kept.length} non-address record(s) alone: ` +
          kept.map((r) => r.type).join(', ')
      );
    }
    if (!stale.length) {
      console.log('  · no address record on this hostname to clear');
      return 0;
    }
    for (const record of stale) {
      console.log(`  · removing ${record.type} ${record.name} → ${record.content}`);
      await cf(`/zones/${zone.id}/dns_records/${record.id}`, { method: 'DELETE' });
    }
    return stale.length;
  };

  // ── 4. Attach it to the Worker.
  const existing = await cf(`/accounts/${accountId}/workers/domains?hostname=${HOST}`).catch(
    () => []
  );
  if ((existing || []).some((d) => d.hostname === HOST && d.service === WORKER)) {
    console.log(`  ✓ already attached to "${WORKER}"`);
  } else {
    try {
      await attach();
      console.log(`  ✓ attached to Worker "${WORKER}"`);
    } catch (error) {
      if (!(error.codes || []).includes(100117)) throw error;
      console.log(`\n  a DNS record is still claiming ${HOST}:`);
      const removed = await clearAddressRecords();
      if (!removed) throw error;
      await attach();
      console.log(`  ✓ attached to Worker "${WORKER}"`);
    }
  }

  // ── 5. Say what is true now, read back from Cloudflare rather than assumed.
  const after = await cf(`/accounts/${accountId}/workers/domains?service=${WORKER}`);
  console.log(`\n  ${WORKER} now serves: ${(after || []).map((d) => d.hostname).join(', ') || '(none)'}`);
  const pagesAfter = await cf(`/accounts/${accountId}/pages/projects`);
  const stillOwner = (pagesAfter || []).find((p) => (p.domains || []).includes(HOST));
  console.log(
    stillOwner
      ? `  !! ${HOST} is STILL on Pages project "${stillOwner.name}" — the release did not take`
      : `  ✓ no Pages project claims ${HOST} any more`
  );
  console.log(`\n  Check it: https://${HOST}/api/health`);
};

main().catch((error) => {
  console.error(`[move] FAILED: ${error.message}`);
  if ((error.codes || []).length) console.error(`[move] codes: ${error.codes.join(', ')}`);
  console.error(
    '[move] A permissions failure here usually means the API token is Workers-only.\n' +
      '[move] Moving a domain needs, on top of Workers Scripts: Edit —\n' +
      '[move]   • Account / Cloudflare Pages: Edit   (to release the domain)\n' +
      '[move]   • Zone / Workers Routes: Edit        (to attach it)\n' +
      '[move]   • Zone / DNS: Edit                   (Cloudflare writes the record)\n' +
      '[move] all scoped to this account and the domain’s zone.'
  );
  process.exit(1);
});
