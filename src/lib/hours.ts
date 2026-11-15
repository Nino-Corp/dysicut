import { defaultOpeningHours, site, type Weekday } from "@/config/site";

export type OpeningHours = Partial<Record<Weekday, { start: string; end: string }>>;

export type OpenStatus =
  | { open: true; closesAt: string }
  | { open: false; next: { dayLabel: string; time: string } | null };

const DAY_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const WEEKDAY_INDEX: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "11:00" -> "11h", "11:30" -> "11h30" */
export const formatTime = (hhmm: string) => {
  const [h = "0", m = "00"] = hhmm.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

function parisNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: site.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: WEEKDAY_INDEX[get("weekday")] ?? 0, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function getOpenStatus(now: Date = new Date(), hours: OpeningHours = defaultOpeningHours): OpenStatus {
  const { day, minutes } = parisNow(now);
  const today = hours[day];
  if (today && minutes >= toMin(today.start) && minutes < toMin(today.end)) {
    return { open: true, closesAt: formatTime(today.end) };
  }
  for (let i = 0; i < 7; i++) {
    const d = ((day + i) % 7) as Weekday;
    const slot = hours[d];
    if (!slot) continue;
    if (i === 0 && minutes >= toMin(slot.start)) continue; // déjà passé aujourd'hui
    return { open: false, next: { dayLabel: i === 0 ? "auj." : i === 1 ? "demain" : (DAY_SHORT[d] ?? ""), time: formatTime(slot.start) } };
  }
  return { open: false, next: null };
}
