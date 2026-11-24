import "server-only";
import { defaultBookingSettings, defaultOpeningHours, defaultServices } from "@/config/site";
import { db, dbConfigured } from "@/lib/db/supabase";
import { BookingError, type BookingErrorCode } from "./errors";
import { availability, slotsForDay, type HoursByDay, type Interval, type SlotRules } from "./slots";
import { parisDateKey, addDays, parisToUtc } from "./time";
import { isTokenShape, newCancelToken } from "./token";
import type { DepositMode } from "./standing";
import { createDepositCheckout, expireCheckout, refundDeposit, stripeConfigured } from "@/lib/stripe/stripe";

export type PublicService = { id: string; name: string; durationMin: number; priceEur: number };

export type BookingConfig = {
  enabled: boolean;
  stepMin: number;
  minLeadHours: number;
  maxAdvanceDays: number;
  cancelMinHours: number;
  /** Absences avant blocage du numéro (0 = pas de blocage automatique). */
  noShowThreshold: number;
  depositMode: DepositMode;
  depositEur: number;
  /** Vrai seulement si l'acompte est réellement possible (mode actif ET Stripe configuré). */
  depositActive: boolean;
  services: PublicService[];
  hours: HoursByDay;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled_client" | "cancelled_barber" | "no_show" | "expired";
export type PaymentStatus = "none" | "pending" | "paid" | "refunded" | "forfeited";

export type BookingRow = {
  id: string;
  service_id: string;
  service_name: string;
  price_cents: number;
  starts_at: string;
  ends_at: string;
  first_name: string;
  phone: string;
  email: string | null;
  status: BookingStatus;
  deposit_cents: number;
  payment_status: PaymentStatus;
  hold_expires_at: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  checkout_url: string | null;
  source: "web" | "admin";
  cancel_token: string;
  created_at: string;
  cancelled_at: string | null;
  email_reminder_sent_at: string | null;
  sms_reminder_sent_at: string | null;
};

/** Ce que le client a le droit de voir de son propre rdv (jamais téléphone ni email). */
export type BookingView = {
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  priceEur: number;
  firstName: string;
  /** Acompte exigé pour ce rdv (0 = aucun) et son état. */
  depositEur: number;
  paymentStatus: PaymentStatus;
  /** Lien de paiement Stripe, seulement tant que le rdv attend son acompte. */
  checkoutUrl: string | null;
  /** Fin de la réservation provisoire (paiement en attente). */
  holdExpiresAt: string | null;
  cancellable: boolean;
  /** Dernier instant pour annuler en ligne. */
  cancelDeadline: string;
};

export const toView = (b: BookingRow, cancelMinHours: number, now = new Date()): BookingView => {
  const deadline = new Date(new Date(b.starts_at).getTime() - cancelMinHours * 3_600_000);
  return {
    status: b.status,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    serviceName: b.service_name,
    priceEur: b.price_cents / 100,
    firstName: b.first_name,
    depositEur: b.deposit_cents / 100,
    paymentStatus: b.payment_status,
    checkoutUrl: b.status === "pending_payment" && b.hold_expires_at && new Date(b.hold_expires_at) > now ? b.checkout_url : null,
    holdExpiresAt: b.status === "pending_payment" ? b.hold_expires_at : null,
    cancellable: b.status === "confirmed" && now < deadline,
    cancelDeadline: deadline.toISOString(),
  };
};

const KNOWN: BookingErrorCode[] = ["SLOT_TAKEN", "TOO_SOON", "TOO_FAR", "ACTIVE_BOOKING", "RATE_LIMITED", "SERVICE_UNAVAILABLE", "BOOKING_DISABLED", "PHONE_BLOCKED"];

function fail(error: { code?: string; message?: string }): never {
  if (error.code === "23P01") throw new BookingError("SLOT_TAKEN"); // contrainte anti-chevauchement
  const known = KNOWN.find((k) => error.message?.includes(k));
  if (known) throw new BookingError(known);
  console.error("[booking] erreur base de données", error);
  throw new BookingError("UNAVAILABLE");
}

/** Réglages, prestations et horaires. En développement sans base, repli sur les valeurs de site.ts. */
export async function getConfig(): Promise<BookingConfig> {
  if (!dbConfigured()) {
    if (process.env.NODE_ENV === "production") throw new BookingError("UNAVAILABLE");
    const d = defaultBookingSettings;
    return {
      enabled: true,
      stepMin: d.slotStepMin,
      minLeadHours: d.minLeadHours,
      maxAdvanceDays: d.maxAdvanceDays,
      cancelMinHours: 2,
      noShowThreshold: 2,
      depositMode: "off",
      depositEur: 5,
      depositActive: false,
      services: defaultServices.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, priceEur: s.priceEur })),
      hours: defaultOpeningHours,
    };
  }
  const [settings, services, hours] = await Promise.all([
    db().from("booking_settings").select("*").eq("id", 1).maybeSingle(),
    db().from("services").select("id,name,duration_min,price_cents").eq("active", true).order("sort"),
    db().from("opening_hours").select("weekday,start_time,end_time"),
  ]);
  const err = settings.error ?? services.error ?? hours.error;
  if (err) fail(err);
  const s = settings.data;
  if (!s) throw new BookingError("UNAVAILABLE"); // migration non appliquée
  const depositMode: DepositMode = s.deposit_mode === "all" || s.deposit_mode === "flagged" ? s.deposit_mode : "off";
  const byDay: HoursByDay = {};
  for (const h of hours.data ?? []) byDay[h.weekday] = { start: String(h.start_time).slice(0, 5), end: String(h.end_time).slice(0, 5) };
  return {
    enabled: s.booking_enabled,
    stepMin: s.slot_step_min,
    minLeadHours: s.min_lead_hours,
    maxAdvanceDays: s.max_advance_days,
    cancelMinHours: s.cancel_min_hours,
    // Colonnes de la migration 0003 : valeurs par défaut tant qu'elle n'est pas appliquée.
    noShowThreshold: s.no_show_block_threshold ?? 2,
    depositMode: depositMode,
    depositEur: (s.deposit_cents ?? 500) / 100,
    depositActive: depositMode !== "off" && stripeConfigured(),
    services: (services.data ?? []).map((r) => ({ id: r.id, name: r.name, durationMin: r.duration_min, priceEur: r.price_cents / 100 })),
    hours: byDay,
  };
}

