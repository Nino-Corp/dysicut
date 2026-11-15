import "server-only";
import { BookingError, errorMessages, type BookingErrorCode } from "./errors";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonError(code: BookingErrorCode, message?: string) {
  const e = errorMessages[code];
  return Response.json({ error: code, message: message ?? e.message }, { status: e.status, headers: NO_STORE });
}

/** Transforme une exception en réponse HTTP propre (jamais de détail interne côté client). */
export function handleError(e: unknown) {
  if (e instanceof BookingError) return jsonError(e.code);
  console.error("[booking] erreur inattendue", e);
  return jsonError("UNAVAILABLE");
}
