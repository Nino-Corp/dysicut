"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { newCancelToken } from "@/lib/booking/token";
import { normalizePhone } from "@/lib/booking/phone";
import { addDays, parisToUtc, timeLabel } from "@/lib/booking/time";
import { refundIfPaid, type BookingRow } from "@/lib/booking/repo";
import { activeNoShows, isBlocked } from "@/lib/booking/standing";
import { expireCheckout, stripeConfigured } from "@/lib/stripe/stripe";
import { calendarFile, clientCancelled, clientConfirmation } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import { endSession, loginThrottled, requireAdmin, startSession, verifyCredentials } from "./session";
import { adminSettings, newIcalToken, standingFor } from "./data";
import type { ActionState } from "./types";

const fail = (error: string): ActionState => ({ error });
const done = (ok: string): ActionState => ({ ok });
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

const conflictMessage = async (start: Date, end: Date, ignoreId?: string): Promise<string> => {
  const q = db().from("bookings").select("id,first_name,starts_at,ends_at").eq("status", "confirmed").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString());
  const { data } = await (ignoreId ? q.neq("id", ignoreId) : q);
  const c = data?.[0];
  return c ? `Chevauche le rdv de ${c.first_name} (${timeLabel(new Date(c.starts_at))} - ${timeLabel(new Date(c.ends_at))}).` : "Chevauche un autre rdv.";
};

// ---------------------------------------------------------------- connexion

export async function login(_: ActionState, f: FormData): Promise<ActionState> {
  if (await loginThrottled()) return fail("Trop d'essais. Réessaie dans 15 minutes.");
  const email = str(f, "email");
  const password = String(f.get("password") ?? "");
  if (!email || !password) return fail("Renseigne l'email et le mot de passe.");
  if (!(await verifyCredentials(email, password))) return fail("Identifiants incorrects.");
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- rdv

export async function cancelBooking(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(f, "id");
  // Condition sur le statut : un double clic ne notifie qu'une fois. Un rdv dont l'acompte attend d'être payé s'annule aussi.
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled_barber", cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["confirmed", "pending_payment"])
    .select("*")
    .maybeSingle();
  if (error) return fail("Annulation impossible.");
  if (!data) return fail("Ce rdv n'est plus actif.");
  let b = data as BookingRow;
  if (b.stripe_session_id && b.payment_status === "pending") await expireCheckout(b.stripe_session_id);

  // Annulation par le barber : l'acompte est toujours rendu.
  const hadDeposit = b.payment_status === "paid";
  let refunded = false;
  if (hadDeposit) {
    const r = await refundIfPaid(b);
    b = r.booking;
    refunded = r.ok;
  }
  revalidatePath("/admin", "layout");
  if (b.email) after(() => sendMail(clientCancelled(b, "barber", refunded)));
  const mail = b.email ? "Un email part au client." : "Prévins le client toi-même (boutons ci-dessus).";
  if (hadDeposit && !refunded) return done(`Rdv annulé, mais le remboursement de l'acompte a échoué : rembourse-le depuis le dashboard Stripe. ${mail}`);
  return done(`Rdv annulé${refunded ? ", acompte remboursé" : ""}. ${mail}`);
}

export async function markNoShow(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "no_show" })
    .eq("id", str(f, "id"))
    .eq("status", "confirmed")
    .lte("starts_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (error) return fail("Action impossible.");
  if (!data) return fail("Seul un rdv déjà commencé peut être marqué absent.");
  const b = data as BookingRow;
  // L'acompte est conservé (le barber peut le rendre depuis la fiche du rdv).
  if (b.payment_status === "paid") await db().from("bookings").update({ payment_status: "forfeited" }).eq("id", b.id);
  revalidatePath("/admin", "layout");

  const [settings, standing] = await Promise.all([adminSettings(), standingFor(b.phone)]);
  const n = activeNoShows(standing);
  const parts = ["Marqué absent."];
  if (b.payment_status === "paid") parts.push("Acompte conservé.");
  if (isBlocked(standing, settings.no_show_block_threshold)) parts.push(`${n} absence${n > 1 ? "s" : ""} : ce numéro ne peut plus réserver en ligne.`);
  else if (settings.deposit_mode === "flagged") parts.push("Ses prochaines réservations demanderont un acompte.");
  return done(parts.join(" "));
}

/** Rend l'acompte conservé après une absence (geste commercial, ou erreur de saisie du barber). */
export async function refundDepositAction(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data } = await db().from("bookings").select("*").eq("id", str(f, "id")).maybeSingle();
  const b = data as BookingRow | null;
  if (!b || (b.payment_status !== "paid" && b.payment_status !== "forfeited")) return fail("Aucun acompte à rendre sur ce rdv.");
  const r = await refundIfPaid({ ...b, payment_status: "paid" });
  if (!r.ok) return fail("Remboursement impossible. Fais-le depuis le dashboard Stripe.");
  revalidatePath("/admin", "layout");
  return done("Acompte remboursé.");
}

