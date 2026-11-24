// Tests des modules purs de réservation : node scripts/test-booking.ts
import assert from "node:assert/strict";
import { parisToUtc, parisParts, addDays, timeLabel } from "../src/lib/booking/time.ts";
import { slotsForDay, availability } from "../src/lib/booking/slots.ts";
import { normalizePhone, formatPhone } from "../src/lib/booking/phone.ts";
import { buildIcs } from "../src/lib/booking/ics.ts";
import { shouldRelease } from "../src/lib/booking/attendance.ts";
import { activeNoShows, depositCentsFor, isBlocked } from "../src/lib/booking/standing.ts";

// --- fuseau : hiver (UTC+1) et été (UTC+2), changements d'heure
assert.equal(parisToUtc("2026-11-16", "11:00").toISOString(), "2026-11-16T10:00:00.000Z");
assert.equal(parisToUtc("2026-07-15", "11:00").toISOString(), "2026-07-15T09:00:00.000Z");
assert.equal(parisToUtc("2026-03-29", "11:00").toISOString(), "2026-03-29T09:00:00.000Z"); // jour du passage à l'heure d'été
assert.equal(parisToUtc("2026-10-25", "11:00").toISOString(), "2026-10-25T10:00:00.000Z"); // retour à l'heure d'hiver
assert.equal(parisParts(new Date("2026-11-15T23:30:00Z")).day, 16); // minuit passé à Paris
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(timeLabel(parisToUtc("2026-11-16", "19:40")), "19h40");

// --- créneaux : lun-jeu 11h-20h, pas 40 min
const hours = { 1: { start: "11:00", end: "20:00" }, 2: { start: "11:00", end: "20:00" }, 3: { start: "11:00", end: "20:00" }, 4: { start: "11:00", end: "20:00" } };
const rules = { hours, stepMin: 40, durationMin: 40, minLeadHours: 2, maxAdvanceDays: 30, busy: [] };
const now = new Date("2026-11-15T08:00:00Z"); // dimanche 9h Paris
const mon = slotsForDay("2026-11-16", rules, now);
assert.equal(mon.length, 13);
assert.equal(timeLabel(mon[0]!), "11h");
assert.equal(timeLabel(mon[12]!), "19h"); // 19h-19h40, le suivant dépasserait 20h
assert.equal(slotsForDay("2026-11-15", rules, now).length, 0); // dimanche fermé
assert.equal(slotsForDay("2026-11-20", rules, now).length, 0); // vendredi fermé

// rdv existant : le créneau et lui seul disparaît
const busy = [{ start: mon[2]!, end: new Date(mon[2]!.getTime() + 40 * 60000) }];
const withBusy = slotsForDay("2026-11-16", { ...rules, busy }, now);
assert.equal(withBusy.length, 12);
assert.ok(!withBusy.some((d) => d.getTime() === mon[2]!.getTime()));
// congé couvrant la journée
assert.equal(slotsForDay("2026-11-16", { ...rules, busy: [{ start: mon[0]!, end: new Date(mon[12]!.getTime() + 1) }] }, now).length, 0);
// délai minimum : lundi 11h, "maintenant" = lundi 9h30 Paris -> 11h exclu (moins de 2 h)
const lundi930 = new Date("2026-11-16T08:30:00Z");
assert.equal(timeLabel(slotsForDay("2026-11-16", rules, lundi930)[0]!), "11h40");
// horizon : au-delà de 30 jours rien
assert.equal(slotsForDay("2027-01-04", rules, now).length, 0);
// durée plus longue que le pas : un rdv de 60 min bloque aussi le créneau suivant
const long = slotsForDay("2026-11-16", { ...rules, durationMin: 60, busy: [{ start: mon[2]!, end: new Date(mon[2]!.getTime() + 40 * 60000) }] }, now);
assert.ok(!long.some((d) => d.getTime() === mon[1]!.getTime())); // 11h40-12h40 chevauche 12h20
assert.equal(availability(rules, now).length, 31);

