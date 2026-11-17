"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { normalizePhone } from "@/lib/booking/phone";
import { dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingView, PublicService } from "@/lib/booking/repo";
import { HeroPole } from "@/components/ui/HeroPole";
import { HoverButton } from "@/components/ui/HoverButton";
import { BookingDetails } from "./BookingDetails";
import { ManageActions } from "./ManageActions";
import { readStored, writeStored } from "./storage";

type Slot = { start: string; label: string };
type Day = { date: string; slots: Slot[] };
type Avail = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; days: Day[] };
type Done = { token: string; booking: BookingView };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const input = "h-14 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-[16px] placeholder:text-fg-muted";
const stepIn = "animate-[drawer-in_var(--dur)_var(--ease)]";

/** Jour calendaire "2026-11-16" -> libellés, sans dépendre du fuseau du téléphone. */
const dayChip = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...o }).format(d);
  return { weekday: f({ weekday: "short" }), day: f({ day: "numeric" }), month: f({ month: "short" }), long: f({ weekday: "long", day: "numeric", month: "long" }) };
};

export function BookingFlow({ services }: { services: PublicService[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [service, setService] = useState<PublicService | null>(null);
  const [avail, setAvail] = useState<Avail>({ status: "loading" });
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ firstName: "", phone: "", email: "", consent: false, website: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [hasStored, setHasStored] = useState<string | null>(null);

  useEffect(() => setHasStored(readStored()?.token ?? null), []);

  const loadAvail = useCallback(async (s: PublicService) => {
    setAvail({ status: "loading" });
    try {
      const r = await fetch(`/api/booking/availability?service=${encodeURIComponent(s.id)}`, { cache: "no-store" });
      const j = (await r.json()) as { days?: Day[]; message?: string };
      if (!r.ok || !j.days) throw new Error(j.message ?? "Impossible de charger les créneaux.");
      setAvail({ status: "ready", days: j.days });
      setDate((cur) => (cur && j.days!.some((d) => d.date === cur) ? cur : (j.days![0]?.date ?? null)));
    } catch (e) {
      setAvail({ status: "error", message: e instanceof Error ? e.message : "Impossible de charger les créneaux." });
    }
  }, []);

  const pickService = (s: PublicService) => {
    setService(s);
    setSlot(null);
    setError(null);
    setStep(2);
    void loadAvail(s);
  };

  const pickSlot = (s: Slot) => {
    setSlot(s);
    setError(null);
    setStep(3);
  };

  const back = () => {
    setError(null);
    setStep((s) => (s > 1 && s < 4 ? ((s - 1) as 1 | 2) : s));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Indique ton prénom";
    if (!normalizePhone(form.phone)) e.phone = "Numéro invalide (ex. 06 12 34 56 78)";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email invalide";
    if (!form.consent) e.consent = "Accepte l'utilisation de tes données pour continuer";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!service || !slot || submitting || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          start: slot.start,
          firstName: form.firstName,
          phone: form.phone,
          email: form.email,
          consent: form.consent,
          website: form.website,
        }),
      });
      const j = (await r.json()) as { token?: string; booking?: BookingView; error?: string; message?: string };
      if (r.ok && j.token && j.booking) {
        writeStored({ token: j.token, startsAt: j.booking.startsAt, serviceName: j.booking.serviceName });
        setDone({ token: j.token, booking: j.booking });
        setStep(4);
        window.scrollTo({ top: 0 });
        return;
      }
      setError(j.message ?? "La réservation a échoué. Réessaie.");
      if (j.error === "SLOT_TAKEN" || j.error === "TOO_SOON" || j.error === "TOO_FAR") {
        setSlot(null);
        setStep(2);
        void loadAvail(service);
      }
    } catch {
      setError("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // ------------------------------------------------------------------ étape 4
  if (step === 4 && done) {
    return (
      <div className={stepIn}>
        <HeroPole anchor={false} length={84} className="mb-2" />
        <h1 className="mt-6 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">C&apos;est confirmé.</h1>
        <p className="mt-3 text-[17px] text-fg-muted">
          À tout de suite, {form.firstName.trim()}.{form.email.trim() ? " Un email de confirmation arrive, avec un rappel la veille." : ""}
        </p>
        <BookingDetails className="mt-8" startsAt={done.booking.startsAt} endsAt={done.booking.endsAt} serviceName={done.booking.serviceName} priceEur={done.booking.priceEur} />
        <div className="mt-8">
          <ManageActions token={done.token} booking={done.booking} />
        </div>
        <Link href="/" className="mt-8 inline-flex h-12 items-center text-[15px] text-fg-muted underline underline-offset-4">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const days = avail.status === "ready" ? avail.days : [];
  const current = days.find((d) => d.date === date);

  return (
    <div>
      <div className="flex items-center gap-3">
        {step > 1 ? (
          <button type="button" onClick={back} aria-label="Étape précédente" className="-ml-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
            <ChevronLeftIcon className="size-6" aria-hidden />
          </button>
        ) : null}
        <p className="text-sm text-fg-muted">Étape {step} sur 3</p>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <i key={n} className={`h-[3px] flex-1 rounded-full transition-colors duration-[var(--dur)] ${n <= step ? "bg-fg" : "bg-line-strong"}`} />
        ))}
      </div>

      {hasStored && step === 1 ? (
        <Link href={`/rdv/${hasStored}`} className="mt-6 flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line-strong px-5 py-3 text-[15px]">
          <span>Tu as déjà un rdv à venir.</span>
          <span className="font-semibold underline underline-offset-4">Le voir</span>
        </Link>
      ) : null}

      {error ? (
        <p role="alert" className="mt-6 rounded-[var(--radius-card)] border border-line-strong bg-surface-2 px-5 py-4 text-[16px]">
          {error}
          {error.includes("rdv à venir") && hasStored ? (
            <>
              {" "}
              <Link href={`/rdv/${hasStored}`} className="font-semibold underline underline-offset-4">
                Voir mon rdv
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {step === 1 ? (
        <section className={stepIn} aria-labelledby="t-service">
          <h1 id="t-service" className="mt-8 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">
            Ta prestation
          </h1>
          <ul className="mt-8 space-y-3">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickService(s)}
                  className="flex min-h-[72px] w-full items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line-strong bg-surface-2 px-5 py-4 text-left transition-[transform,border-color] duration-[var(--dur)] ease-out-soft hover:border-fg active:scale-[0.99]"
                >
                  <span>
                    <span className="block text-xl font-semibold tracking-tight">{s.name}</span>
                    <span className="block text-sm text-fg-muted">{s.durationMin} min</span>
                  </span>
                  <span className="text-xl font-semibold tabular-nums tracking-tight">{s.priceEur} €</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 2 && service ? (
        <section className={stepIn} aria-labelledby="t-slot">
          <h1 id="t-slot" className="mt-8 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">
            Jour et heure
          </h1>
          <p className="mt-2 text-[17px] text-fg-muted">
            {service.name}, {service.durationMin} min
          </p>

          {avail.status === "loading" ? (
            <p className="mt-10 text-[17px] text-fg-muted" role="status">
              Chargement des créneaux...
            </p>
          ) : null}

          {avail.status === "error" ? (
            <div className="mt-10" role="alert">
              <p className="text-[17px]">{avail.message}</p>
              <HoverButton variant="ghost" onClick={() => void loadAvail(service)} className="mt-4">
                Réessayer
              </HoverButton>
            </div>
          ) : null}

          {avail.status === "ready" && days.length === 0 ? (
            <p className="mt-10 text-[17px]">Aucun créneau disponible pour le moment. Écris-nous en message pour trouver une solution.</p>
          ) : null}

          {avail.status === "ready" && days.length > 0 ? (
            <>
              <div role="radiogroup" aria-label="Jour" className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                {days.map((d) => {
                  const c = dayChip(d.date);
                  const on = d.date === date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={cap(c.long)}
                      onClick={() => setDate(d.date)}
                      className={`flex h-[84px] w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border transition-colors duration-[var(--dur)] ${on ? "border-fg bg-fg text-bg" : "border-line-strong hover:border-fg"}`}
                    >
                      <span className={`text-[13px] ${on ? "" : "text-fg-muted"}`}>{c.weekday}</span>
                      <span className="text-[22px] font-semibold leading-tight tabular-nums">{c.day}</span>
                      <span className={`text-[13px] ${on ? "" : "text-fg-muted"}`}>{c.month}</span>
                    </button>
                  );
                })}
              </div>

              {current ? (
                <div className="mt-8">
                  <h2 className="mb-4 text-[17px] font-semibold tracking-tight">{cap(dayChip(current.date).long)}</h2>
                  <ul className="grid grid-cols-3 gap-3">
                    {current.slots.map((s) => (
                      <li key={s.start}>
                        <button
                          type="button"
                          onClick={() => pickSlot(s)}
                          className="h-14 w-full rounded-full border border-line-strong text-[17px] font-semibold tabular-nums transition-[transform,background-color,color] duration-[var(--dur)] hover:bg-fg hover:text-bg active:scale-[0.97]"
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {step === 3 && service && slot ? (
        <section className={stepIn} aria-labelledby="t-contact">
          <h1 id="t-contact" className="mt-8 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">
            Tes coordonnées
          </h1>
          <p className="mt-2 text-[17px] text-fg-muted">
            {service.name}, {cap(dayLabel(new Date(slot.start)))} à {timeLabel(new Date(slot.start))}
          </p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-[15px] font-medium">
                Prénom
              </label>
              <input id="firstName" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set("firstName")} aria-invalid={!!fieldErrors.firstName} aria-describedby={fieldErrors.firstName ? "e-firstName" : undefined} className={input} />
              {fieldErrors.firstName ? (
                <p id="e-firstName" className="mt-2 text-[15px]">
                  {fieldErrors.firstName}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-[15px] font-medium">
                Téléphone
              </label>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="06 12 34 56 78" value={form.phone} onChange={set("phone")} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "e-phone" : undefined} className={input} />
              {fieldErrors.phone ? (
                <p id="e-phone" className="mt-2 text-[15px]">
                  {fieldErrors.phone}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-[15px] font-medium">
                Email <span className="font-normal text-fg-muted">(facultatif)</span>
              </label>
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!fieldErrors.email} aria-describedby="h-email" className={input} />
              <p id="h-email" className="mt-2 text-sm text-fg-muted">
                {fieldErrors.email ?? "Pour recevoir ta confirmation et un rappel la veille."}
              </p>
            </div>

            {/* Champ piège anti-bot : invisible pour un humain. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Site web</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
                <input type="checkbox" checked={form.consent} onChange={set("consent")} aria-invalid={!!fieldErrors.consent} className="mt-0.5 size-6 shrink-0 accent-fg" />
                <span>
                  J&apos;accepte que mon prénom, mon téléphone et mon email servent à gérer ce rendez-vous.{" "}
                  <Link href="/confidentialite" target="_blank" className="underline underline-offset-4">
                    En savoir plus
                  </Link>
                </span>
              </label>
              {fieldErrors.consent ? <p className="mt-2 text-[15px]">{fieldErrors.consent}</p> : null}
            </div>

            <HoverButton type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Réservation..." : `Confirmer, ${service.priceEur} € sur place`}
            </HoverButton>
          </form>
        </section>
      ) : null}
    </div>
  );
}
