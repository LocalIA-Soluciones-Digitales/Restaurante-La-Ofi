import { IMAGES } from "@/lib/images";
import type { CartaSeccion, EventoView, MenuDiaView } from "@/lib/restaurant/types";

// Contenido para la DEMO cuando Supabase todavía no tiene datos de La Ofi.
// Solo se usa con NEXT_PUBLIC_SHOW_DEMO_CONTENT=true y SIEMPRE se marca en
// pantalla. Reglas:
//  - fuente "instagram": publicado por el propio restaurante (@laofiparke). Real,
//    pero se muestra "precios según Instagram, confirmar en el local".
//  - fuente "prensa": plato citado por Deia (13/09/2025). Real, sin precio.
//  - fuente "carta": plato de una foto de la carta subida por un cliente (2025). Sin precio legible.
//  - fuente "opiniones": dato publicado por clientes (reseñas). Confirmar en el local.
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
    id: "demo-picotear",
    slug: "para-picotear",
    nombre: "Para picotear",
    nota: "Platos de la carta de La Ofi según una foto subida por un cliente a Restaurant Guru (2025). Los precios no se leen en la foto: consúltalos en el local.",
    items: [
      { n: "Tabla de ibérico", d: null },
      { n: "Paletilla ibérica", d: null },
      { n: "Queso de la casa", d: null },
      { n: "Croquetas variadas", d: "6 unidades" },
      { n: "Puerros a la parrilla", d: "Sobre una base de salsa de hongos" },
      { n: "Espárragos a la parrilla", d: "Sobre una mahonesa de aguacate" },
      { n: "Pimientos del país", d: "12 unidades" },
      { n: "Pulpo a la parrilla", d: null, i: img("pulpoBrasa") },
      { n: "Gambas al ajillo", d: "10 unidades" },
      { n: "Morcilla a la brasa", d: null },
    ].map((t, idx) => ({
      id: `demo-picotear-${idx}`,
      nombre: t.n,
      descripcion: t.d,
      precioCentimos: null,
      imagen: t.i ?? null,
      alergenos: [],
      destacado: false,
      fuente: "carta" as const,
    })),
  },
  {
    id: "demo-brasa",
    slug: "brasa",
    nombre: "Carnes y pescados a la brasa",
    nota: "Especialidades citadas por Deia (septiembre de 2025). Disponibilidad y precio según mercado: pregunta en el local.",
    items: [
      { n: "Pescado del día a la parrilla", d: "Según mercado: lenguado, rodaballo, lubina, bonito, chicharro… Salvaje bajo reserva." },
      { n: "Solomillo a la brasa", d: null },
      { n: "Entrecot a la brasa", d: null },
      { n: "Secreto ibérico a la brasa", d: null },
      { n: "Rabo de toro", d: "Cocido y dorado en la parrilla" },
      { n: "Carrilleras al Pedro Ximénez", d: null },
    ].map((t, idx) => ({
      id: `demo-brasa-${idx}`,
      nombre: t.n,
      descripcion: t.d,
      precioCentimos: null,
      imagen: null,
      alergenos: [],
      destacado: false,
      fuente: "prensa" as const,
    })),
  },
];

// Plato del día según opiniones publicadas por clientes (agregadas por
// menu-world.com a partir de reseñas; sin fecha exacta) y coherente con Deia
// (09/2025: plato del día a elegir entre varias opciones de lunes a viernes).
// Los platos son ejemplos que han servido otros días, no el menú de hoy.
export const DEMO_MENU_DIA: MenuDiaView = {
  fecha: null,
  precioCentimos: 890,
  incluye: ["Bebida", "Pan", "Postre"],
  notas: "Precio e incluidos según opiniones de clientes en internet: confírmalos en el local. Los platos son ejemplos de días anteriores; cada día el encargado publicará aquí el plato del día.",
  platos: [
    { id: "d1", tipo: "plato", nombre: "Secreto con patatas", descripcion: null, alergenos: [], orden: 1 },
    { id: "d2", tipo: "plato", nombre: "Arroz caldoso de presa ibérica", descripcion: null, alergenos: [], orden: 2 },
    { id: "d3", tipo: "plato", nombre: "Pasta con crema de calabaza", descripcion: null, alergenos: [], orden: 3 },
    { id: "d4", tipo: "plato", nombre: "Muslo de pollo asado con patatas", descripcion: null, alergenos: [], orden: 4 },
  ],
  primeros: [],
  segundos: [],
  postres: [],
  fuente: "opiniones",
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
