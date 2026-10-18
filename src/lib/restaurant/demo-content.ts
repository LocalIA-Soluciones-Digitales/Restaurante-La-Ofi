import { cartaItem } from "@/lib/carta";
import { IMAGES } from "@/lib/images";
import type { CartaItem, CartaSeccion, Etiqueta, EventoView, MenuDiaView } from "@/lib/restaurant/types";

// Contenido para la DEMO cuando Supabase todavía no tiene datos de La Ofi.
// Solo se usa con NEXT_PUBLIC_SHOW_DEMO_CONTENT=true y SIEMPRE se marca en
// pantalla. Reglas:
//  - fuente "instagram": publicado por el propio restaurante (@laofiparke). Real,
//    pero se muestra "precios según Instagram, confirmar en el local".
//  - fuente "carta": carta oficial facilitada por el restaurante (septiembre de 2026).
//  - fuente "opiniones": dato publicado por clientes (reseñas). Confirmar en el local.
//  - fuente "ejemplo": estructura ilustrativa. Sin precios ni fechas inventadas.
// Nunca se inventan precios, alérgenos ni fechas. Las etiquetas solo se derivan
// del propio dato publicado (entrantes, "a la brasa", horario de desayunos). La
// nutrición es una estimación orientativa (carta-fichas.ts) y la web lo indica.

const img = (key: keyof typeof IMAGES) => ({ src: IMAGES[key].src.src, alt: IMAGES[key].alt });

// Extras de la demo para enseñar la carta interactiva sin inventar datos reales:
// la Clásica tiene como opciones exactamente las de su descripción publicada, y
// la nutrición y los ingredientes los completa src/lib/carta-fichas.ts.
const EXTRA_TOSTADAS: Record<string, Partial<CartaItem>> = {
  Clásica: {
    modificadores: [
      {
        id: "demo-clasica-con",
        nombre: "Con",
        tipo: "unico",
        obligatorio: true,
        max_opciones: null,
        opciones: ["Mermelada", "Mantequilla", "Aceite", "Tomate"].map((nombre, i) => ({
          id: `demo-clasica-${i}`,
          nombre,
          precio_extra_centimos: 0,
        })),
      },
    ],
  },
};

