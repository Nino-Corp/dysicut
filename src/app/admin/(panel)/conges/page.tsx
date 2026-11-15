import { ActionForm, ConfirmSubmit } from "@/components/admin/ActionForm";
import { card } from "@/components/admin/ui";
import { addTimeOff, deleteTimeOff } from "@/lib/admin/actions";
import { upcomingTimeOff } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { dayLabel, parisDateKey, timeLabel } from "@/lib/booking/time";
import { TimeOffForm } from "./TimeOffForm";

export const metadata = { title: "Congés" };

export default async function TimeOffPage() {
  await requireAdmin();
  const list = await upcomingTimeOff();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Congés</h1>
      <p className="text-fg-muted">Les créneaux de la période disparaissent du site tout de suite. Les rdv déjà pris ne sont pas annulés : fais-le depuis l&apos;agenda.</p>

      <TimeOffForm action={addTimeOff} today={parisDateKey(new Date())} />

      <section aria-labelledby="a-venir" className="space-y-3">
        <h2 id="a-venir" className="text-lg font-semibold tracking-tight">En cours et à venir</h2>
        {list.length === 0 ? <p className="text-[15px] text-fg-muted">Aucune période bloquée.</p> : null}
        {list.map((o) => {
          const s = new Date(o.starts_at);
          const e = new Date(o.ends_at);
          const fullDays = timeLabel(s) === "0h" && timeLabel(e) === "0h";
          const lastDay = fullDays ? parisDateKey(new Date(+e - 3_600_000)) : parisDateKey(e);
          const sameDay = parisDateKey(s) === lastDay;
          const when = fullDays
            ? sameDay ? dayLabel(s) : `${dayLabel(s)} au ${dayLabel(new Date(+e - 3_600_000))}`
            : sameDay ? `${dayLabel(s)}, ${timeLabel(s)} - ${timeLabel(e)}` : `${dayLabel(s)} ${timeLabel(s)} au ${dayLabel(e)} ${timeLabel(e)}`;
          return (
            <div key={o.id} className={`${card} space-y-3`}>
              <div>
                <p className="text-[17px] font-semibold tracking-tight">{when}</p>
                {o.reason ? <p className="text-sm text-fg-muted">{o.reason}</p> : null}
              </div>
              <ActionForm action={deleteTimeOff} className="space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <ConfirmSubmit confirmLabel="Confirmer la suppression">Supprimer</ConfirmSubmit>
              </ActionForm>
            </div>
          );
        })}
      </section>
    </div>
  );
}
