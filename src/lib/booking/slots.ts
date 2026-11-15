import { addDays, parisDateKey, parisToUtc, toMin, fromMin, weekdayOf } from "./time.ts";

export type HoursByDay = Partial<Record<number, { start: string; end: string }>>;
export type Interval = { start: Date; end: Date };

export type SlotRules = {
  hours: HoursByDay;
  stepMin: number;
  durationMin: number;
  minLeadHours: number;
  maxAdvanceDays: number;
  /** Rdv confirmés + congés : tout ce qui bloque. */
  busy: Interval[];
};

/** Créneaux libres (instants UTC) d'un jour calendaire parisien. Aligné sur le pas depuis l'ouverture. */
export function slotsForDay(dateKey: string, rules: SlotRules, now: Date = new Date()): Date[] {
  const h = rules.hours[weekdayOf(dateKey)];
  if (!h) return [];
  const open = toMin(h.start);
  const close = toMin(h.end);
  const earliest = now.getTime() + rules.minLeadHours * 3_600_000;
  const latest = now.getTime() + rules.maxAdvanceDays * 86_400_000;

  const out: Date[] = [];
  for (let m = open; m + rules.durationMin <= close; m += rules.stepMin) {
    const start = parisToUtc(dateKey, fromMin(m));
    const end = new Date(start.getTime() + rules.durationMin * 60_000);
    if (start.getTime() < earliest || start.getTime() > latest) continue;
    if (rules.busy.some((b) => b.start < end && b.end > start)) continue;
    out.push(start);
  }
  return out;
}

/** Jours à proposer (aujourd'hui compris) avec leurs créneaux ; jours vides conservés pour l'affichage. */
export function availability(rules: SlotRules, now: Date = new Date()): { date: string; slots: Date[] }[] {
  const first = parisDateKey(now);
  const days: { date: string; slots: Date[] }[] = [];
  for (let i = 0; i <= rules.maxAdvanceDays; i++) {
    const date = addDays(first, i);
    days.push({ date, slots: slotsForDay(date, rules, now) });
  }
  return days;
}
