import "server-only";
import type { HorarioDiaBd } from "@/lib/horario";
import { rpcPublica } from "@/lib/supabase/rpc";
import type { CartaCategoria, Evento, MenuDia } from "@/lib/restaurant/types";

// Los datos de La Ofi viven en su propio schema (`laofi`), sin compartir tablas
// con otros proyectos. La web solo llama a las RPC públicas `laofi_*`, que validan
// en Postgres que la site_key es la de La Ofi; nunca hace SELECT directo ni envía
// ningún id de tenant. Cada función devuelve null si Supabase no está configurado
// o la RPC falla: quien llama decide si mostrar contenido de referencia o vacío.

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const r = await rpcPublica<T>(fn, args);
    return r && !r.error ? r.data : null;
  } catch {
    return null;
  }
}

/** Carta completa: categorías visibles con sus productos disponibles. */
export function getCarta(): Promise<CartaCategoria[] | null> {
  return rpc<CartaCategoria[]>("laofi_get_carta");
}

export function getHorario(): Promise<HorarioDiaBd[] | null> {
  return rpc<HorarioDiaBd[]>("laofi_get_horario");
}

/** Menú del día publicado para una fecha (YYYY-MM-DD, horario de Madrid). */
export function getMenuDia(fecha: string): Promise<MenuDia | null> {
  return rpc<MenuDia>("laofi_get_menu_dia", { p_fecha: fecha });
}

/** Eventos publicados; por defecto solo los de hoy en adelante. */
export function getEventos(incluirPasados = false): Promise<Evento[] | null> {
  return rpc<Evento[]>("laofi_get_eventos", { p_incluir_pasados: incluirPasados });
}

export function getEvento(slug: string): Promise<Evento | null> {
  return rpc<Evento>("laofi_get_evento", { p_slug: slug });
}