// --- téléphone
assert.equal(normalizePhone("06 12 34 56 78"), "+33612345678");
assert.equal(normalizePhone("0612345678"), "+33612345678");
assert.equal(normalizePhone("+33 6 12 34 56 78"), "+33612345678");
assert.equal(normalizePhone("+330612345678"), "+33612345678");
assert.equal(normalizePhone("0033612345678"), "+33612345678");
assert.equal(normalizePhone("06.12.34.56.78"), "+33612345678");
assert.equal(normalizePhone("+212612345678"), "+212612345678");
assert.equal(normalizePhone("612345678"), null);
assert.equal(normalizePhone("0612"), null);
assert.equal(normalizePhone("abc"), null);
assert.equal(normalizePhone("0033"), null);
assert.equal(formatPhone("+33612345678"), "06 12 34 56 78");

// --- ics
const ics = buildIcs([{ uid: "a@dysicut", start: mon[0]!, end: new Date(mon[0]!.getTime() + 2400000), summary: "Coupe, Dysicut", description: "x".repeat(200), alarmMin: 120 }]);
assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
assert.match(ics, /DTSTART:20261116T100000Z/);
assert.match(ics, /SUMMARY:Coupe\\, Dysicut/);
for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, "ligne trop longue");

console.log("booking: ok");

// --- absences, blocage, acompte
const d = (iso: string) => new Date(iso);
const none = { blocked: false, liftedAt: null, noShowDates: [] };
assert.equal(isBlocked(none, 2), false);
assert.equal(isBlocked({ ...none, noShowDates: [d("2026-10-01")] }, 2), false); // 1 absence : pas encore
assert.equal(isBlocked({ ...none, noShowDates: [d("2026-10-01"), d("2026-10-20")] }, 2), true); // seuil atteint
assert.equal(isBlocked({ ...none, noShowDates: [d("2026-10-01"), d("2026-10-20")] }, 0), false); // seuil 0 = jamais
assert.equal(isBlocked({ ...none, blocked: true }, 0), true); // blocage manuel toujours actif
// pardon : seules les absences posterieures comptent
const pardoned = { blocked: false, liftedAt: d("2026-11-01"), noShowDates: [d("2026-10-01"), d("2026-10-20"), d("2026-11-10")] };
assert.equal(activeNoShows(pardoned), 1);
assert.equal(isBlocked(pardoned, 2), false);
assert.equal(isBlocked({ ...pardoned, noShowDates: [...pardoned.noShowDates, d("2026-11-15")] }, 2), true);

const base = { mode: "all" as const, depositCents: 500, priceCents: 2000, activeNoShows: 0, stripeReady: true };
assert.equal(depositCentsFor(base), 500);
assert.equal(depositCentsFor({ ...base, mode: "off" }), 0);
assert.equal(depositCentsFor({ ...base, stripeReady: false }), 0); // sans Stripe : jamais d'acompte
assert.equal(depositCentsFor({ ...base, mode: "flagged" }), 0); // client sans absence
assert.equal(depositCentsFor({ ...base, mode: "flagged", activeNoShows: 1 }), 500);
assert.equal(depositCentsFor({ ...base, priceCents: 300 }), 300); // jamais plus que le prix
assert.equal(depositCentsFor({ ...base, priceCents: 30 }), 0); // sous le minimum Stripe (0,50 EUR)

// --- confirmation de presence : liberation des creneaux non confirmes
const rel = { status: "confirmed", source: "web", payment_status: "none", confirmation_requested_at: "2026-11-15T16:00:00Z", attendance_confirmed_at: null, starts_at: "2026-11-16T10:00:00Z" };
const at = (iso: string) => new Date(iso);
assert.equal(shouldRelease(rel, at("2026-11-16T06:30:00Z")), true); // sans reponse, 3 h30 avant : libere
assert.equal(shouldRelease({ ...rel, attendance_confirmed_at: "2026-11-15T20:00:00Z" }, at("2026-11-16T06:30:00Z")), false); // confirme
assert.equal(shouldRelease({ ...rel, confirmation_requested_at: null }, at("2026-11-16T06:30:00Z")), false); // demande jamais envoyee (sans email)
assert.equal(shouldRelease({ ...rel, source: "admin" }, at("2026-11-16T06:30:00Z")), false); // rdv ajoute a la main
assert.equal(shouldRelease({ ...rel, payment_status: "paid" }, at("2026-11-16T06:30:00Z")), false); // acompte paye
assert.equal(shouldRelease(rel, at("2026-11-16T08:30:00Z")), false); // moins de 2 h avant : trop tard pour reprendre un creneau
assert.equal(shouldRelease({ ...rel, status: "cancelled_client" }, at("2026-11-16T06:30:00Z")), false);