// Carta oficial de El Despacho de la Ofi (PDF facilitado por el restaurante,
// septiembre de 2026). Igual que supabase/seed/la_ofi_carta_oficial.sql.
type ItemDespacho = [nombre: string, precio: number | null, descripcion?: string | null, etiquetas?: Etiqueta[]];
const PICAR: Etiqueta[] = ["para_picar"];
const PICAR_BRASA: Etiqueta[] = ["para_picar", "brasa"];
const DESPACHO: { slug: string; nombre: string; nota?: string; items: ItemDespacho[] }[] = [
  {
    slug: "entrantes",
    nombre: "Entrantes",
    nota: "Carta de El Despacho de la Ofi. Servicio de pan: 2 € por persona.",
    items: [
      ["Cecina de Angus", 1900, null, PICAR],
      ["Tabla de ibérico", 2400, null, PICAR],
      ["Paletilla ibérica", 1600, null, PICAR],
      ["Queso de la casa", 1600, null, PICAR],
      ["Anchoas 00", 2300, "Selección Especial Casa Santoña", PICAR],
      ["Gambas al ajillo", 1600, null, PICAR],
      ["Croquetas de la casa", 230, "Precio por unidad", ["para_picar", "casero"]],
    ],
  },
  {
    slug: "entrantes-brasa",
    nombre: "Entrantes a la brasa",
    items: [
      ["Puerros con salsa de hongos", 1200, null, PICAR_BRASA],
      ["Espárragos sobre mahonesa de aguacate", 1500, null, PICAR_BRASA],
      ["Pulpo", 2300, null, PICAR_BRASA],
      ["Morcilla de Burgos con pimientos asados", 1500, null, PICAR_BRASA],
      ["Morcilla de puerro de Zamudio", 1500, null, PICAR_BRASA],
      ["Flor de alcachofa con papada ibérica y huevo", 1500, null, PICAR_BRASA],
    ],
  },
  {
    slug: "ensaladas",
    nombre: "Nuestras ensaladas",
    items: [
      ["Ensalada de la casa", 1500, "Mezclum, tartar de tomate y aguacate"],
      ["Ensalada de burrata", 1600],
      ["Ensalada de ventresca con pimientos asados", 1800],
      ["Bol de lechuga y cebolla", 700],
      ["Bol de tomate, lechuga y cebolla", 900],
    ],
  },
  {
    slug: "carnes",
    nombre: "Nuestras carnes",
    nota: "Servicio de pan: 2 € por persona.",
    items: [
      ["Escalope milanesa", 1600],
      ["Carrilleras de ternera al PX", 2000],
      ["Rabo guisado", 2000],
      ["Costilla a baja temperatura agridulce", 2000],
      ["Secreto ibérico a la brasa", 1800, null, ["brasa"]],
      ["Presa ibérica", 1900],
      ["Entrecot a la brasa", 1800, null, ["brasa"]],
      ["Chuleta de ganado mayor", null, "59 € el kilo", ["brasa"]],
    ],
  },
  {
    slug: "pescados",
    nombre: "Nuestros pescados",
    items: [
      ["Bacalao", 2400],
      ["Pescado de temporada a la brasa", null, "Por encargo", ["brasa", "temporada"]],
    ],
  },
  {
    slug: "postres",
    nombre: "Postres",
    items: [
      ["Tarta de limón", 600],
      ["Pastel vasco", 600],
      ["Tarta de queso", 900],
      ["Arroz con leche", 600],
      ["Helados artesanales", 600],
    ],
  },
  {
    slug: "vinos-dulces",
    nombre: "Vinos dulces",
    items: [
      ["Finca Antigua", 300, "Moscatel"],
      ["Harveys", 400, "Pedro Ximénez"],
      ["Libamus", 400, "Mencía"],
      ["Graham's Tawny", 400, "Oporto"],
    ],
  },
];

export const DEMO_CARTA: CartaSeccion[] = [
  {
    id: "demo-desayunos",
    slug: "desayunos",
    nombre: "Desayunos y tostadas",
    nota: "Tostadas en pan de masa madre, de 9:00 a 11:30. Suplemento: 0,90 €.",
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
    ].map((t, idx) =>
      cartaItem({
        id: `demo-tostada-${idx}`,
        nombre: t.n,
        descripcion: t.d,
        precioCentimos: t.p,
        imagen: t.i ?? null,
        momento: ["desayuno"],
        estacion: "barra",
        fuente: "carta",
        ...EXTRA_TOSTADAS[t.n],
      }),
    ),
  },
  ...DESPACHO.map((sec) => ({
    id: `demo-${sec.slug}`,
    slug: sec.slug,
    nombre: sec.nombre,
    nota: sec.nota,
    items: sec.items.map(([n, p, d, etiquetas = []], idx) =>
      cartaItem({
        id: `demo-${sec.slug}-${idx}`,
        nombre: n,
        descripcion: d ?? null,
        precioCentimos: p,
        etiquetas,
        estacion: sec.slug === "vinos-dulces" ? "barra" : "cocina",
        fuente: "carta",
      }),
    ),
  })),
];

// Plato del día según opiniones publicadas por clientes (agregadas por
// menu-world.com a partir de reseñas; sin fecha exacta) y coherente con Deia
// (09/2025: plato del día a elegir entre varias opciones de lunes a viernes).
// Los platos son ejemplos que han servido otros días, no el menú de hoy.
export const DEMO_MENU_DIA: MenuDiaView = {
  fecha: null,
  precioCentimos: 890,
  incluye: ["Bebida", "Pan", "Postre"],
  actualizadoEn: null,
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
