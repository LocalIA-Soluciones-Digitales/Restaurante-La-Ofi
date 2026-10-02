import "server-only";
import { supabaseStaff } from "@/lib/admin/session";
import { getSiteKey, getSupabase } from "@/lib/supabase/client";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { PGLITE_ACTIVO, rpcLocal, type RpcResult } from "@/lib/supabase/dev-pglite";

// Único punto de acceso a las RPC laofi_*. En producción va contra el Supabase
// compartido; con LAOFI_PGLITE=1 (solo desarrollo), contra el Postgres local en
// memoria (dev-pglite.ts). Todo en servidor: el navegador nunca ve la site_key.

export type { RpcResult };

/** RPC pública (rol anon) con la site_key de La Ofi. */
export async function rpcPublica<T>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T> | null> {
  if (PGLITE_ACTIVO) return rpcLocal<T>(fn, { p_site_key: null, ...args }, "anon");
  const supabase = getSupabase();
  const siteKey = getSiteKey();
  if (!supabase || !siteKey) return null;
  const { data, error } = await supabase.rpc(fn, { p_site_key: siteKey, ...args });
  return { data: (data as T) ?? null, error: error ? { message: error.message, code: error.code } : null };
}

/** RPC de servicio (service_role): solo Stripe. null si no está configurado. */
export async function rpcServicio<T>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T> | null> {
  if (PGLITE_ACTIVO) return rpcLocal<T>(fn, args, "service_role");
  const supabase = getServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? { message: error.message, code: error.code } : null };
}

/**
 * RPC del panel como el usuario autenticado (rol authenticated): la RLS
 * laofi.es_gestor() y laofi.exigir_rol() deciden en Postgres qué puede hacer.
 */
export async function rpcStaff<T>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T> | null> {
  if (PGLITE_ACTIVO) return rpcLocal<T>(fn, args, "authenticated");
  const supabase = await supabaseStaff();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? { message: error.message, code: error.code } : null };
}
