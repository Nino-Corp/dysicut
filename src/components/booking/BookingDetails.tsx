import { dayLabel, timeLabel } from "@/lib/booking/time";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Props = { startsAt: string; endsAt?: string; serviceName: string; priceEur: number; depositPaidEur?: number; className?: string };

/** Récap d'un rdv : date en grand, prestation et prix. */
export function BookingDetails({ startsAt, endsAt, serviceName, priceEur, depositPaidEur = 0, className = "" }: Props) {
  const start = new Date(startsAt);
  const minutes = endsAt ? Math.round((new Date(endsAt).getTime() - start.getTime()) / 60000) : null;
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-surface-2 p-6 ${className}`}>
      <p className="text-[clamp(1.5rem,5vw,2rem)] font-semibold leading-tight tracking-[-0.03em]">{cap(dayLabel(start))}</p>
      <p className="mt-1 text-[clamp(1.5rem,5vw,2rem)] font-semibold leading-tight tracking-[-0.03em] text-fg-muted">{timeLabel(start)}</p>
      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-5">
        <span className="text-[17px]">
          {serviceName}
          {minutes ? <span className="block text-sm text-fg-muted">{minutes} min</span> : null}
        </span>
        <span className="text-[17px] font-semibold tabular-nums">{priceEur} €</span>
      </div>
      {depositPaidEur > 0 ? (
        <div className="mt-3 flex items-baseline justify-between gap-4 text-[15px] text-fg-muted">
          <span>Acompte réglé</span>
          <span className="tabular-nums">- {depositPaidEur} €</span>
        </div>
      ) : null}
      {depositPaidEur > 0 ? (
        <div className="mt-1 flex items-baseline justify-between gap-4 text-[17px] font-semibold">
          <span>Reste à payer sur place</span>
          <span className="tabular-nums">{Math.max(priceEur - depositPaidEur, 0)} €</span>
        </div>
      ) : null}
    </div>
  );
}
