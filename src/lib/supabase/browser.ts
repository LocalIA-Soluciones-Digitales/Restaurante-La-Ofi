"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null | undefined;

/**
 * Cliente de navegador con la sesión del staff (cookie de @supabase/ssr). SOLO
 * para Realtime en el panel (cocina, salón): la RLS laofi.es_gestor() filtra los
 * eventos por tenant. null si no hay Supabase configurado (p. ej. backend local).
 */
export function supabaseNavegador(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cliente = url && key ? createBrowserClient(url, key) : null;
  return cliente;
}

/** Se suscribe a cambios de tablas de laofi y llama a `onCambio` (con un pequeño agrupado). Devuelve la baja. */
export function escucharLaofi(tablas: string[], onCambio: () => void): () => void {
  const sb = supabaseNavegador();
  if (!sb) return () => undefined;
  let t = 0;
  const avisar = () => {
    window.clearTimeout(t);
    t = window.setTimeout(onCambio, 250);
  };
  const canal = sb.channel(`laofi-${tablas.join("-")}-${Math.random().toString(36).slice(2)}`);
  for (const table of tablas) canal.on("postgres_changes", { event: "*", schema: "laofi", table }, avisar);
  canal.subscribe();
  return () => {
    window.clearTimeout(t);
    void sb.removeChannel(canal);
  };
}