export async function updateDuration(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const minutes = Number(f.get("minutes"));
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) return fail("Durée invalide (5 à 480 minutes).");
  const id = str(f, "id");
  const { data: b } = await db().from("bookings").select("starts_at,status").eq("id", id).maybeSingle();
  if (!b || b.status !== "confirmed") return fail("Ce rdv n'est plus actif.");
  const start = new Date(b.starts_at);
  const end = new Date(start.getTime() + minutes * 60_000);
  const { error } = await db().from("bookings").update({ ends_at: end.toISOString() }).eq("id", id).eq("status", "confirmed");
  if (error) {
    // Contrainte anti-chevauchement : jamais d'ecrasement d'un autre rdv.
    if (error.code === "23P01") return fail(`${await conflictMessage(start, end, id)} Raccourcis la durée ou déplace l'autre rdv.`);
    return fail("Modification impossible.");
  }
  revalidatePath("/admin", "layout");
  return done(`Durée : ${minutes} min (fin à ${timeLabel(end)}).`);
}

const manualSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(dateRe),
  time: z.string().regex(timeRe),
  minutes: z.coerce.number().int().min(5).max(480),
  firstName: z.string().trim().min(1, "Indique le prénom").max(60),
  phone: z.string().trim().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Numéro de téléphone invalide" });
    return n ?? "";
  }),
  email: z.string().trim().max(254).optional().transform((v) => (v ? v : null)).pipe(z.email("Email invalide").nullable()),
});

/** Rdv pris hors du site (DM, telephone). Pas de delai minimum ni de regle "un rdv par numero" : c'est le barber qui decide. */
export async function createManualBooking(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = manualSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Informations invalides.");
  const v = p.data;
  const { data: svc } = await db().from("services").select("*").eq("id", v.serviceId).maybeSingle();
  if (!svc) return fail("Prestation introuvable.");
  const start = parisToUtc(v.date, v.time);
  const end = new Date(start.getTime() + v.minutes * 60_000);

  const token = newCancelToken();
  const { data, error } = await db()
    .from("bookings")
    .insert({
      service_id: svc.id,
      service_name: svc.name,
      price_cents: svc.price_cents,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      first_name: v.firstName,
      phone: v.phone,
      email: v.email,
      source: "admin",
      cancel_token: token,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23P01") return fail(`${await conflictMessage(start, end)} Choisis une autre heure.`);
    return fail("Création impossible.");
  }
  const b = data as BookingRow;
  if (b.email) {
    const mail = clientConfirmation(b, token);
    after(() => sendMail({ ...mail, attachments: [{ filename: "rdv-dysicut.ics", content: calendarFile(b, token), contentType: "text/calendar" }] }));
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/rdv/${b.id}`);
}

// ---------------------------------------------------------------- conges

const offSchema = z.object({
  startDate: z.string().regex(dateRe, "Date de début invalide"),
  endDate: z.string().regex(dateRe, "Date de fin invalide"),
  allDay: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().trim().max(120).optional(),
});

export async function addTimeOff(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = offSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Informations invalides.");
  const v = p.data;
  const allDay = v.allDay === "on";
  let start: Date;
  let end: Date;
  if (allDay) {
    start = parisToUtc(v.startDate, "00:00");
    end = parisToUtc(addDays(v.endDate, 1), "00:00"); // fin incluse
  } else {
    if (!timeRe.test(v.startTime ?? "") || !timeRe.test(v.endTime ?? "")) return fail("Renseigne les heures.");
    start = parisToUtc(v.startDate, v.startTime!);
    end = parisToUtc(v.endDate, v.endTime!);
  }
  if (end <= start) return fail("La fin doit être après le début.");
  const { error } = await db().from("time_off").insert({ starts_at: start.toISOString(), ends_at: end.toISOString(), reason: v.reason || null });
  if (error) return fail("Enregistrement impossible.");

  const { count } = await db().from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString());
  revalidatePath("/admin", "layout");
  return done(count ? `Bloqué. Attention : ${count} rdv confirmé(s) tombent dans cette période, annule-les depuis l'agenda.` : "Période bloquée.");
}

export async function deleteTimeOff(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(f.get("id"));
  if (!Number.isInteger(id)) return fail("Identifiant invalide.");
  const { error } = await db().from("time_off").delete().eq("id", id);
  if (error) return fail("Suppression impossible.");
  revalidatePath("/admin", "layout");
  return done("Période supprimée.");
}

// ---------------------------------------------------------------- reglages

const hhmm = (v: string) => (timeRe.test(v) ? v : null);

export async function saveHours(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const rows: { weekday: number; start_time: string; end_time: string }[] = [];
  const closed: number[] = [];
  for (let d = 0; d < 7; d++) {
    if (f.get(`open_${d}`) !== "on") {
      closed.push(d);
      continue;
    }
    const s = hhmm(str(f, `start_${d}`));
    const e = hhmm(str(f, `end_${d}`));
    if (!s || !e) return fail("Heures invalides.");
    if (e <= s) return fail("L'heure de fermeture doit être après l'ouverture.");
    rows.push({ weekday: d, start_time: s, end_time: e });
  }
  if (rows.length) {
    const r = await db().from("opening_hours").upsert(rows);
    if (r.error) return fail("Enregistrement impossible.");
  }
  if (closed.length) {
    const r = await db().from("opening_hours").delete().in("weekday", closed);
    if (r.error) return fail("Enregistrement impossible.");
  }
  revalidatePath("/", "layout");
  return done("Horaires enregistrés.");
}

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Indique un nom").max(60),
  minutes: z.coerce.number().int().min(5, "Durée : 5 min minimum").max(480),
  price: z.coerce.number().min(0, "Prix invalide").max(1000),
});

