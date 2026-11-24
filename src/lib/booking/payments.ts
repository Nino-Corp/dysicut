import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db/supabase";
import { refundDeposit } from "@/lib/stripe/stripe";
import type { BookingRow } from "./repo";

const bookingIdOf = (s: Stripe.Checkout.Session): string | null => s.metadata?.booking_id ?? s.client_reference_id ?? null;
const intentOf = (s: Stripe.Checkout.Session): string | null => (typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null));

export type PaidOutcome =
  | { kind: "confirmed"; booking: BookingRow }
  | { kind: "ignored" }
  /** Créneau repris entre-temps ou rdv déjà annulé : l'acompte a été rendu. */
  | { kind: "refunded"; booking: BookingRow | null };

/**
 * Paiement reçu : confirme le rdv. Idempotent (Stripe renvoie parfois deux fois le même événement).
 * Si la réservation provisoire avait expiré mais que le créneau est encore libre, on confirme quand même ;
 * si le créneau a été pris, on rend l'argent.
 */
export async function confirmPaidSession(session: Stripe.Checkout.Session): Promise<PaidOutcome> {
  const id = bookingIdOf(session);
  const intent = intentOf(session);
  if (!id || session.payment_status !== "paid") return { kind: "ignored" };

  const { data, error } = await db()
    .from("bookings")
    .update({ status: "confirmed", payment_status: "paid", stripe_payment_intent: intent, hold_expires_at: null, checkout_url: null })
    .eq("id", id)
    .in("status", ["pending_payment", "expired"])
    .select("*")
    .maybeSingle();

  if (!error && data) return { kind: "confirmed", booking: data as BookingRow };

  const { data: current } = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  const row = (current as BookingRow | null) ?? null;
  // Déjà confirmé par un envoi précédent du même événement : rien à refaire.
  if (!error && row?.status === "confirmed" && row.payment_status === "paid") return { kind: "ignored" };

  // Conflit de créneau (23P01), rdv annulé ou introuvable : on rend l'acompte.
  if (intent && row?.payment_status !== "refunded") {
    try {
      await refundDeposit(intent);
      if (row) await db().from("bookings").update({ status: "expired", payment_status: "refunded", stripe_payment_intent: intent }).eq("id", id);
      console.warn("[stripe] paiement reçu pour un créneau indisponible, remboursé", id);
    } catch (e) {
      console.error("[stripe] REMBOURSEMENT À FAIRE À LA MAIN", id, intent, e);
    }
  }
  return { kind: "refunded", booking: row };
}

/** Page de paiement expirée sans paiement : libère le créneau. */
export async function releaseExpiredSession(session: Stripe.Checkout.Session): Promise<void> {
  const id = bookingIdOf(session);
  if (!id) return;
  await db().from("bookings").update({ status: "expired", payment_status: "none" }).eq("id", id).eq("status", "pending_payment");
}
