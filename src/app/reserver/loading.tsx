import { BookingShell } from "@/components/booking/BookingShell";

/** Affichée tout de suite au tap sur « Prendre RDV », le temps que les prestations soient lues en base. */
export default function Loading() {
  return (
    <BookingShell>
      <div role="status" aria-label="Chargement" className="animate-pulse">
        <div className="mt-6 h-3 w-24 rounded-full bg-surface-2" />
        <div className="mt-5 h-10 w-4/5 rounded-xl bg-surface-2" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] rounded-[20px] border border-line bg-surface" />
          ))}
        </div>
      </div>
    </BookingShell>
  );
}
