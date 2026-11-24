"use client";

import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { site } from "@/config/site";
import { HoverButton } from "@/components/ui/HoverButton";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingView } from "@/lib/booking/repo";
import { clearStored, writeStored } from "./storage";

type Props = { token: string; booking: BookingView; justPaid?: boolean };

/** Lien d'annulation, calendrier et annulation : les trois sorties d'un rdv, sans compte. */
export function ManageActions({ token, booking, justPaid = false }: Props) {
  const [view, setView] = useState(booking);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingAttendance, setConfirmingAttendance] = useState(false);

  // Retour de Stripe : le webhook peut arriver quelques secondes après le client. On vérifie jusqu'à 90 s.
  useEffect(() => {
    if (view.status !== "pending_payment" || !justPaid) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const r = await fetch(`/api/booking/${token}`, { cache: "no-store" });
        const j = (await r.json()) as { booking?: BookingView };
        if (j.booking && j.booking.status !== "pending_payment") setView(j.booking);
      } catch {
        /* réessaie au prochain tour */
      }
      if (tries >= 30) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [token, justPaid, view.status]);

  // Mémorise (ou oublie) le rdv dans ce navigateur : bandeau « Mon rendez-vous » sur le site.
  useEffect(() => {
    if (view.status === "confirmed" && new Date(view.endsAt) > new Date()) {
      writeStored({ token, startsAt: view.startsAt, serviceName: view.serviceName });
    } else {
      clearStored();
    }
  }, [token, view]);

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/rdv/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible. Sélectionne le lien et copie-le à la main.");
    }
  };

  const confirmAttendance = async () => {
    setConfirmingAttendance(true);
    setError(null);
    try {
      const r = await fetch(`/api/booking/${token}/confirm`, { method: "POST" });
      const j = (await r.json()) as { booking?: BookingView; message?: string };
      if (!r.ok || !j.booking) throw new Error(j.message ?? "Confirmation impossible.");
      setView(j.booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation impossible.");
    } finally {
      setConfirmingAttendance(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/booking/${token}/cancel`, { method: "POST" });
      const j = (await r.json()) as { booking?: BookingView; message?: string };
      if (!r.ok || !j.booking) throw new Error(j.message ?? "Annulation impossible.");
      setView(j.booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Annulation impossible.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (view.status === "pending_payment") {
    return (
      <div className="space-y-4">
        <p className="text-[17px]" role="status">
          {justPaid
            ? "Paiement reçu, validation en cours. Cette page se met à jour toute seule."
            : `Ton créneau est réservé pour quelques minutes. Règle l'acompte de ${view.depositEur} € pour le confirmer.`}
        </p>
        {view.checkoutUrl ? (
          <HoverButton href={view.checkoutUrl} size="lg" className="w-full">
            {justPaid ? "Revenir au paiement" : `Payer l'acompte de ${view.depositEur} €`}
          </HoverButton>
        ) : null}
        {confirming ? (
          <div className="grid grid-cols-2 gap-3">
            <HoverButton variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Garder
            </HoverButton>
            <HoverButton disabled={busy} onClick={cancel}>
              {busy ? "..." : "Oui, abandonner"}
            </HoverButton>
          </div>
        ) : (
          <HoverButton variant="ghost" onClick={() => setConfirming(true)} className="w-full">
            Abandonner la réservation
          </HoverButton>
        )}
        {error ? (
          <p role="alert" className="text-[15px] text-fg">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (view.status !== "confirmed") {
    return (
      <div className="space-y-4">
        <p className="text-[17px]">
          {view.status === "no_show"
            ? "Ce rendez-vous est clos."
            : view.status === "expired"
              ? "Ce rendez-vous n'a pas été confirmé (acompte non réglé). Le créneau est libre."
              : "Ce rendez-vous est annulé. Le créneau est libre."}
        </p>
        {view.paymentStatus === "refunded" ? <p className="text-[15px] text-fg-muted">Ton acompte de {view.depositEur} € est remboursé (quelques jours selon ta banque).</p> : null}
        <HoverButton href="/reserver" variant="ghost" className="w-full">
          Reprendre RDV
        </HoverButton>
      </div>
    );
  }

  const start = new Date(view.startsAt);
  const deadline = new Date(view.cancelDeadline);

  return (
    <div className="space-y-3">
      {view.attendanceRequested && !view.attendanceConfirmed ? (
        <div className="rounded-[var(--radius-card)] border border-line-strong p-5">
          <p className="text-[17px]">Tu viens toujours ? Confirme ta venue, sinon le créneau est libéré le matin du rdv.</p>
          <HoverButton size="lg" disabled={confirmingAttendance} onClick={confirmAttendance} className="mt-4 w-full">
            {confirmingAttendance ? "..." : "Je confirme ma venue"}
          </HoverButton>
        </div>
      ) : null}
      {view.attendanceConfirmed ? <p className="text-[17px]" role="status">Venue confirmée, à tout à l&apos;heure.</p> : null}

      <div>
        <label htmlFor="manage-link" className="mb-2 block text-sm text-fg-muted">
          Ton lien d&apos;annulation. Garde-le : c&apos;est le seul moyen d&apos;annuler en ligne.
        </label>
        <div className="flex gap-2">
          <input
            id="manage-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-line-strong bg-surface-2 px-4 text-[15px] text-fg-muted"
          />
          <HoverButton onClick={copy} icon={copied ? CheckIcon : ClipboardDocumentIcon}>
            {copied ? "Copié" : "Copier"}
          </HoverButton>
        </div>
      </div>

      <HoverButton href={`/api/booking/${token}/ics`} variant="ghost" icon={ArrowDownTrayIcon} className="w-full">
        Ajouter à mon calendrier
      </HoverButton>

      <p className="text-[15px] text-fg-muted">
        Un empêchement ? Annule en un tap, ça libère la place pour quelqu&apos;un d&apos;autre.
        {view.paymentStatus === "paid" ? ` Annulé à temps, ton acompte de ${view.depositEur} € est remboursé.` : ""}
      </p>

      {view.cancellable ? (
        confirming ? (
          <div className="rounded-[var(--radius-card)] border border-line-strong p-5">
            <p className="text-[17px]">
              Annuler le rdv du {dayLabel(start)} à {timeLabel(start)} ?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HoverButton variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                Garder
              </HoverButton>
              <HoverButton disabled={busy} onClick={cancel}>
                {busy ? "Annulation..." : "Oui, annuler"}
              </HoverButton>
            </div>
          </div>
        ) : (
          <HoverButton variant="ghost" onClick={() => setConfirming(true)} className="w-full">
            Annuler mon rdv
          </HoverButton>
        )
      ) : (
        <p className="text-[15px] text-fg-muted">
          Il est trop tard pour annuler en ligne (jusqu&apos;à {timeLabel(deadline)}, {dayLabel(deadline)}).{" "}
          <a href={site.social.instagramDm} target="_blank" rel="noopener noreferrer" className="text-fg underline underline-offset-4">
            Contacte directement le barber.
          </a>
        </p>
      )}

      {error ? (
        <p role="alert" className="text-[15px] text-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
