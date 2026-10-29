import Stripe from 'stripe';

let client: Stripe | undefined;
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY não configurada.');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
