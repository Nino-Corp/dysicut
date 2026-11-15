import "server-only";
import { createHmac, randomBytes } from "node:crypto";

/** Jeton d'annulation : 256 bits aléatoires (43 caractères). */
export function newCancelToken(): string {
  return randomBytes(32).toString("base64url");
}

export const isTokenShape = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

/** IP -> empreinte HMAC pour l'anti-spam (l'IP brute n'est jamais stockée). */
export function hashIp(ip: string | null): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ip || !key) return null;
  return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32);
}
