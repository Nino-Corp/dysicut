export type BookingErrorCode =
  | "SLOT_TAKEN"
  | "TOO_SOON"
  | "TOO_FAR"
  | "ACTIVE_BOOKING"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "BOOKING_DISABLED"
  | "PHONE_BLOCKED"
  | "NOT_FOUND"
  | "NOT_CANCELLABLE"
  | "CANCEL_TOO_LATE"
  | "INVALID"
  | "UNAVAILABLE";

export class BookingError extends Error {
  constructor(public code: BookingErrorCode) {
    super(code);
  }
}

/** Messages affichés au client (tutoiement, comme le reste du site). */
export const errorMessages: Record<BookingErrorCode, { status: number; message: string }> = {
  SLOT_TAKEN: { status: 409, message: "Ce créneau vient d'être pris. Choisis-en un autre." },
  TOO_SOON: { status: 409, message: "Ce créneau est trop proche. Choisis-en un autre." },
  TOO_FAR: { status: 409, message: "Ce créneau est trop loin dans le temps." },
  ACTIVE_BOOKING: {
    status: 409,
    message: "Tu as déjà un rdv à venir avec ce numéro. Annule-le avec ton lien d'annulation avant d'en prendre un autre, ou écris-nous en message.",
  },
  RATE_LIMITED: { status: 429, message: "Trop de tentatives. Réessaie dans une heure ou écris-nous en message." },
  SERVICE_UNAVAILABLE: { status: 409, message: "Cette prestation n'est plus disponible." },
  BOOKING_DISABLED: { status: 503, message: "La réservation en ligne est fermée pour le moment. Écris-nous en message." },
  PHONE_BLOCKED: {
    status: 403,
    message: "La réservation en ligne n'est pas disponible avec ce numéro. Contacte directement le barber.",
  },
  NOT_FOUND: { status: 404, message: "Rendez-vous introuvable." },
  NOT_CANCELLABLE: { status: 409, message: "Ce rendez-vous n'est plus annulable." },
  CANCEL_TOO_LATE: { status: 409, message: "Il est trop tard pour annuler en ligne. Contacte directement le barber." },
  INVALID: { status: 400, message: "Informations invalides." },
  UNAVAILABLE: { status: 503, message: "La réservation en ligne est indisponible. Écris-nous en message." },
};
