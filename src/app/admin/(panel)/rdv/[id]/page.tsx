import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatBubbleLeftIcon, ChevronLeftIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/admin/ActionForm";
import { btnGhost, card, input, label } from "@/components/admin/ui";
import { cancelBooking, markNoShow, updateDuration } from "@/lib/admin/actions";
import { bookingById } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { formatPhone } from "@/lib/booking/phone";
import { dayLabel, parisDateKey, timeLabel } from "@/lib/booking/time";

export const metadata = { title: "Rendez-vous" };

const STATUS = { confirmed: "Confirmé", cancelled_client: "Annulé par le client", cancelled_barber: "Annulé", no_show: "Absent" } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const b = await bookingById(id);
  if (!b) notFound();

  const start = new Date(b.starts_at);
  const end = new Date(b.ends_at);
  const minutes = Math.round((+end - +start) / 60000);
  const confirmed = b.status === "confirmed";
  const started = start <= new Date();
  const phone = b.phone.replace(/\s+/g, "");
  const sms = `sms:${phone}?&body=${encodeURIComponent(`Salut ${b.first_name}, c'est Dysicut. À propos de ton rdv du ${dayLabel(start)} à ${timeLabel(start)} : `)}`;

  return (
    <div className="space-y-8">
      <Link href={`/admin?d=${parisDateKey(start)}`} className="inline-flex h-11 items-center gap-1 text-[15px] text-fg-muted">
        <ChevronLeftIcon className="size-4" aria-hidden /> Agenda
      </Link>

      <header>
        <p className="text-fg-muted">{cap(dayLabel(start))}</p>
        <h1 className="mt-1 text-[clamp(2.5rem,12vw,4rem)] font-bold leading-none tracking-[-0.05em]">
          {timeLabel(start)} <span className="text-fg-muted">- {timeLabel(end)}</span>
        </h1>
        <p className="mt-3 inline-flex rounded-full border border-line-strong px-3 py-1 text-sm">{STATUS[b.status]}</p>
      </header>

      <dl className={`${card} grid grid-cols-2 gap-x-4 gap-y-4`}>
        <Fact k="Client" v={b.first_name} />
        <Fact k="Prestation" v={b.service_name} />
        <Fact k="Prix" v={`${b.price_cents / 100} €`} />
        <Fact k="Durée" v={`${minutes} min`} />
        <Fact k="Téléphone" v={formatPhone(b.phone)} />
        <Fact k="Origine" v={b.source === "admin" ? "Ajouté à la main" : "Site"} />
        {b.email ? <Fact k="Email" v={b.email} wide /> : null}
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <a href={`tel:${phone}`} className={btnGhost}>
          <PhoneIcon className="size-5" aria-hidden /> Appeler
        </a>
        <a href={sms} className={btnGhost}>
          <ChatBubbleLeftIcon className="size-5" aria-hidden /> Prévenir
        </a>
      </div>

      {confirmed ? (
        <>
          <section aria-labelledby="duree" className="space-y-3">
            <h2 id="duree" className="text-lg font-semibold tracking-tight">Durée de ce rdv</h2>
            <ActionForm action={updateDuration} className="space-y-3">
              <input type="hidden" name="id" value={b.id} />
              <div>
                <label htmlFor="minutes" className={label}>Minutes (le rdv suivant n&apos;est jamais écrasé)</label>
                <input id="minutes" name="minutes" type="number" inputMode="numeric" min={5} max={480} step={5} defaultValue={minutes} className={input} />
              </div>
              <SubmitButton ghost>Modifier la durée</SubmitButton>
            </ActionForm>
          </section>

          <section aria-labelledby="actions" className="space-y-3">
            <h2 id="actions" className="text-lg font-semibold tracking-tight">Actions</h2>
            {started ? (
              <ActionForm action={markNoShow} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <ConfirmSubmit confirmLabel="Confirmer : absent">Marquer absent</ConfirmSubmit>
              </ActionForm>
            ) : null}
            <ActionForm action={cancelBooking} className="space-y-3">
              <input type="hidden" name="id" value={b.id} />
              <ConfirmSubmit confirmLabel="Confirmer l'annulation">Annuler ce rdv</ConfirmSubmit>
              <p className="text-sm text-fg-muted">
                {b.email ? "Le client recevra un email d'annulation." : "Pas d'email : utilise Appeler ou Prévenir pour l'informer."}
              </p>
            </ActionForm>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Fact({ k, v, wide = false }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-sm text-fg-muted">{k}</dt>
      <dd className="mt-0.5 break-words text-[17px] font-semibold tracking-tight">{v}</dd>
    </div>
  );
}
