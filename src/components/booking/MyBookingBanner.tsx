"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import { clearStored, readStored, type StoredBooking } from "./storage";

/**
 * Bandeau « Mon rendez-vous » : retrouve le rdv mémorisé dans ce navigateur, le vérifie auprès du serveur
 * (annulé ou passé = oublié), et mène à la page d'annulation / calendrier.
 */
export function MyBookingBanner() {
  const [b, setB] = useState<StoredBooking | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    if (new Date(stored.startsAt) < new Date()) return clearStored();
    let alive = true;
    fetch(`/api/booking/${stored.token}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) return clearStored();
        const j = (await r.json()) as { booking?: { status: string } };
        if (j.booking?.status !== "confirmed") return clearStored();
        if (alive) setB(stored);
      })
      .catch(() => {
        /* hors ligne : on n'affiche rien plutôt qu'une info possiblement fausse */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!b) return null;
  const s = new Date(b.startsAt);
  return (
    <div className="absolute inset-x-0 top-[4.5rem] z-10 flex justify-center px-5 nav:top-[5.5rem]">
      <Link
        href={`/rdv/${b.token}`}
        className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-line-strong bg-surface-2 px-5 py-2 text-[14px] transition-colors duration-[var(--dur)] hover:border-fg"
      >
        <CalendarDaysIcon className="size-5 shrink-0" aria-hidden />
        <span>
          Mon rdv : {dayLabel(s)}, {timeLabel(s)}
        </span>
      </Link>
    </div>
  );
}
