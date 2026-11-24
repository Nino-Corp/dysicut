import "server-only";
import Stripe from "stripe";
import { site } from "@/config/site";

let client: Stripe | null = null;

/** Stripe est utilisable seulement si la cle secrete ET le secret du webhook sont renseignes. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe non configuré (STRIPE_SECRET_KEY)");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Stripe impose 30 min minimum avant l'expiration d'une session : on prend 31 min, la base garde 35 min. */
export const CHECKOUT_MINUTES = 31;

type CheckoutInput = { bookingId: string; token: string; serviceName: string; depositCents: number; email: string | null };

/** Page de paiement hebergee par Stripe (carte, Apple Pay, Google Pay selon le compte) : aucune donnee bancaire chez nous. */
export async function createDepositCheckout(i: CheckoutInput): Promise<{ id: string; url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    client_reference_id: i.bookingId,
    ...(i.email ? { customer_email: i.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: i.depositCents,
          product_data: { name: `Acompte - ${i.serviceName}`, description: `${site.name}, à déduire du prix sur place` },
        },
      },
    ],
    metadata: { booking_id: i.bookingId },
    payment_intent_data: { metadata: { booking_id: i.bookingId } },
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
    success_url: `${site.url}/rdv/${i.token}?paiement=ok`,
    cancel_url: `${site.url}/rdv/${i.token}?paiement=annule`,
  });
  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement");
  return { id: session.id, url: session.url };
}

/** Rembourse l'acompte en totalité. Idempotent : une cle par paiement evite un double remboursement. */
export async function refundDeposit(paymentIntent: string): Promise<void> {
  try {
    await stripe().refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-${paymentIntent}` });
  } catch (e) {
    // Deja rembourse : le but est atteint.
    if (e instanceof Stripe.errors.StripeError && e.code === "charge_already_refunded") return;
    throw e;
  }
}

/** Ferme la page de paiement d'un rdv abandonne (silencieux si deja expiree ou payee). */
export async function expireCheckout(sessionId: string): Promise<void> {
  try {
    await stripe().checkout.sessions.expire(sessionId);
  } catch {
    /* deja expiree, completee ou introuvable */
  }
}
