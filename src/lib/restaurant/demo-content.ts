import { IMAGES } from "@/lib/images";
import type { CartaSeccion, EventoView, MenuDiaView } from "@/lib/restaurant/types";

// Contenido para la DEMO cuando Supabase todavía no tiene datos de La Ofi.
// Solo se usa con NEXT_PUBLIC_SHOW_DEMO_CONTENT=true y SIEMPRE se marca en
// pantalla. Reglas:
//  - fuente "instagram": publicado por el propio restaurante (@laofiparke). Real,
//    pero se muestra "precios según Instagram, confirmar en el local".
//  - fuente "prensa": plato citado por Deia (13/09/2025). Real, sin precio.
//  - fuente "ejemplo": estructura ilustrativa. Sin precios ni fechas inventadas.
// Nunca se inventan precios, alérgenos ni fechas.

const img = (key: keyof typeof IMAGES) => ({ src: IMAGES[key].src.src, alt: IMAGES[key].alt });

export const DEMO_CARTA: CartaSeccion[] = [
  {
    id: "demo-desayunos",
    slug: "desayunos",
    nombre: "Desayunos y tostadas",
    nota: "Carta de tostadas en pan de masa madre publicada por La Ofi en Instagram (servicio de 9:00 a 11:30). Precios según esa publicación: confírmalos en el local.",
    items: [
      { n: "Clásica", d: "Mermelada, mantequilla, aceite o tomate", p: 210 },
      { n: "Ibérico", d: "Tomate, aceite y jamón", p: 390 },
      { n: "Aguacate", d: "Aguacate, tomate y jamón ibérico", p: 560 },
      { n: "Salmón", d: "Salmón, queso crema y sésamo", p: 650, i: img("tostadaSalmon") },
      { n: "Burrata", d: "Burrata, melocotón a la plancha y jamón ibérico", p: 600, i: img("tostadaBurrata") },
      { n: "Revuelta", d: "Queso cottage, huevo revuelto y jamón ibérico", p: 650, i: img("tostadaRevuelta") },
      { n: "Bonita", d: "Tortilla francesa de bonito y aguacate", p: 600, i: img("tostadaBonita") },
      { n: "Americana", d: "Bacon y huevo frito", p: 650 },
      { n: "Bowl de yogur", d: "Muesli, miel y fruta tropical de temporada", p: 450 },
    ].map((t, idx) => ({
      id: `demo-tostada-${idx}`,
      nombre: t.n,
      descripcion: t.d,
      precioCentimos: t.p,
      imagen: t.i ?? null,
      alergenos: [],
      destacado: false,
      fuente: "instagram" as const,
    })),
  },
  {
    id: "demo-brasa",
    slug: "brasa",
    nombre: "De la brasa",
    nota: "Especialidades citadas por Deia (septiembre de 2025). Disponibilidad y precio según mercado: pregunta en el local.",
    items: [
      { n: "Pulpo a la brasa", d: null, i: img("pulpoBrasa") },
      { n: "Puerros a la parrilla sobre salsa de hongos", d: null },
      { n: "Carrilleras al Pedro Ximénez", d: null },
      { n: "Secreto ibérico a la brasa", d: null },
      { n: "Pescado del día a la parrilla", d: "Según mercado: lenguado, rodaballo, lubina, bonito, chicharro…" },
      { n: "Morcilla de puerro de Zamudio", d: null },
    ].map((t, idx) => ({
      id: `demo-brasa-${idx}`,
      nombre: t.n,
      descripcion: t.d,
      precioCentimos: null,
      imagen: t.i ?? null,
      alergenos: [],
      destacado: false,
      fuente: "prensa" as const,
    })),
  },
];

export const DEMO_MENU_DIA: MenuDiaView = {
  fecha: null,
  precioCentimos: null,
  incluye: [],
  notas: "Ejemplo de estructura: el menú real lo publicará el encargado cada mañana desde el panel de gestión.",
  primeros: [
    { id: "d1", tipo: "primero", nombre: "Ensalada de temporada", descripcion: null, alergenos: [], orden: 1 },
    { id: "d2", tipo: "primero", nombre: "Plato de cuchara", descripcion: null, alergenos: [], orden: 2 },
    { id: "d3", tipo: "primero", nombre: "Pasta o arroz del día", descripcion: null, alergenos: [], orden: 3 },
  ],
  segundos: [
    { id: "d4", tipo: "segundo", nombre: "Carne a la brasa", descripcion: null, alergenos: [], orden: 1 },
    { id: "d5", tipo: "segundo", nombre: "Ave del día", descripcion: null, alergenos: [], orden: 2 },
    { id: "d6", tipo: "segundo", nombre: "Pescado del mercado a la parrilla", descripcion: null, alergenos: [], orden: 3 },
  ],
  postres: [{ id: "d7", tipo: "postre", nombre: "Postre casero", descripcion: null, alergenos: [], orden: 1 }],
  fuente: "ejemplo",
};

export const DEMO_EVENTOS: EventoView[] = [
  {
    id: "demo-tardeo",
    slug: null,
    titulo: "Tardeo en La Ofi",
    tipo: "Tardeo",
    descripcion: "Una tarde al mes la terraza se convierte en punto de encuentro: música, algo de picar y buen rollo. Fecha del próximo, por anunciar.",
    imagen: img("terrazaCarpa"),
    fecha: null,
    hora: null,
    precioCentimos: null,
    aforo: null,
    estado: "proximo",
    enlaceReserva: null,
    fuente: "ejemplo",
  },
  {
    id: "demo-partidos",
    slug: null,
    titulo: "Partidos en pantalla grande",
    tipo: "Deporte",
    descripcion: "Retransmitimos partidos con servicio audiovisual en el local. Consulta qué partido toca esta semana.",
    imagen: img("barra"),
    fecha: null,
    hora: null,
    precioCentimos: null,
    aforo: null,
    estado: "proximo",
    enlaceReserva: null,
    fuente: "ejemplo",
  },
  {
    id: "demo-celebraciones",
    slug: null,
    titulo: "Celebraciones y eventos de empresa",
    tipo: "Privado",
    descripcion: "Menús concertados para bautizos, comuniones, postbodas o reuniones de empresa en el comedor privado o en la terraza cubierta.",
    imagen: img("salonNoche"),
    fecha: null,
    hora: null,
    precioCentimos: null,
    aforo: null,
    estado: "proximo",
    enlaceReserva: null,
    fuente: "ejemplo",
  },
];
