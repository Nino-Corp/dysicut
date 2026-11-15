// Helpers de fuseau Europe/Paris sans dépendance. Modules purs (imports relatifs avec extension :
// ils sont aussi exécutés par scripts/test-booking.ts via le type-stripping de Node).

export const TZ = "Europe/Paris";

const dtf = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type ParisParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

/** Composants de date/heure d'un instant, lus en heure de Paris. weekday : 0 = dimanche. */
export function parisParts(d: Date): ParisParts {
  const o: Record<string, number> = {};
  for (const p of dtf.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
  const weekday = new Date(Date.UTC(o.year!, o.month! - 1, o.day!)).getUTCDay();
  return { year: o.year!, month: o.month!, day: o.day!, hour: o.hour!, minute: o.minute!, weekday };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-16" (jour calendaire à Paris). */
export function parisDateKey(d: Date): string {
  const p = parisParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Décalage de Paris par rapport à l'UTC, en minutes, à un instant donné. */
function offsetMin(at: Date): number {
  const p = parisParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** Date "2026-11-16" + heure "11:00" lues à Paris -> instant UTC. */
export function parisToUtc(dateKey: string, hhmm: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const [h, min] = hhmm.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, min);
  // Deux passes : suffit autour des changements d'heure.
  let t = guess - offsetMin(new Date(guess)) * 60000;
  t = guess - offsetMin(new Date(t)) * 60000;
  return new Date(t);
}

/** Jour suivant d'une clé "YYYY-MM-DD" (calcul calendaire pur, sans fuseau). */
export function addDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "11:00" -> minutes depuis minuit. Accepte aussi "11:00:00" (colonne time de Postgres). */
export function toMin(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** "11h" / "11h40" */
export function timeLabel(d: Date): string {
  const p = parisParts(d);
  return p.minute === 0 ? `${p.hour}h` : `${p.hour}h${pad(p.minute)}`;
}

/** "lundi 16 novembre" */
export function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
}
