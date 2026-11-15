import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/supabase";
import type { BookingRow } from "@/lib/booking/repo";

export type TimeOffRow = { id: number; starts_at: string; ends_at: string; reason: string | null };

export type AdminService = { id: string; name: string; duration_min: number; price_cents: number; active: boolean; sort: number };
export type AdminSettings = {
  booking_enabled: boolean;
  slot_step_min: number;
  min_lead_hours: number;
  max_advance_days: number;
  cancel_min_hours: number;
  ical_token: string | null;
};

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function bookingsBetween(from: Date, to: Date): Promise<BookingRow[]> {
  const r = await db().from("bookings").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at");
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
