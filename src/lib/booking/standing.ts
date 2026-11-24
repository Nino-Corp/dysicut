// Regles pures sur les absences et l'acompte. La base applique les memes regles dans create_booking (0003) ;
// ce module sert a l'admin (affichage) et aux tests. Aucune dependance serveur.

export type DepositMode = "off" | "flagged" | "all";

export type Standing = {
  /** Blocage manuel pose par le barber. */
  blocked: boolean;
  /** Date du dernier "pardon" : les absences avant cette date ne comptent plus. */
  liftedAt: Date | null;
  /** Dates (debut du rdv) de chaque absence connue pour ce numero. */
  noShowDates: Date[];
};

/** Absences qui comptent encore (apres le dernier pardon). */
export const activeNoShows = (s: Standing): number =>
  s.noShowDates.filter((d) => !s.liftedAt || d.getTime() > s.liftedAt.getTime()).length;

/** Seuil 0 = blocage automatique desactive. Un blocage manuel s'applique toujours. */
export const isBlocked = (s: Standing, threshold: number): boolean =>
  s.blocked || (threshold > 0 && activeNoShows(s) >= threshold);

export type DepositInput = { mode: DepositMode; depositCents: number; priceCents: number; activeNoShows: number; stripeReady: boolean };

/** Montant d'acompte exige (en centimes), 0 si aucun. Minimum Stripe : 0,50 EUR. Jamais plus que le prix. */
export function depositCentsFor(i: DepositInput): number {
  if (!i.stripeReady || i.mode === "off") return 0;
  if (i.mode === "flagged" && i.activeNoShows < 1) return 0;
  const cents = Math.min(i.depositCents, i.priceCents);
  return cents >= 50 ? cents : 0;
}
