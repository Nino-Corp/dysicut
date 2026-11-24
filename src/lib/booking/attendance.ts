// Confirmation de presence : regle pure de liberation des creneaux non confirmes. Aucune dependance serveur.

export type AttendanceInput = {
  status: string;
  source: string;
  payment_status: string;
  confirmation_requested_at: string | null;
  attendance_confirmed_at: string | null;
  starts_at: string;
};

/** Delai minimum avant le rdv pour liberer : en dessous, le client n'aurait plus le temps de reprendre un autre creneau. */
export const RELEASE_MIN_LEAD_MS = 2 * 3_600_000;

/**
 * Un rdv est libere seulement si : le client a recu la demande de confirmation, n'a pas repondu, le rdv vient du site
 * (jamais un rdv ajoute a la main par le barber), aucun acompte n'est paye, et il reste au moins 2 h avant le rdv.
 */
export function shouldRelease(b: AttendanceInput, now: Date): boolean {
  return (
    b.status === "confirmed" &&
    b.source === "web" &&
    b.payment_status !== "paid" &&
    b.confirmation_requested_at !== null &&
    b.attendance_confirmed_at === null &&
    new Date(b.starts_at).getTime() - now.getTime() >= RELEASE_MIN_LEAD_MS
  );
}
