import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Cliente anon del proyecto Supabase compartido de LocalIA, solo en servidor.
 * Devuelve null si faltan las variables: la web sigue funcionando (estados
 * vacíos o contenido de ejemplo) en vez de romper el build. La service_role no
 * se usa en ningún punto de V1.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
  return cached;
}

export function getSiteKey(): string | null {
  return process.env.LAOFI_SITE_KEY || null;
}
