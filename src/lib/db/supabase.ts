import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Vrai si les variables Supabase sont renseignées (sinon la réservation se désactive proprement). */
export function dbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Client serveur avec la clé secrète (service role) : contourne la RLS, donc JAMAIS importé côté client
 * (le "server-only" ci-dessus fait échouer le build si c'est le cas).
 */
export function db(): SupabaseClient {
  if (!dbConfigured()) throw new Error("Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
