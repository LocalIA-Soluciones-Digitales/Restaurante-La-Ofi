import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente service_role (salta RLS). SOLO en servidor: `server-only` hace fallar
 * el build si algún componente de cliente lo importa por error. Se usa
 * únicamente para Stripe (crear el checkout con el importe real y marcar pagos
 * desde el webhook). null si falta la variable: los pagos online quedan
 * desactivados y "pagar en el local" sigue funcionando.
 */
export function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
