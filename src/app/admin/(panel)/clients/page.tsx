import Link from "next/link";
import { ClientActions } from "@/components/admin/ClientActions";
import { card } from "@/components/admin/ui";
import { adminSettings, clientSummaries } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { formatPhone } from "@/lib/booking/phone";
import { dayLabel } from "@/lib/booking/time";

export const metadata = { title: "Clients" };

export default async function Clients() {
  await requireAdmin();
  const settings = await adminSettings();
  const list = await clientSummaries(settings.no_show_block_threshold);
  const rule =
    settings.no_show_block_threshold > 0
      ? `Un numéro est bloqué à ${settings.no_show_block_threshold} absence${settings.no_show_block_threshold > 1 ? "s" : ""}.`
      : "Le blocage automatique est désactivé.";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">Clients</h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          Les numéros avec des absences ou bloqués. {rule}{" "}
          <Link href="/admin/reglages#politique" className="underline underline-offset-4">Modifier les règles</Link>
        </p>
      </header>

      {list.length === 0 ? <p className="text-[16px] text-fg-muted">Aucune absence pour le moment.</p> : null}

      <ul className="space-y-3">
        {list.map((c) => (
          <li key={c.phone} className={`${card} space-y-3`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold tracking-tight">{c.name}</p>
                <p className="text-sm text-fg-muted">{formatPhone(c.phone)}</p>
              </div>
              <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs">{c.blocked ? "Bloqué" : "Surveillé"}</span>
            </div>
            <p className="text-[15px] text-fg-muted">
              {c.noShows} absence{c.noShows > 1 ? "s" : ""} en cours{c.totalNoShows > c.noShows ? ` (${c.totalNoShows} au total)` : ""}
              {c.lastNoShow ? `, dernière le ${dayLabel(new Date(c.lastNoShow))}` : ""}
              {c.manualBlock ? ". Bloqué à la main." : "."}
            </p>
            <ClientActions phone={c.phone} blocked={c.blocked} noShows={c.noShows} />
          </li>
        ))}
      </ul>
    </div>
  );
}
