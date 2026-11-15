import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "dysicut_admin";
const TTL_S = 7 * 24 * 3600;

/** Cle de signature derivee de la cle secrete serveur (aucune variable de plus a gerer). */
function key(): Buffer | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return k ? createHmac("sha256", k).update("dysicut-admin-session-v1").digest() : null;
}

const sign = (k: Buffer, exp: number) => createHmac("sha256", k).update(`admin.${exp}`).digest("base64url");

export async function startSession(): Promise<void> {
  const k = key();
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  const exp = Math.floor(Date.now() / 1000) + TTL_S;
  (await cookies()).set(COOKIE, `${exp}.${sign(k, exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: TTL_S,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  const k = key();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!k || !raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isInteger(exp) || exp < Date.now() / 1000) return false;
  const want = Buffer.from(sign(k, exp));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** A appeler en tete de CHAQUE page et action admin (un layout ne protege pas les actions serveur). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

// ---------------------------------------------------------------- connexion (Supabase Auth)

const attempts = new Map<string, { n: number; reset: number }>();

/** Freine les essais de mot de passe (en memoire : suffit pour un compte unique, Supabase limite aussi). */
export async function loginThrottled(): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || cur.reset < now) {
    attempts.set(ip, { n: 1, reset: now + 15 * 60_000 });
    return false;
  }
  cur.n++;
  return cur.n > 8;
}

/**
 * Verifie email + mot de passe aupres de Supabase Auth, et que c'est bien le compte admin (ADMIN_EMAIL).
 * Client jetable : la session de l'utilisateur ne doit jamais se melanger au client serveur partage (cle secrete).
 */
export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !url || !anon) return false;
  if (email.trim().toLowerCase() !== admin) return false;
  const c = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInWithPassword({ email: admin, password });
  return !error && data.user?.email?.toLowerCase() === admin;
}
