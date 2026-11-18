"use client";

import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { site } from "@/config/site";
import { HoverButton } from "@/components/ui/HoverButton";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingView } from "@/lib/booking/repo";
import { clearStored, writeStored } from "./storage";

type Props = { token: string; booking: BookingView };

/** Lien d'annulation, calendrier et annulation : les trois sorties d'un rdv, sans compte. */
export function ManageActions({ token, booking }: Props) {
  const [view, setView] = useState(booking);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (view.status !== "confirmed") {
    return (
      <div className="space-y-4">
        <p className="text-[17px]">{view.status === "no_show" ? "Ce rendez-vous est clos." : "Ce rendez-vous est annulé. Le créneau est libre."}</p>
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
