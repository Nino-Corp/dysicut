"use client";

import { useEffect, useState } from "react";
import { getOpenStatus, type OpenStatus as Status } from "@/lib/hours";

/** Calculé après le montage : évite tout écart d'hydratation (heure serveur vs client). */
export function OpenStatus({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const update = () => setStatus(getOpenStatus());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const label = !status
    ? " "
    : status.open
      ? `Ouvert · Jusqu'à ${status.closesAt}`
      : status.next
        ? `Fermé · Rouvre ${status.next.dayLabel} ${status.next.time}`
        : "Fermé";

  return (
    <span className={`inline-flex items-center gap-2 text-[13px] text-fg-muted ${className}`} role="status">
      <i
        aria-hidden
        className={`size-[7px] rounded-full ${status?.open ? "bg-fg" : "border border-fg-muted"} ${status ? "" : "opacity-0"}`}
      />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
