// Mémorise le rdv dans le navigateur du client : le lien d'annulation reste accessible même sans email ni SMS.
const KEY = "dysicut-booking";

export type StoredBooking = { token: string; startsAt: string; serviceName: string };

export function readStored(): StoredBooking | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<StoredBooking> | null;
    return v && typeof v.token === "string" && typeof v.startsAt === "string" ? { token: v.token, startsAt: v.startsAt, serviceName: v.serviceName ?? "" } : null;
  } catch {
    return null;
  }
}

export function writeStored(b: StoredBooking) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* navigation privée : sans conséquence, le lien reste affiché à l'écran */
  }
}

export function clearStored() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}