/** Rdv confirmés, réservations provisoires (acompte en attente, non expirées) et congés qui rencontrent [from, to]. */
async function loadBusy(from: Date, to: Date): Promise<Interval[]> {
  const [b, t] = await Promise.all([
    db()
      .from("bookings")
      .select("starts_at,ends_at")
      .or(`status.eq.confirmed,and(status.eq.pending_payment,hold_expires_at.gt.${new Date().toISOString()})`)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
    db().from("time_off").select("starts_at,ends_at").lt("starts_at", to.toISOString()).gt("ends_at", from.toISOString()),
  ]);
  const err = b.error ?? t.error;
  if (err) fail(err);
  return [...(b.data ?? []), ...(t.data ?? [])].map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) }));
}

const rulesFor = (cfg: BookingConfig, service: PublicService, busy: Interval[]): SlotRules => ({
  hours: cfg.hours,
  stepMin: cfg.stepMin,
  durationMin: service.durationMin,
  minLeadHours: cfg.minLeadHours,
  maxAdvanceDays: cfg.maxAdvanceDays,
  busy,
});

export async function getAvailability(serviceId: string) {
  const cfg = await getConfig();
  if (!cfg.enabled) throw new BookingError("BOOKING_DISABLED");
  const service = cfg.services.find((s) => s.id === serviceId);
  if (!service) throw new BookingError("SERVICE_UNAVAILABLE");
  const now = new Date();
  const busy = await loadBusy(now, new Date(now.getTime() + (cfg.maxAdvanceDays + 2) * 86_400_000));
  const days = availability(rulesFor(cfg, service, busy), now).filter((d) => d.slots.length > 0);
  return { service, days };
}

export type CreateInput = { serviceId: string; start: Date; firstName: string; phone: string; email: string | null; ipHash: string | null };

export type CreateResult = { booking: BookingRow; token: string; cfg: BookingConfig; checkoutUrl: string | null };

