/**
 * Photos des coupes (fallback statique en attendant le feed Instagram automatique, étape 6).
 * Déposer les vraies photos (avec l'accord du barber) dans public/cuts/ puis les lister ici.
 * Tant que la liste est vide, la section affiche des cadres neutres.
 */
export type Cut = {
  src: string; // ex. "/cuts/degrade-01.jpg"
  alt: string; // description précise, ex. "Dégradé bas, dessus texturé, cheveux châtains"
  width: number;
  height: number;
  hair?: "caucasien" | "afro";
};

export const cuts: readonly Cut[] = []; // TODO photos réelles

export const cutFilters = [
  { id: "all", label: "Tout" },
  { id: "caucasien", label: "Caucasien" },
  { id: "afro", label: "Cheveux afro" },
] as const;
