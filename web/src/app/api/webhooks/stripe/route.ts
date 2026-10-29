import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/server/db/prisma';
import { stripeClient } from '@/server/payments/stripe';

export const runtime = 'nodejs';
const activeStatus = (s: string) => s === 'active' || s === 'trialing';
function unixDate(seconds?: number | null) { return seconds ? new Date(seconds * 1000) : null; }

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 400 }); }

  let payload: { userId: string; customerId: string | null; subscriptionId: string; status: string; periodEnd: Date | null } | null = null;
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const userId = session.metadata?.userId || session.client_reference_id;
      if (subscriptionId && userId) {
        const sub = await stripeClient().subscriptions.retrieve(subscriptionId);
        payload = { userId, customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id, subscriptionId: sub.id, status: sub.status, periodEnd: unixDate(sub.items.data[0]?.current_period_end) };
      }
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        // Re-read canonical subscription state so a delayed webhook cannot undo a newer cancellation.
        const current = await stripeClient().subscriptions.retrieve(sub.id);
        payload = { userId, customerId: typeof current.customer === 'string' ? current.customer : current.customer.id, subscriptionId: current.id, status: current.status, periodEnd: unixDate(current.items.data[0]?.current_period_end) };
      }
    }
    await prisma.$transaction(async tx => {
      await tx.eventoPagamentoProcessado.create({ data: { gateway: 'STRIPE', eventoId: event.id } });
      if (!payload) return;
      await tx.assinaturaPagamento.upsert({ where: { assinaturaGatewayId: payload.subscriptionId }, create: { usuarioId: payload.userId, gateway: 'STRIPE', clienteGatewayId: payload.customerId, assinaturaGatewayId: payload.subscriptionId, status: activeStatus(payload.status) ? 'ATIVA' : payload.status === 'canceled' ? 'CANCELADA' : 'EXPIRADA', periodoAte: payload.periodEnd }, update: { status: activeStatus(payload.status) ? 'ATIVA' : payload.status === 'canceled' ? 'CANCELADA' : 'EXPIRADA', periodoAte: payload.periodEnd, clienteGatewayId: payload.customerId } });
      const hasActive = await tx.assinaturaPagamento.count({ where: { usuarioId: payload.userId, status: 'ATIVA', OR: [{ periodoAte: null }, { periodoAte: { gt: new Date() } }] } });
      await tx.usuario.update({ where: { id: payload.userId }, data: { plano: hasActive ? 'PREMIUM' : 'GRATUITO' } });
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return NextResponse.json({ received: true, duplicate: true });
    console.error('Falha ao processar webhook Stripe.', error);
    return NextResponse.json({ error: 'Falha temporária no processamento.' }, { status: 500 });
  }
}
