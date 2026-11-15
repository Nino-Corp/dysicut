"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { site } from "@/config/site";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingView } from "@/lib/booking/repo";
import { clearStored, writeStored } from "./storage";

const btn =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line-strong px-6 text-[15px] font-semibold tracking-tight transition-colors duration-[var(--dur)] hover:bg-surface-2 disabled:opacity-50";

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
        <Link href="/reserver" className={btn}>
          Reprendre rdv
        </Link>
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
          <button type="button" onClick={copy} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-fg px-5 text-[15px] font-semibold text-bg active:scale-[0.98]">
            {copied ? <CheckIcon className="size-5" aria-hidden /> : <ClipboardDocumentIcon className="size-5" aria-hidden />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>

      <a href={`/api/booking/${token}/ics`} className={btn}>
        <ArrowDownTrayIcon className="size-5" aria-hidden />
        Ajouter à mon calendrier
      </a>

      {view.cancellable ? (
        confirming ? (
          <div className="rounded-[var(--radius-card)] border border-line-strong p-5">
            <p className="text-[17px]">
              Annuler le rdv du {dayLabel(start)} à {timeLabel(start)} ?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={btn}>
                Garder
              </button>
              <button type="button" disabled={busy} onClick={cancel} className="inline-flex h-12 items-center justify-center rounded-full bg-fg px-6 text-[15px] font-semibold text-bg disabled:opacity-50">
                {busy ? "Annulation..." : "Oui, annuler"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={btn}>
            Annuler mon rdv
          </button>
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
