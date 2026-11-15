"use client";

import { useEffect, useState } from "react";
import { defaultOpeningHours, site, type Weekday } from "@/config/site";
import { formatTime } from "@/lib/hours";

const DAYS: { d: Weekday; label: string }[] = [
  { d: 1, label: "Lundi" },
  { d: 2, label: "Mardi" },
  { d: 3, label: "Mercredi" },
  { d: 4, label: "Jeudi" },
  { d: 5, label: "Vendredi" },
  { d: 6, label: "Samedi" },
  { d: 0, label: "Dimanche" },
];

const WEEKDAY_INDEX: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Liste des horaires ; le jour courant (Europe/Paris) est mis en avant après le montage. */
export function HoursList() {
  const [today, setToday] = useState<Weekday | null>(null);
  useEffect(() => {
    const w = new Intl.DateTimeFormat("en-US", { timeZone: site.timezone, weekday: "short" }).format(new Date());
    setToday(WEEKDAY_INDEX[w] ?? null);
  }, []);

  return (
    <ul className="border-t border-line">
      {DAYS.map(({ d, label }) => {
        const slot = defaultOpeningHours[d];
        const isToday = today === d;
        return (
          <li
            key={d}
            aria-current={isToday ? "date" : undefined}
            className={`flex min-h-12 items-center justify-between border-b border-line py-3 text-[17px] ${isToday ? "font-semibold text-fg" : slot ? "text-fg" : "text-fg-muted"}`}
          >
            <span>{label}</span>
            <span className="tabular-nums">{slot ? `${formatTime(slot.start)} - ${formatTime(slot.end)}` : "Fermé"}</span>
          </li>
        );
      })}
    </ul>
  );
}
