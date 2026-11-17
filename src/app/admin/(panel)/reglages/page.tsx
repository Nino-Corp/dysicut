import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { card, h2, input, label } from "@/components/admin/ui";
import { addService, regenerateIcal, saveHours, saveService, saveSettings } from "@/lib/admin/actions";
import { adminSettings, allServices, openingHoursRows } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { site } from "@/config/site";
import { HoverButton } from "@/components/ui/HoverButton";
import { CopyField } from "./CopyField";

export const metadata = { title: "Réglages" };

// Lundi en premier ; la valeur est le numero de jour Postgres/JS (0 = dimanche).
const DAYS: [number, string][] = [[1, "Lundi"], [2, "Mardi"], [3, "Mercredi"], [4, "Jeudi"], [5, "Vendredi"], [6, "Samedi"], [0, "Dimanche"]];
const check = "size-5 accent-[var(--fg)]";

export default async function Settings() {
  await requireAdmin();
  const [s, services, hoursRows] = await Promise.all([adminSettings(), allServices(), openingHoursRows()]);
  const hours = new Map(hoursRows.map((h) => [h.weekday, { start: String(h.start_time).slice(0, 5), end: String(h.end_time).slice(0, 5) }]));
  const feed = `${site.url}/api/calendar/${s.ical_token}/dysicut.ics`;

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Réglages</h1>

      <section aria-labelledby="resa" className="space-y-4">
        <h2 id="resa" className={h2}>Réservation en ligne</h2>
        <ActionForm action={saveSettings}>
          <label className="flex min-h-11 items-center gap-3 text-[16px]">
            <input type="checkbox" name="enabled" defaultChecked={s.booking_enabled} className={check} />
            Réservation ouverte sur le site
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Num id="step" name="step" text="Pas des créneaux (min)" value={s.slot_step_min} min={5} />
            <Num id="lead" name="lead" text="Délai minimum (h)" value={s.min_lead_hours} min={0} />
            <Num id="advance" name="advance" text="Horizon max (jours)" value={s.max_advance_days} min={1} />
            <Num id="cancelHours" name="cancelHours" text="Annulation client jusqu'à (h avant)" value={s.cancel_min_hours} min={0} />
          </div>
          <SubmitButton>Enregistrer</SubmitButton>
        </ActionForm>
      </section>

      <section aria-labelledby="horaires" className="space-y-4">
        <h2 id="horaires" className={h2}>Horaires d&apos;ouverture</h2>
        <ActionForm action={saveHours}>
          <div className="space-y-3">
            {DAYS.map(([d, name]) => {
              const h = hours.get(d);
              return (
                <div key={d} className={`${card} flex flex-wrap items-center gap-x-4 gap-y-2`}>
                  <label className="flex min-h-11 w-36 items-center gap-3 text-[16px] font-semibold">
                    <input type="checkbox" name={`open_${d}`} defaultChecked={Boolean(h)} className={check} />
                    {name}
                  </label>
                  <div className="flex flex-1 items-center gap-2">
                    <input aria-label={`${name}, ouverture`} type="time" name={`start_${d}`} defaultValue={h?.start ?? "11:00"} className={input} />
                    <span className="text-fg-muted">à</span>
                    <input aria-label={`${name}, fermeture`} type="time" name={`end_${d}`} defaultValue={h?.end ?? "20:00"} className={input} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-fg-muted">Case décochée = fermé. Les rdv déjà pris hors des nouveaux horaires restent en place.</p>
          <SubmitButton>Enregistrer les horaires</SubmitButton>
        </ActionForm>
      </section>

      <section aria-labelledby="prestations" className="space-y-4">
        <h2 id="prestations" className={h2}>Prestations et tarifs</h2>
        {services.map((v) => (
          <ActionForm key={v.id} action={saveService} className={`${card} space-y-3`}>
            <input type="hidden" name="id" value={v.id} />
            <div>
              <label htmlFor={`name-${v.id}`} className={label}>Nom</label>
              <input id={`name-${v.id}`} name="name" defaultValue={v.name} required maxLength={60} className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Num id={`min-${v.id}`} name="minutes" text="Durée (min)" value={v.duration_min} min={5} />
              <Num id={`price-${v.id}`} name="price" text="Prix (€)" value={v.price_cents / 100} min={0} step={0.5} />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-[16px]">
              <input type="checkbox" name="active" defaultChecked={v.active} className={check} />
              Proposée à la réservation
            </label>
            <SubmitButton ghost>Enregistrer</SubmitButton>
          </ActionForm>
        ))}
        <ActionForm action={addService} className={`${card} space-y-3`}>
          <h3 className="text-[17px] font-semibold tracking-tight">Ajouter une prestation</h3>
          <div>
            <label htmlFor="new-name" className={label}>Nom</label>
            <input id="new-name" name="name" required maxLength={60} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Num id="new-min" name="minutes" text="Durée (min)" value={40} min={5} />
            <Num id="new-price" name="price" text="Prix (€)" value={0} min={0} step={0.5} />
          </div>
          <SubmitButton ghost>Ajouter</SubmitButton>
        </ActionForm>
      </section>

      <section aria-labelledby="ical" className="space-y-4">
        <h2 id="ical" className={h2}>Calendrier sur ton téléphone</h2>
        <p className="text-[15px] text-fg-muted">
          Abonne-toi une fois : tes rdv et tes congés apparaissent dans Apple Calendrier ou Google Agenda et se mettent à jour seuls (Apple : quelques minutes ; Google : jusqu&apos;à une journée).
          Ce lien est privé : ne le partage pas.
        </p>
        <CopyField value={feed} />
        <HoverButton href={feed.replace(/^https?:/, "webcal:")} className="w-full">
          S&apos;abonner (iPhone / Mac)
        </HoverButton>
        <ActionForm action={regenerateIcal} className="space-y-2">
          <SubmitButton ghost>Générer un nouveau lien</SubmitButton>
          <p className="text-sm text-fg-muted">L&apos;ancien lien cesse de fonctionner. À utiliser si tu penses qu&apos;il a fuité.</p>
        </ActionForm>
      </section>
    </div>
  );
}

function Num({ id, name, text, value, min, step = 1 }: { id: string; name: string; text: string; value: number; min: number; step?: number }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <input id={id} name={name} type="number" inputMode="decimal" min={min} step={step} defaultValue={value} required className={input} />
    </div>
  );
}
