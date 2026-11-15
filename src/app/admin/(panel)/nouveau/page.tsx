import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { input, label } from "@/components/admin/ui";
import { createManualBooking } from "@/lib/admin/actions";
import { allServices } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { parisDateKey } from "@/lib/booking/time";
import { ManualBookingFields } from "./ManualBookingFields";

export const metadata = { title: "Nouveau rdv" };

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const services = (await allServices()).filter((s) => s.active);
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : parisDateKey(new Date());
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Nouveau rdv</h1>
      <p className="text-fg-muted">Pour un client venu par message ou par téléphone. Aucun délai minimum n&apos;est appliqué ; un autre rdv n&apos;est jamais écrasé.</p>
      <ActionForm action={createManualBooking}>
        <ManualBookingFields services={services.map((s) => ({ id: s.id, name: s.name, minutes: s.duration_min }))} date={date} />
        <div>
          <label htmlFor="firstName" className={label}>Prénom</label>
          <input id="firstName" name="firstName" required maxLength={60} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Téléphone</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="off" placeholder="06 12 34 56 78" className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>Email (facultatif, pour envoyer la confirmation)</label>
          <input id="email" name="email" type="email" autoComplete="off" className={input} />
        </div>
        <SubmitButton>Ajouter le rdv</SubmitButton>
      </ActionForm>
    </div>
  );
}