export async function saveService(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = serviceSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Informations invalides.");
  const r = await db()
    .from("services")
    .update({ name: p.data.name, duration_min: p.data.minutes, price_cents: Math.round(p.data.price * 100), active: f.get("active") === "on" })
    .eq("id", str(f, "id"));
  if (r.error) return fail("Enregistrement impossible.");
  revalidatePath("/", "layout");
  return done("Enregistré. Les rdv déjà pris gardent leur prix et leur durée.");
}

export async function addService(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = serviceSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Informations invalides.");
  const slug = p.data.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "prestation";
  const { data: last } = await db().from("services").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const id = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const r = await db().from("services").insert({ id, name: p.data.name, duration_min: p.data.minutes, price_cents: Math.round(p.data.price * 100), sort: (last?.sort ?? 0) + 1 });
  if (r.error) return fail("Ajout impossible.");
  revalidatePath("/", "layout");
  return done("Prestation ajoutée.");
}

const settingsSchema = z.object({
  step: z.coerce.number().int().min(5).max(240),
  lead: z.coerce.number().int().min(0).max(168),
  advance: z.coerce.number().int().min(1).max(365),
  cancelHours: z.coerce.number().int().min(0).max(168),
});

export async function saveSettings(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = settingsSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail("Valeurs invalides.");
  const r = await db()
    .from("booking_settings")
    .update({
      booking_enabled: f.get("enabled") === "on",
      slot_step_min: p.data.step,
      min_lead_hours: p.data.lead,
      max_advance_days: p.data.advance,
      cancel_min_hours: p.data.cancelHours,
    })
    .eq("id", 1);
  if (r.error) return fail("Enregistrement impossible.");
  revalidatePath("/", "layout");
  return done("Réglages enregistrés.");
}

export async function regenerateIcal(): Promise<ActionState> {
  await requireAdmin();
  const r = await db().from("booking_settings").update({ ical_token: newIcalToken() }).eq("id", 1);
  if (r.error) return fail("Régénération impossible.");
  revalidatePath("/admin/reglages");
  return done("Nouveau lien généré. Réabonne ton calendrier avec le nouveau lien.");
}

// ---------------------------------------------------------------- absences, blocage, acompte

const policySchema = z.object({
  threshold: z.coerce.number().int().min(0).max(20),
  mode: z.enum(["off", "flagged", "all"]),
  depositEur: z.coerce.number().min(0.5, "Acompte : 0,50 € minimum").max(200, "Acompte : 200 € maximum"),
});

export async function savePolicy(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = policySchema.safeParse(Object.fromEntries(f));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Valeurs invalides.");
  if (p.data.mode !== "off" && !stripeConfigured()) return fail("Stripe n'est pas encore branché sur le site (clés manquantes). Garde « Aucun acompte » pour l'instant.");
  const r = await db()
    .from("booking_settings")
    .update({ no_show_block_threshold: p.data.threshold, deposit_mode: p.data.mode, deposit_cents: Math.round(p.data.depositEur * 100) })
    .eq("id", 1);
  if (r.error) return fail("Enregistrement impossible (migration 0003 appliquée ?).");
  revalidatePath("/", "layout");
  return done("Enregistré.");
}

const phoneOf = (f: FormData) => normalizePhone(str(f, "phone"));

/** Bloque un numéro à la main : plus aucune réservation en ligne, jusqu'au déblocage. */
export async function blockPhone(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const phone = phoneOf(f);
  if (!phone) return fail("Numéro invalide.");
  const r = await db().from("phone_blocks").upsert({ phone, blocked: true, note: str(f, "note") || null, updated_at: new Date().toISOString() });
  if (r.error) return fail("Blocage impossible.");
  revalidatePath("/admin", "layout");
  return done("Numéro bloqué pour la réservation en ligne.");
}

/** Pardon : lève le blocage manuel ET remet le compteur d'absences à zéro (les anciennes absences restent dans l'historique). */
export async function unblockPhone(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const phone = phoneOf(f);
  if (!phone) return fail("Numéro invalide.");
  const now = new Date().toISOString();
  const r = await db().from("phone_blocks").upsert({ phone, blocked: false, lifted_at: now, updated_at: now });
  if (r.error) return fail("Déblocage impossible.");
  revalidatePath("/admin", "layout");
  return done("Numéro débloqué, compteur d'absences remis à zéro.");
}
