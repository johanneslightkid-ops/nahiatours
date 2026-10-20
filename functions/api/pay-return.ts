import { PaymentEnv } from '../../shared/paymentConfig';
import { guestLanding, readOrder, saveOrder, OrderProvider } from '../../shared/bankGateways';
import { readReturnParams, settleReturn } from '../../shared/paymentSettle';

/**
 * Where every processor sends the guest back to:
 *
 *   /api/pay-return/azul/<order>/approved|declined|cancelled
 *   /api/pay-return/cardnet/<order>/approved|cancelled
 *   /api/pay-return/verifone/<order>/approved
 *   /api/pay-return/stripe/<order>/approved?session_id=…|cancelled
 *   /api/pay-return/paypal/<order>/approved?token=…|cancelled
 *
 * The outcome in the path is only a hint; shared/paymentSettle.ts asks each
 * processor (or checks its signature) before anything is called paid. Then
 * the order is stored and the guest is sent on to the page they booked from
 * with `?payment_ref=`, where the receipt asks /api/payment-result what really
 * happened — and, if it did not work, why, and what they can do next.
 *
 * GET or POST: a processor that posts the guest back is read the same way.
 */

const PROVIDERS: OrderProvider[] = ['azul', 'cardnet', 'verifone', 'stripe', 'paypal'];

const redirect = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const [, , , provider, id, outcome] = url.pathname.split('/');

  if (!PROVIDERS.includes(provider as OrderProvider) || !id) {
    return redirect('/');
  }

  const order = await readOrder(env, id);
  if (!order || order.provider !== provider) {
    // A Stripe order that could not be stored still names its session: the
    // older receipt asks Stripe by it.
    const session = url.searchParams.get('session_id') ?? '';
    if (provider === 'stripe' && session) {
      return redirect(`/?paid=${outcome === 'cancelled' ? '0' : '1'}&session_id=${encodeURIComponent(session)}`);
    }
    return redirect(`/?payment_ref=${encodeURIComponent(id)}`);
  }

  // A guest who reloads the return page, or comes back twice, must not be
  // able to turn a settled answer into a different one.
  if (order.status !== 'pending' && order.status !== 'unverified') {
    return redirect(guestLanding(order));
  }

  await settleReturn(env, order, outcome ?? '', await readReturnParams(request));
  order.updatedAt = new Date().toISOString();
  await saveOrder(env, order);

  return redirect(guestLanding(order));
}
