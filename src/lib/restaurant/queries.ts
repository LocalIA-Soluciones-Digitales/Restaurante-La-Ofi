import "server-only";
import { getSiteKey, getSupabase } from "@/lib/supabase/client";
import type { Categoria, Evento, Mesa, MenuDia, Producto } from "@/lib/restaurant/types";

// Mismo patrón que Palomita-Bar: el frontend solo llama a RPC públicas
// SECURITY DEFINER que resuelven el tenant desde la site_key dentro de Postgres.
// Nunca se hace SELECT directo sobre restaurant.* ni se envía un cliente_id.
// Cada función devuelve null si Supabase no está configurado o la RPC falla
// (p. ej. migraciones de La Ofi aún sin aplicar): quien llama decide si mostrar
// un estado vacío o contenido de ejemplo.

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const supabase = getSupabase();
  const siteKey = getSiteKey();
  if (!supabase || !siteKey) return null;
  try {
    const { data, error } = await supabase.rpc(fn, { p_site_key: siteKey, ...args });
    if (error) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function getCategorias(): Promise<Categoria[] | null> {
  return rpc<Categoria[]>("get_categorias_publica");
}

export function getCarta(): Promise<Producto[] | null> {
  return rpc<Producto[]>("get_carta_publica");
}

export function getHorario(): Promise<string | null> {
  return rpc<string>("get_horario_publico");
}

/** Menú del día publicado para una fecha (YYYY-MM-DD, horario de Madrid). */
export function getMenuDia(fecha: string): Promise<MenuDia | null> {
  return rpc<MenuDia>("get_menu_dia_publico", { p_fecha: fecha });
}

/** Eventos publicados; por defecto solo los que no han pasado. */
export function getEventos(incluirPasados = false): Promise<Evento[] | null> {
  return rpc<Evento[]>("get_eventos_publicos", { p_incluir_pasados: incluirPasados });
}

export function getEvento(slug: string): Promise<Evento | null> {
  return rpc<Evento>("get_evento_publico", { p_slug: slug });
}

/** Valida el identificador de una mesa (QR). RPC existente del schema restaurant. */
export function validarMesa(identificador: string): Promise<Mesa | null> {
  return rpc<Mesa>("validar_mesa", { p_identificador: identificador });
}
