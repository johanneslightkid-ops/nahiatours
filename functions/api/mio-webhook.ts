import { PaymentEnv } from '../../shared/paymentConfig';
import { readOrder, saveOrder } from '../../shared/bankGateways';
import { refreshOrder } from '../../shared/paymentSettle';

/**
 * MIO's notice that something happened on an order's payment link
 * (`webhook_url` in shared/mio.ts, `?order=<id>`).
 *
 * The notice itself is not trusted — Geopagos publishes no signature for it —
 * it is only the cue to ask MIO about the link, exactly as the guest's return
 * does, so a guest who closes MIO's page before being sent back still ends
 * up with a settled order. Always 200, so MIO does not keep retrying.
 */
export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  const ok = () => new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (request.method !== 'POST') return ok();
  const id = new URL(request.url).searchParams.get('order') ?? '';
  const order = await readOrder(env, id);
  if (!order || order.provider !== 'mio') return ok();
  if (await refreshOrder(env, order)) {
    order.updatedAt = new Date().toISOString();
    await saveOrder(env, order);
  }
  return ok();
}
