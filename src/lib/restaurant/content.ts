import "server-only";
import { SHOW_DEMO_CONTENT } from "@/lib/env";
import { hoyEnMadrid } from "@/lib/format";
import { DEMO_CARTA, DEMO_EVENTOS, DEMO_MENU_DIA } from "@/lib/restaurant/demo-content";
import { getCarta, getEvento, getEventos, getMenuDia } from "@/lib/restaurant/queries";
import type {
  CartaSeccion,
  ContentState,
  Evento,
  EventoView,
  MenuDia,
  MenuDiaView,
} from "@/lib/restaurant/types";

// Decide qué se pinta: datos reales del tenant → contenido de ejemplo (solo con
// NEXT_PUBLIC_SHOW_DEMO_CONTENT=true) → estado vacío diseñado.

function fallback<T>(demo: T): ContentState<T> {
  return SHOW_DEMO_CONTENT ? { status: "demo", data: demo } : { status: "empty" };
}

export async function getCartaContent(): Promise<ContentState<CartaSeccion[]>> {
  const carta = await getCarta();
  const secciones: CartaSeccion[] = (carta ?? [])
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      nota: c.descripcion ?? undefined,
      items: c.productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioCentimos: p.precio_centimos,
        imagen: p.imagen_url ? { src: p.imagen_url, alt: p.nombre } : null,
        alergenos: p.alergenos,
        destacado: p.destacado,
        fuente: "supabase" as const,
      })),
    }))
    .filter((s) => s.items.length > 0);
  if (secciones.length > 0) return { status: "real", data: secciones };
  return fallback(DEMO_CARTA);
}

function menuDiaView(menu: MenuDia): MenuDiaView {
  const porTipo = (tipo: string) => menu.platos.filter((p) => p.tipo === tipo).sort((a, b) => a.orden - b.orden);
  const incluye = [
    menu.pan_incluido && "Pan",
    menu.bebida_incluida && "Bebida",
    menu.postre_o_cafe && "Postre o café",
  ].filter((x): x is string => Boolean(x));
  return {
    fecha: menu.fecha,
    precioCentimos: menu.precio_centimos,
    incluye,
    notas: menu.notas,
    actualizadoEn: menu.updated_at ?? null,
    platos: porTipo("plato"),
    primeros: porTipo("primero"),
    segundos: porTipo("segundo"),
    postres: porTipo("postre"),
    fuente: "supabase",
  };
}

export async function getMenuDiaContent(fecha = hoyEnMadrid()): Promise<ContentState<MenuDiaView>> {
  const menu = await getMenuDia(fecha);
  if (menu && menu.disponible && menu.platos.length > 0) return { status: "real", data: menuDiaView(menu) };
  return fallback(DEMO_MENU_DIA);
}

export function eventoView(e: Evento): EventoView {
  return {
    id: e.id,
    slug: e.slug,
    titulo: e.titulo,
    tipo: e.tipo ?? "Evento",
    descripcion: e.descripcion ?? "",
    imagen: e.imagen_url ? { src: e.imagen_url, alt: e.titulo } : null,
    fecha: e.fecha,
    hora: e.hora,
    precioCentimos: e.precio_centimos,
    aforo: e.aforo,
    estado: e.estado,
    enlaceReserva: e.enlace_reserva,
    fuente: "supabase",
  };
}

export async function getEventosContent(): Promise<ContentState<EventoView[]>> {
  const eventos = await getEventos();
  if (eventos && eventos.length > 0) return { status: "real", data: eventos.map(eventoView) };
  return fallback(DEMO_EVENTOS);
}

export async function getEventoContent(slug: string): Promise<EventoView | null> {
  const evento = await getEvento(slug);
  return evento ? eventoView(evento) : null;
}
