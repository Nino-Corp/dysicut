import { LinkPending } from "@/components/admin/LinkPending";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { BookingItem } from "@/components/admin/BookingItem";
import { bookingsBetween, timeOffBetween } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { addDays, dayLabel, parisDateKey, parisToUtc, timeLabel, weekdayOf } from "@/lib/booking/time";

export const metadata = { title: "Agenda" };

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chip = (on: boolean) => `inline-flex h-11 flex-1 items-center justify-center rounded-full text-[15px] font-semibold ${on ? "bg-fg text-bg" : "text-fg-muted"}`;

export default async function Agenda({ searchParams }: { searchParams: Promise<{ d?: string; v?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = parisDateKey(new Date());
  const date = sp.d && dateRe.test(sp.d) ? sp.d : today;
  const week = sp.v === "semaine";

  // Semaine du lundi au dimanche contenant `date`.
  const wd = weekdayOf(date);
  const first = week ? addDays(date, -((wd + 6) % 7)) : date;
  const days = week ? Array.from({ length: 7 }, (_, i) => addDays(first, i)) : [date];
  const from = parisToUtc(first, "00:00");
  const to = parisToUtc(addDays(first, days.length), "00:00");

  const [bookings, off] = await Promise.all([bookingsBetween(from, to), timeOffBetween(from, to)]);
  const step = week ? 7 : 1;
  const link = (d: string, v = week) => `/admin?d=${d}${v ? "&v=semaine" : ""}`;
  const title = week ? `${cap(dayLabel(from).replace(/^\S+ /, ""))} - ${dayLabel(parisToUtc(days[6]!, "12:00")).replace(/^\S+ /, "")}` : cap(dayLabel(from));
  const active = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div className="flex rounded-full border border-line-strong p-1">
        <Link href={`/admin?d=${date}`} className={chip(!week)}>Jour<LinkPending /></Link>
        <Link href={`/admin?d=${date}&v=semaine`} className={chip(week)}>Semaine<LinkPending /></Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link href={link(addDays(date, -step))} aria-label="Précédent" className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong hover:bg-surface-2">
          <ChevronLeftIcon className="size-5" aria-hidden />
          <LinkPending />
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-[-0.03em]">{title}</h1>
          <p className="text-sm text-fg-muted">{active} rdv confirmé{active > 1 ? "s" : ""}</p>
        </div>
        <Link href={link(addDays(date, step))} aria-label="Suivant" className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong hover:bg-surface-2">
          <ChevronRightIcon className="size-5" aria-hidden />
          <LinkPending />
        </Link>
      </div>
      {date !== today || (week && !days.includes(today)) ? (
        <Link href={link(today)} className="block text-center text-[15px] text-fg-muted underline underline-offset-4">Revenir à aujourd&apos;hui<LinkPending /></Link>
      ) : null}

      <div className="space-y-8">
        {days.map((d) => {
          const dayStart = parisToUtc(d, "00:00");
          const dayEnd = parisToUtc(addDays(d, 1), "00:00");
          const list = bookings.filter((b) => new Date(b.starts_at) >= dayStart && new Date(b.starts_at) < dayEnd);
          const blocks = off.filter((o) => new Date(o.starts_at) < dayEnd && new Date(o.ends_at) > dayStart);
          return (
            <section key={d} aria-label={dayLabel(dayStart)}>
              {week ? (
                <h2 className="mb-3 flex items-baseline justify-between text-lg font-semibold tracking-tight">
                  <Link href={link(d, false)} className="underline-offset-4 hover:underline">{cap(dayLabel(dayStart))}{d === today ? " (aujourd'hui)" : ""}<LinkPending /></Link>
                  <span className="text-sm font-normal text-fg-muted">{list.filter((b) => b.status === "confirmed").length} rdv</span>
                </h2>
              ) : null}
              <div className="space-y-3">
                {blocks.map((o) => (
                  <div key={o.id} className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-4 py-3 text-[15px] text-fg-muted">
                    Bloqué{o.reason ? ` : ${o.reason}` : ""}
                    {new Date(o.starts_at) > dayStart || new Date(o.ends_at) < dayEnd ? ` (${timeLabel(new Date(Math.max(+new Date(o.starts_at), +dayStart)))} - ${timeLabel(new Date(Math.min(+new Date(o.ends_at), +dayEnd)))})` : " (toute la journée)"}
                  </div>
                ))}
                {list.map((b) => <BookingItem key={b.id} b={b} />)}
                {!list.length && !blocks.length ? <p className="py-2 text-[15px] text-fg-muted">Aucun rdv.</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