export async function createBooking(input: CreateInput): Promise<CreateResult> {
  const cfg = await getConfig();
  if (!cfg.enabled) throw new BookingError("BOOKING_DISABLED");
  const service = cfg.services.find((s) => s.id === input.serviceId);
  if (!service) throw new BookingError("SERVICE_UNAVAILABLE");

  // Le créneau doit exister dans le calcul serveur (horaires, pas, délais, congés, rdv). La base revérifie les chevauchements.
  const dateKey = parisDateKey(input.start);
  const busy = await loadBusy(parisToUtc(addDays(dateKey, -1), "00:00"), parisToUtc(addDays(dateKey, 2), "00:00"));
  const ok = slotsForDay(dateKey, rulesFor(cfg, service, busy)).some((d) => d.getTime() === input.start.getTime());
  if (!ok) {
    const now = Date.now();
    if (input.start.getTime() < now + cfg.minLeadHours * 3_600_000) throw new BookingError("TOO_SOON");
    if (input.start.getTime() > now + cfg.maxAdvanceDays * 86_400_000) throw new BookingError("TOO_FAR");
    throw new BookingError("SLOT_TAKEN");
  }

  const token = newCancelToken();
  const { data, error } = await db().rpc("create_booking", {
    p_service_id: service.id,
    p_starts_at: input.start.toISOString(),
    p_first_name: input.firstName,
    p_phone: input.phone,
    p_email: input.email,
    p_token: token,
    p_ip_hash: input.ipHash,
    p_deposit_allowed: stripeConfigured(),
    p_hold_minutes: 35,
  });
  if (error) fail(error);
  let booking = data as BookingRow;

  // Acompte exigé : le rdv est provisoire jusqu'au paiement. Si Stripe est injoignable, on libère aussitôt le créneau.
  let checkoutUrl: string | null = null;
  if (booking.status === "pending_payment") {
    try {
      const session = await createDepositCheckout({ bookingId: booking.id, token, serviceName: booking.service_name, depositCents: booking.deposit_cents, email: booking.email });
      const upd = await db().from("bookings").update({ stripe_session_id: session.id, checkout_url: session.url }).eq("id", booking.id).select("*").single();
      if (upd.error) throw upd.error;
      booking = upd.data as BookingRow;
      checkoutUrl = session.url;
    } catch (e) {
      console.error("[booking] création de la page de paiement impossible", e);
      await db().from("bookings").update({ status: "expired", payment_status: "none" }).eq("id", booking.id).eq("status", "pending_payment");
      throw new BookingError("UNAVAILABLE");
    }
  }
  return { booking, token, cfg, checkoutUrl };
}

export async function findByToken(token: string): Promise<BookingRow | null> {
  if (!isTokenShape(token) || !dbConfigured()) return null;
  const { data, error } = await db().from("bookings").select("*").eq("cancel_token", token).maybeSingle();
  if (error) fail(error);
  return (data as BookingRow | null) ?? null;
}

export type CancelResult = { booking: BookingRow; cfg: BookingConfig; refunded: boolean };

/** Annulation par le client. Un rdv dont l'acompte attend d'être payé est simplement abandonné (aucun email). */
export async function cancelByToken(token: string): Promise<CancelResult> {
  const cfg = await getConfig();
  const b = await findByToken(token);
  if (!b) throw new BookingError("NOT_FOUND");

  if (b.status === "pending_payment") {
    const { data, error } = await db()
      .from("bookings")
      .update({ status: "expired", payment_status: "none", cancelled_at: new Date().toISOString() })
      .eq("id", b.id)
      .eq("status", "pending_payment")
      .select("*")
      .maybeSingle();
    if (error) fail(error);
    if (!data) throw new BookingError("NOT_CANCELLABLE"); // le paiement vient d'aboutir : le rdv est confirmé
    if (b.stripe_session_id) await expireCheckout(b.stripe_session_id);
    return { booking: data as BookingRow, cfg, refunded: false };
  }

  const view = toView(b, cfg.cancelMinHours);
  if (b.status !== "confirmed" || new Date(b.starts_at) <= new Date()) throw new BookingError("NOT_CANCELLABLE");
  if (!view.cancellable) throw new BookingError("CANCEL_TOO_LATE");
  // Condition sur le statut : deux annulations simultanées ne notifient qu'une fois.
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled_client", cancelled_at: new Date().toISOString() })
    .eq("id", b.id)
    .eq("status", "confirmed")
    .select("*")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new BookingError("NOT_CANCELLABLE");
  // Annulation dans les délais : l'acompte est rendu.
  const refunded = await refundIfPaid(data as BookingRow);
  return { booking: refunded.booking, cfg, refunded: refunded.ok };
}

/** Rembourse l'acompte d'un rdv payé et le note. Ne lève jamais : le rdv est déjà annulé, le barber peut rembourser à la main. */
export async function refundIfPaid(b: BookingRow): Promise<{ booking: BookingRow; ok: boolean }> {
  if (b.payment_status !== "paid" || !b.stripe_payment_intent) return { booking: b, ok: false };
  try {
    await refundDeposit(b.stripe_payment_intent);
  } catch (e) {
    console.error("[stripe] remboursement impossible", b.id, e);
    return { booking: b, ok: false };
  }
  const { data } = await db().from("bookings").update({ payment_status: "refunded" }).eq("id", b.id).select("*").maybeSingle();
  return { booking: (data as BookingRow | null) ?? { ...b, payment_status: "refunded" }, ok: true };
}
