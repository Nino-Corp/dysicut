/**
 * Normalise un numéro au format international E.164 (France par défaut).
 * Retourne null si invalide. Formats acceptés : 06 12 34 56 78, 0612345678, +33 6 12 34 56 78,
 * 0033612345678, ou tout numéro international commençant par + (8 à 15 chiffres).
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s.\-()]/g, "");
  if (!/^\+?\d+$/.test(s)) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) {
    // +330612... : le 0 de la forme nationale ne doit pas rester
    if (s.startsWith("+330")) s = "+33" + s.slice(4);
  } else if (s.startsWith("0")) {
    s = "+33" + s.slice(1);
  } else {
    return null; // sans 0 ni + : ambigu, on refuse
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  // Numéros français : 9 chiffres après +33, qui commencent par 1 à 9.
  if (s.startsWith("+33") && !/^\+33[1-9]\d{8}$/.test(s)) return null;
  return s;
}

/** "+33612345678" -> "06 12 34 56 78" ; autres pays : tel quel. */
export function formatPhone(e164: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}
