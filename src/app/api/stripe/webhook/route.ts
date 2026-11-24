import { stripe } from "@/lib/stripe/stripe";
import { confirmPaidSession, releaseExpiredSession } from "@/lib/booking/payments";
import { barberNotice, clientConfirmation } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe : seule source de verite pour confirmer un rdv a acompte (jamais la page de retour du client).
 * Evenements a activer dans le dashboard Stripe : checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.expired. La signature est verifiee sur le corps brut.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Unauthorized", { status: 400 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const out = await confirmPaidSession(event.data.object);
      if (out.kind === "confirmed") {
        const b = out.booking;
        const notify = process.env.NOTIFY_EMAIL;
        if (notify) await sendMail(barberNotice("new", b, notify));
        if (b.email) await sendMail(clientConfirmation(b, b.cancel_token));
      }
    } else if (event.type === "checkout.session.expired") {
      await releaseExpiredSession(event.data.object);
    }
  } catch (e) {
    console.error("[stripe] webhook en erreur", event.type, e);
    return new Response("Erreur", { status: 500 }); // Stripe réessaiera
  }
  return Response.json({ received: true });
}
