import "server-only";
import { itemDesdeRpc } from "@/lib/carta";
import { conFichas } from "@/lib/carta-fichas";
import { conFotosDePlato } from "@/lib/carta-fotos";
import { IS_DEMO, SHOW_DEMO_CONTENT } from "@/lib/env";
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

// Decide qué se pinta: datos reales del tenant → contenido de ejemplo (solo en la
// demo, con NEXT_PUBLIC_SHOW_DEMO_CONTENT=true) → estado vacío diseñado. En la web
// publicada (IS_DEMO=false) nunca sale contenido de ejemplo, aunque la variable
// siga encendida: la auditoría encontró eventos y un menú del día de muestra en
// producción.

function fallback<T>(demo: T): ContentState<T> {
  return SHOW_DEMO_CONTENT && IS_DEMO ? { status: "demo", data: demo } : { status: "empty" };
}

export async function getCartaContent(): Promise<ContentState<CartaSeccion[]>> {
  const carta = await getCarta();
  const secciones: CartaSeccion[] = (carta ?? [])
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      nota: c.descripcion ?? undefined,
      items: c.productos.map((p) => itemDesdeRpc(p)),
    }))
    .filter((s) => s.items.length > 0);
  if (secciones.length > 0) return { status: "real", data: conFichas(conFotosDePlato(secciones)) };
  return fallback(conFichas(conFotosDePlato(DEMO_CARTA)));
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
  const media = e.media ?? [];
  // Portada: la imagen indicada o, si no hay, la primera foto subida.
  const portada = e.imagen_url ?? media.find((m) => m.tipo === "imagen")?.url ?? null;
  return {
    id: e.id,
    slug: e.slug,
    titulo: e.titulo,
    tipo: e.tipo ?? "Evento",
    descripcion: e.descripcion ?? "",
    imagen: portada ? { src: portada, alt: e.titulo } : null,
    media: media.filter((m) => m.url !== portada),
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
