import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/admin/ActionForm";
import { blockPhone, unblockPhone } from "@/lib/admin/actions";

type Props = { phone: string; blocked: boolean; noShows: number };

/** Bloquer ou pardonner un numéro. Le pardon remet aussi le compteur d'absences à zéro. */
export function ClientActions({ phone, blocked, noShows }: Props) {
  if (blocked || noShows > 0) {
    return (
      <ActionForm action={unblockPhone} className="space-y-2">
        <input type="hidden" name="phone" value={phone} />
        <SubmitButton ghost>{blocked ? "Débloquer et remettre à zéro" : "Pardonner (remettre à zéro)"}</SubmitButton>
      </ActionForm>
    );
  }
  return null;
}

export function BlockAction({ phone }: { phone: string }) {
  return (
    <ActionForm action={blockPhone} className="space-y-2">
      <input type="hidden" name="phone" value={phone} />
      <ConfirmSubmit confirmLabel="Confirmer le blocage">Bloquer ce numéro</ConfirmSubmit>
    </ActionForm>
  );
}
