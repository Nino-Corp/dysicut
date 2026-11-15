import Link from "next/link";
import { formatPhone } from "@/lib/booking/phone";
import { timeLabel } from "@/lib/booking/time";
import type { BookingRow } from "@/lib/booking/repo";

const statusLabel: Record<BookingRow["status"], string | null> = {
  confirmed: null,
  cancelled_client: "Annulé par le client",
  cancelled_barber: "Annulé",
  no_show: "Absent",
};

/** Ligne d'agenda : heure en grand, nom, prestation. Toute la ligne est cliquable (cible >= 44 px). */
export function BookingItem({ b }: { b: BookingRow }) {
  const status = statusLabel[b.status];
  const inactive = b.status !== "confirmed";
  return (
    <Link
      href={`/admin/rdv/${b.id}`}
      className={`flex min-h-[72px] items-center gap-4 rounded-[var(--radius-card)] border border-line px-4 py-3 transition-colors hover:bg-surface-2 ${inactive ? "opacity-55" : ""}`}
    >
      <div className="w-[3.5rem] shrink-0">
        <div className="text-xl font-bold tabular-nums tracking-tight">{timeLabel(new Date(b.starts_at))}</div>
        <div className="text-xs tabular-nums text-fg-muted">{timeLabel(new Date(b.ends_at))}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[17px] font-semibold tracking-tight ${inactive ? "line-through" : ""}`}>{b.first_name}</div>
        <div className="truncate text-sm text-fg-muted">
          {b.service_name} · {formatPhone(b.phone)}
        </div>
      </div>
      {status ? <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs text-fg-muted">{status}</span> : null}
      {b.source === "admin" && !status ? <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs text-fg-muted">Manuel</span> : null}
    </Link>
  );
}
