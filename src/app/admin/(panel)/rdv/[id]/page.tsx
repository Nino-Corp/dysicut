import Link from "next/link";
import { LinkPending } from "@/components/admin/LinkPending";
import { notFound } from "next/navigation";
import { ChatBubbleLeftIcon, ChevronLeftIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/admin/ActionForm";
import { card, input, label } from "@/components/admin/ui";
import { HoverButton } from "@/components/ui/HoverButton";

import { BlockAction, ClientActions } from "@/components/admin/ClientActions";
import { cancelBooking, markNoShow, refundDepositAction, updateDuration } from "@/lib/admin/actions";
import { adminSettings, bookingById, standingFor } from "@/lib/admin/data";
import { activeNoShows, isBlocked } from "@/lib/booking/standing";
import { requireAdmin } from "@/lib/admin/session";
import { formatPhone } from "@/lib/booking/phone";
import { dayLabel, parisDateKey, timeLabel } from "@/lib/booking/time";

export const metadata = { title: "Rendez-vous" };

const STATUS = {
  pending_payment: "Acompte à payer",
  confirmed: "Confirmé",
  cancelled_client: "Annulé par le client",
  cancelled_barber: "Annulé",
  no_show: "Absent",
  expired: "Expiré (acompte non payé)",
} as const;
const PAYMENT = { none: "Aucun", pending: "En attente", paid: "Payé", refunded: "Remboursé", forfeited: "Conservé (absence)" } as const;
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
  const open = confirmed || b.status === "pending_payment";
  const [settings, standing] = await Promise.all([adminSettings(), standingFor(b.phone)]);
  const noShows = activeNoShows(standing);
  const blocked = isBlocked(standing, settings.no_show_block_threshold);
  const canRefund = b.payment_status === "paid" || b.payment_status === "forfeited";
  const started = start <= new Date();
  const phone = b.phone.replace(/\s+/g, "");
  const sms = `sms:${phone}?&body=${encodeURIComponent(`Salut ${b.first_name}, c'est Dysicut. À propos de ton rdv du ${dayLabel(start)} à ${timeLabel(start)} : `)}`;

  return (
    <div className="space-y-8">
      <Link href={`/admin?d=${parisDateKey(start)}`} className="inline-flex h-11 items-center gap-1 text-[15px] text-fg-muted">
        <ChevronLeftIcon className="size-4" aria-hidden /> Agenda
        <LinkPending />
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
        {b.confirmation_requested_at ? <Fact k="Confirmation" v={b.attendance_confirmed_at ? "Venue confirmée" : b.status === "cancelled_client" ? "Sans réponse, libéré" : "Sans réponse"} wide /> : null}
        {b.deposit_cents > 0 ? <Fact k="Acompte" v={`${b.deposit_cents / 100} € - ${PAYMENT[b.payment_status]}`} wide /> : null}
        {b.email ? <Fact k="Email" v={b.email} wide /> : null}
      </dl>

      {noShows > 0 || blocked ? (
        <section aria-labelledby="client" className={`${card} space-y-3`}>
          <h2 id="client" className="text-lg font-semibold tracking-tight">Ce client</h2>
          <p className="text-[16px]">
            {noShows} absence{noShows > 1 ? "s" : ""} depuis le dernier pardon.{" "}
            {blocked ? "Il ne peut plus réserver en ligne." : settings.deposit_mode === "flagged" ? "Il doit verser un acompte pour réserver." : null}
          </p>
          <ClientActions phone={b.phone} blocked={blocked} noShows={noShows} />
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <HoverButton href={`tel:${phone}`} variant="ghost" icon={PhoneIcon}>
          Appeler
        </HoverButton>
        <HoverButton href={sms} variant="ghost" icon={ChatBubbleLeftIcon}>
          Prévenir
        </HoverButton>
      </div>

      {open ? (
        <>
          {confirmed ? (
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
          ) : null}

          <section aria-labelledby="actions" className="space-y-3">
            <h2 id="actions" className="text-lg font-semibold tracking-tight">Actions</h2>
            {confirmed && started ? (
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
                {b.payment_status === "paid" ? " L'acompte lui sera remboursé." : ""}
              </p>
            </ActionForm>
          </section>
        </>
      ) : null}

      {canRefund ? (
        <section aria-labelledby="acompte" className="space-y-3">
          <h2 id="acompte" className="text-lg font-semibold tracking-tight">Acompte</h2>
          <ActionForm action={refundDepositAction} className="space-y-3">
            <input type="hidden" name="id" value={b.id} />
            <ConfirmSubmit confirmLabel={`Rembourser ${b.deposit_cents / 100} €`}>Rembourser l&apos;acompte</ConfirmSubmit>
            {b.payment_status === "forfeited" ? <p className="text-sm text-fg-muted">Conservé après l&apos;absence. Tu peux le rendre en geste commercial.</p> : null}
          </ActionForm>
        </section>
      ) : null}

      {!blocked ? (
        <section aria-labelledby="blocage" className="space-y-3">
          <h2 id="blocage" className="text-lg font-semibold tracking-tight">Blocage</h2>
          <BlockAction phone={b.phone} />
          <p className="text-sm text-fg-muted">Empêche ce numéro de réserver en ligne. Tu peux toujours lui ajouter un rdv à la main.</p>
        </section>
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
