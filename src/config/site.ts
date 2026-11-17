/**
 * Source unique : infos fixes et valeurs INITIALES (seed).
 * Horaires, prestations et tarifs seront éditables depuis /admin (base de données) plus tard.
 */

export const site = {
  name: "Dysicut",
  tagline: "Une coupe nette. Rien de plus.", // provisoire
  city: "Marseille",
  locale: "fr-FR",
  timezone: "Europe/Paris",
  // Doit être défini en production (NEXT_PUBLIC_SITE_URL), sert aux métadonnées.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),

  // Adresse PROVISOIRE, non confirmée : ne pas l'utiliser dans le JSON-LD ni la carte.
  address: {
    confirmed: false,
    street: "35-29 Chem. des Campanules",
    postalCode: "13012",
    city: "Marseille",
    // Position du numéro 35 telle que localisée par Google Maps (adresse provisoire). TODO à corriger avec l'adresse exacte.
    coords: { lat: 43.30026, lon: 5.44854 },
  },

  social: {
    instagramHandle: "dysicutz",
    instagramUrl: "https://www.instagram.com/dysicutz/",
    instagramDm: "https://ig.me/m/dysicutz",
    // TODO handle TikTok, numéro WhatsApp / téléphone : à fournir (boutons masqués en attendant)
    tiktokUrl: null as string | null,
    whatsappUrl: null as string | null,
    phone: null as string | null,
  },
} as const;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = dimanche

/** Horaires temporaires : lundi à jeudi, 11h-20h. Absent = fermé. */
export const defaultOpeningHours: Partial<Record<Weekday, { start: string; end: string }>> = {
  1: { start: "11:00", end: "20:00" },
  2: { start: "11:00", end: "20:00" },
  3: { start: "11:00", end: "20:00" },
  4: { start: "11:00", end: "20:00" },
};

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceEur: number;
};

// TODO tarifs réels : valeurs fictives, à remplacer. Ne pas présenter comme définitives.
export const defaultServices: readonly Service[] = [
  { id: "coupe", name: "Coupe", durationMin: 40, priceEur: 20 },
  { id: "barbe", name: "Barbe", durationMin: 40, priceEur: 12 },
  { id: "coupe-barbe", name: "Coupe + barbe", durationMin: 40, priceEur: 30 },
  { id: "enfant", name: "Enfant (-12 ans)", durationMin: 40, priceEur: 15 },
];

/** Réglages de réservation par défaut (réglables dans l'admin plus tard). */
export const defaultBookingSettings = {
  slotStepMin: 40,
  minLeadHours: 2,
  maxAdvanceDays: 30,
} as const;

/**
 * Informations légales (mentions légales). TODO à compléter par l'ami avant la mise en ligne :
 * tant qu'une valeur est null, la page affiche « à compléter ».
 */
export const legal = {
  ownerName: null as string | null, // nom et prénom de l'entrepreneur individuel
  statut: "Entrepreneur individuel (micro-entrepreneur)",
  siret: null as string | null,
  contactEmail: process.env.NOTIFY_EMAIL ?? null, // TODO email réel de l'ami
  mediator: null as string | null, // médiateur de la consommation (obligatoire pour un pro qui vend à des consommateurs)
  host: { name: "Vercel Inc.", address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis", url: "https://vercel.com" },
} as const;
