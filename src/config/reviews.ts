export type Review = { author: string; text: string; source: "Google" | "Instagram" };

// TODO avis réels : à renseigner à la main (avis Google ou DM Instagram, avec accord de la personne).
// Tant que la liste est vide, la section affiche des emplacements.
export const reviews: readonly Review[] = [];
