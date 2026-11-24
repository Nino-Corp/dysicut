import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/supabase";
import type { BookingRow } from "@/lib/booking/repo";
import { activeNoShows, isBlocked, type DepositMode, type Standing } from "@/lib/booking/standing";

export type TimeOffRow = { id: number; starts_at: string; ends_at: string; reason: string | null };

export type AdminService = { id: string; name: string; duration_min: number; price_cents: number; active: boolean; sort: number };
export type AdminSettings = {
  booking_enabled: boolean;
  slot_step_min: number;
  min_lead_hours: number;
  max_advance_days: number;
  cancel_min_hours: number;
  no_show_block_threshold: number;
  deposit_mode: DepositMode;
  deposit_cents: number;
  ical_token: string | null;
};

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function bookingsBetween(from: Date, to: Date): Promise<BookingRow[]> {
  const r = await db().from("bookings").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).neq("status", "expired").order("starts_at");
  return check(r) ?? [];
}

export async function bookingById(id: string): Promise<BookingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await db().from("bookings").select("*").eq("id", id).maybeSingle();
  return (check(r) as BookingRow | null) ?? null;
}

export async function timeOffBetween(from: Date, to: Date): Promise<TimeOffRow[]> {
  const r = await db().from("time_off").select("*").lt("starts_at", to.toISOString()).gt("ends_at", from.toISOString()).order("starts_at");
  return check(r) ?? [];
}

/** Conges en cours ou a venir. */
export async function upcomingTimeOff(): Promise<TimeOffRow[]> {
  const r = await db().from("time_off").select("*").gt("ends_at", new Date().toISOString()).order("starts_at");
  return check(r) ?? [];
}

export async function allServices(): Promise<AdminService[]> {
  return check(await db().from("services").select("*").order("sort")) ?? [];
}

export async function openingHoursRows(): Promise<{ weekday: number; start_time: string; end_time: string }[]> {
  return check(await db().from("opening_hours").select("weekday,start_time,end_time")) ?? [];
}

export const newIcalToken = () => randomBytes(32).toString("hex");

/** Reglages complets ; cree le jeton iCal au premier acces. */
export async function adminSettings(): Promise<AdminSettings> {
  const s = check(await db().from("booking_settings").select("*").eq("id", 1).maybeSingle()) as AdminSettings | null;
  if (!s) throw new Error("Migration 0001 non appliquee (booking_settings vide)");
  if (!s.ical_token) {
    const token = newIcalToken();
    const r = await db().from("booking_settings").update({ ical_token: token }).eq("id", 1).is("ical_token", null);
    if (r.error) throw new Error(`${r.error.message} (migration 0002 appliquee ?)`);
    return { ...s, ical_token: token };
  }
  return s;
}

// ---------------------------------------------------------------- absences et blocages

type BlockRow = { phone: string; blocked: boolean; lifted_at: string | null; note: string | null };
type NoShowRow = { phone: string; first_name: string; starts_at: string };

const standingOf = (block: BlockRow | undefined, noShows: NoShowRow[]): Standing => ({
  blocked: block?.blocked ?? false,
  liftedAt: block?.lifted_at ? new Date(block.lifted_at) : null,
  noShowDates: noShows.map((n) => new Date(n.starts_at)),
});

/** Situation d'un numéro. Tolérant : si la migration 0003 manque, le client est considéré sans historique. */
export async function standingFor(phone: string): Promise<Standing> {
  const [block, noShows] = await Promise.all([
    db().from("phone_blocks").select("*").eq("phone", phone).maybeSingle(),
    db().from("bookings").select("phone,first_name,starts_at").eq("phone", phone).eq("status", "no_show"),
  ]);
  return standingOf((block.data as BlockRow | null) ?? undefined, (noShows.data as NoShowRow[] | null) ?? []);
}

export type ClientSummary = {
  phone: string;
  name: string;
  /** Absences qui comptent encore (depuis le dernier pardon). */
  noShows: number;
  totalNoShows: number;
  manualBlock: boolean;
  blocked: boolean;
  lastNoShow: string | null;
  note: string | null;
};

/** Clients à surveiller : au moins une absence, ou un blocage/pardon manuel. Les plus problématiques d'abord. */
export async function clientSummaries(threshold: number): Promise<ClientSummary[]> {
  const [noShows, blocks] = await Promise.all([
    db().from("bookings").select("phone,first_name,starts_at").eq("status", "no_show").order("starts_at", { ascending: false }),
    db().from("phone_blocks").select("*"),
  ]);
  const byPhone = new Map<string, NoShowRow[]>();
  for (const n of (noShows.data as NoShowRow[] | null) ?? []) byPhone.set(n.phone, [...(byPhone.get(n.phone) ?? []), n]);
  const blockOf = new Map(((blocks.data as BlockRow[] | null) ?? []).map((b) => [b.phone, b]));

  const out: ClientSummary[] = [];
  for (const phone of new Set([...byPhone.keys(), ...[...blockOf.values()].filter((b) => b.blocked).map((b) => b.phone)])) {
    const list = byPhone.get(phone) ?? [];
    const st = standingOf(blockOf.get(phone), list);
    out.push({
      phone,
      name: list[0]?.first_name ?? "Client",
      noShows: activeNoShows(st),
      totalNoShows: list.length,
      manualBlock: st.blocked,
      blocked: isBlocked(st, threshold),
      lastNoShow: list[0]?.starts_at ?? null,
      note: blockOf.get(phone)?.note ?? null,
    });
  }
  return out.sort((a, b) => Number(b.blocked) - Number(a.blocked) || b.noShows - a.noShows);
}
