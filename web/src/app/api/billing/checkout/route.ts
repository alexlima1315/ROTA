import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/server/auth/current-user';
import { prisma } from '@/server/db/prisma';
import { stripeClient } from '@/server/payments/stripe';

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: 'Entre na sua conta antes de assinar.' }, { status: 401 });
  const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { email: true, nome: true, plano: true } });
  if (!user) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
  if (user.plano === 'PREMIUM') return NextResponse.json({ error: 'Sua conta já possui Premium.' }, { status: 409 });
  const site = process.env.APP_URL;
  const price = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!site || !price) return NextResponse.json({ error: 'Checkout ainda não está configurado.' }, { status: 503 });
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price, quantity: 1 }], customer_email: user.email, client_reference_id: userId, metadata: { userId }, subscription_data: { metadata: { userId } }, success_url: `${site}/dashboard?assinatura=confirmando`, cancel_url: `${site}/plans?checkout=cancelado` });
  return NextResponse.json({ url: session.url });
}
