import { normalizarNombre } from "@/lib/carta-fotos";
import type { CartaItem, CartaSeccion, ImagenRef } from "@/lib/restaurant/types";

// Ficha de cada plato de la carta oficial (septiembre de 2026): foto, ingredientes
// y valores nutricionales ORIENTATIVOS.
//  - Fotos: recreaciones generadas con Gemini a partir de fotos reales del local
//    (public/images/platos), recortadas en cuadrado centradas en el plato.
//    La web las marca como "Imagen ilustrativa".
//  - Ingredientes: los que dicen la carta y la receta tradicional del plato.
//  - Nutrición: estimación por ración estándar con tablas de composición de
//    alimentos (fuente "estimacion"; la web lo dice). Las kcal salen de los
//    macros (4/4/9) salvo en los vinos, donde cuenta el alcohol.
// Lo que el restaurante cargue desde /admin manda: la ficha solo rellena huecos.

interface Ficha {
  seccion: string;
  nombre: string;
  foto?: string;
  ingredientes: string[];
  /** Proteínas, hidratos y grasas en gramos por ración. */
  macros: [p: number, c: number, g: number];
  /** Solo si las kcal no salen de los macros (bebidas alcohólicas). */
  kcal?: number;
  racion?: string;
}

const AOVE = "Aceite de oliva virgen extra";
const PAN = "Pan de masa madre";

const FICHAS: Ficha[] = [
  // Desayunos
  { seccion: "desayunos", nombre: "Clásica", foto: "clasica", ingredientes: [PAN, "A elegir: mermelada, mantequilla, aceite o tomate"], macros: [7, 40, 8] },
  { seccion: "desayunos", nombre: "Ibérico", foto: "iberico", ingredientes: [PAN, "Tomate rallado", AOVE, "Jamón ibérico"], macros: [17, 41, 11] },
  { seccion: "desayunos", nombre: "Aguacate", foto: "aguacate", ingredientes: [PAN, "Aguacate", "Tomate", "Jamón ibérico", AOVE], macros: [16, 44, 20] },
  { seccion: "desayunos", nombre: "Salmón", ingredientes: [PAN, "Salmón ahumado", "Queso crema", "Sésamo"], macros: [20, 42, 17] },
  { seccion: "desayunos", nombre: "Burrata", ingredientes: [PAN, "Burrata", "Melocotón a la plancha", "Jamón ibérico", AOVE], macros: [20, 46, 24] },
  { seccion: "desayunos", nombre: "Revuelta", ingredientes: [PAN, "Queso cottage", "Huevo revuelto", "Jamón ibérico"], macros: [27, 40, 20] },
  { seccion: "desayunos", nombre: "Bonita", ingredientes: [PAN, "Tortilla francesa", "Bonito", "Aguacate"], macros: [24, 40, 19] },
  { seccion: "desayunos", nombre: "Americana", foto: "americana", ingredientes: [PAN, "Bacon", "Huevo frito"], macros: [22, 40, 26] },
  { seccion: "desayunos", nombre: "Bowl de yogur", foto: "bowl-yogur", ingredientes: ["Yogur natural", "Muesli", "Miel", "Fruta tropical de temporada"], macros: [12, 52, 9] },

  // Entrantes
  { seccion: "entrantes", nombre: "Cecina de Angus", foto: "cecina", ingredientes: ["Cecina de vacuno Angus", AOVE, "Sal en escamas"], macros: [32, 1, 8], racion: "ración para compartir" },
  { seccion: "entrantes", nombre: "Tabla de ibérico", ingredientes: ["Jamón ibérico", "Lomo ibérico", "Chorizo ibérico", "Salchichón ibérico", "Picos de pan"], macros: [52, 15, 60], racion: "ración para compartir" },
  { seccion: "entrantes", nombre: "Paletilla ibérica", foto: "paletilla", ingredientes: ["Paletilla ibérica cortada a cuchillo"], macros: [30, 0, 20], racion: "ración para compartir" },
  { seccion: "entrantes", nombre: "Queso de la casa", foto: "queso", ingredientes: ["Queso curado de oveja", AOVE], macros: [38, 1, 50], racion: "ración para compartir" },
  { seccion: "entrantes", nombre: "Anchoas 00", foto: "anchoas", ingredientes: ["Anchoas del Cantábrico (Casa Santoña)", "Aceite de oliva"], macros: [14, 0, 10] },
  { seccion: "entrantes", nombre: "Gambas al ajillo", foto: "gambas-ajillo", ingredientes: ["Gambas", "Ajo", "Guindilla", AOVE], macros: [30, 3, 30] },
  { seccion: "entrantes", nombre: "Croquetas de la casa", foto: "croquetas", ingredientes: ["Jamón", "Leche", "Harina de trigo", "Mantequilla", "Huevo", "Pan rallado"], macros: [3, 9, 6], racion: "unidad" },

  // Entrantes a la brasa
  { seccion: "entrantes-brasa", nombre: "Puerros con salsa de hongos", foto: "puerros", ingredientes: ["Puerro a la brasa", "Salsa de hongos", AOVE], macros: [6, 22, 18] },
  { seccion: "entrantes-brasa", nombre: "Espárragos sobre mahonesa de aguacate", ingredientes: ["Espárrago verde a la brasa", "Mahonesa de aguacate", "Sal en escamas"], macros: [7, 10, 28] },
  { seccion: "entrantes-brasa", nombre: "Pulpo", foto: "pulpo", ingredientes: ["Pulpo a la brasa", "Patata cocida", "Pimentón", AOVE, "Sal gruesa"], macros: [38, 35, 22] },
  { seccion: "entrantes-brasa", nombre: "Morcilla de Burgos con pimientos asados", foto: "morcilla-burgos", ingredientes: ["Morcilla de Burgos (con arroz)", "Pimiento rojo asado", "Aceite de oliva"], macros: [18, 30, 32] },
  { seccion: "entrantes-brasa", nombre: "Morcilla de puerro de Zamudio", foto: "morcilla-zamudio", ingredientes: ["Morcilla de puerro de Zamudio a la brasa"], macros: [16, 14, 34] },
  { seccion: "entrantes-brasa", nombre: "Flor de alcachofa con papada ibérica y huevo", foto: "alcachofa", ingredientes: ["Alcachofa a la brasa", "Papada ibérica", "Huevo", AOVE], macros: [16, 12, 30] },

  // Ensaladas
  { seccion: "ensaladas", nombre: "Ensalada de la casa", foto: "ensalada-casa", ingredientes: ["Mezclum", "Tartar de tomate", "Aguacate", AOVE], macros: [4, 12, 24] },
  { seccion: "ensaladas", nombre: "Ensalada de burrata", foto: "ensalada-burrata", ingredientes: ["Burrata", "Lechugas variadas", "Tomate", AOVE], macros: [20, 10, 34] },
  { seccion: "ensaladas", nombre: "Ensalada de ventresca con pimientos asados", foto: "ensalada-ventresca", ingredientes: ["Ventresca de bonito", "Pimiento rojo asado", "Cebolleta", "Aceite de oliva"], macros: [28, 14, 30] },
  { seccion: "ensaladas", nombre: "Bol de lechuga y cebolla", foto: "bol-lechuga", ingredientes: ["Lechuga", "Cebolla", "Aceite de oliva", "Vinagre"], macros: [2, 8, 10] },
  { seccion: "ensaladas", nombre: "Bol de tomate, lechuga y cebolla", foto: "bol-tomate", ingredientes: ["Lechuga", "Tomate", "Cebolla", "Aceite de oliva", "Vinagre"], macros: [3, 12, 10] },

  // Carnes
  { seccion: "carnes", nombre: "Escalope milanesa", foto: "escalope", ingredientes: ["Ternera", "Pan rallado", "Huevo", "Harina de trigo", "Patatas fritas", "Limón"], macros: [45, 70, 45] },
  { seccion: "carnes", nombre: "Carrilleras de ternera al PX", foto: "carrilleras", ingredientes: ["Carrillera de ternera", "Salsa de Pedro Ximénez", "Puré de patata"], macros: [45, 35, 30] },
  { seccion: "carnes", nombre: "Rabo guisado", foto: "rabo", ingredientes: ["Rabo de vacuno", "Vino tinto", "Verduras del guiso", "Patatas fritas"], macros: [42, 30, 40] },
  { seccion: "carnes", nombre: "Costilla a baja temperatura agridulce", foto: "costilla", ingredientes: ["Costilla de cerdo a baja temperatura", "Salsa agridulce"], macros: [38, 25, 45] },
  { seccion: "carnes", nombre: "Secreto ibérico a la brasa", foto: "secreto", ingredientes: ["Secreto ibérico", "Sal en escamas", "Patatas fritas"], macros: [32, 35, 42] },
  { seccion: "carnes", nombre: "Presa ibérica", foto: "presa", ingredientes: ["Presa ibérica", "Sal en escamas"], macros: [34, 0, 28] },
  { seccion: "carnes", nombre: "Entrecot a la brasa", foto: "entrecot", ingredientes: ["Entrecot de vacuno", "Pimientos verdes", "Sal en escamas"], macros: [50, 4, 32] },
  { seccion: "carnes", nombre: "Chuleta de ganado mayor", foto: "chuleta", ingredientes: ["Chuleta de vacuno mayor a la brasa", "Sal en escamas"], macros: [110, 0, 100], racion: "500 g" },

  // Pescados
  { seccion: "pescados", nombre: "Bacalao", foto: "bacalao", ingredientes: ["Lomo de bacalao", "Pil-pil (aceite de oliva y ajo)"], macros: [40, 4, 25] },
  { seccion: "pescados", nombre: "Pescado de temporada a la brasa", foto: "pescado-temporada", ingredientes: ["Pescado de temporada", "Refrito de ajo", AOVE, "Vinagre"], macros: [45, 2, 22], racion: "ración de 300 g" },

  // Postres
  { seccion: "postres", nombre: "Tarta de limón", foto: "tarta-limon", ingredientes: ["Masa quebrada", "Crema de limón", "Merengue", "Huevo", "Mantequilla", "Azúcar"], macros: [5, 50, 18] },
  { seccion: "postres", nombre: "Pastel vasco", foto: "pastel-vasco", ingredientes: ["Harina de trigo", "Mantequilla", "Huevo", "Azúcar", "Crema pastelera"], macros: [6, 48, 20] },
  { seccion: "postres", nombre: "Tarta de queso", foto: "tarta-queso", ingredientes: ["Queso crema", "Nata", "Huevo", "Azúcar"], macros: [9, 30, 30] },
  { seccion: "postres", nombre: "Arroz con leche", foto: "arroz-con-leche", ingredientes: ["Arroz", "Leche", "Azúcar", "Canela", "Limón"], macros: [8, 48, 8] },
  { seccion: "postres", nombre: "Helados artesanales", foto: "helados", ingredientes: ["Helado artesanal (sabores del día)"], macros: [5, 30, 12] },

  // Vinos dulces (copa de 7 cl)
  { seccion: "vinos-dulces", nombre: "Finca Antigua", foto: "finca-antigua", ingredientes: ["Uva moscatel"], macros: [0, 12, 0], kcal: 110, racion: "copa de 7 cl" },
  { seccion: "vinos-dulces", nombre: "Harveys", foto: "harveys", ingredientes: ["Uva Pedro Ximénez"], macros: [0, 25, 0], kcal: 150, racion: "copa de 7 cl" },
  { seccion: "vinos-dulces", nombre: "Libamus", foto: "libamus", ingredientes: ["Uva mencía"], macros: [0, 10, 0], kcal: 100, racion: "copa de 7 cl" },
  { seccion: "vinos-dulces", nombre: "Graham's Tawny", foto: "grahams-tawny", ingredientes: ["Variedades tintas del Duero (oporto tawny)"], macros: [0, 8, 0], kcal: 110, racion: "copa de 7 cl" },
];

const POR_CLAVE = new Map(FICHAS.map((f) => [`${f.seccion}|${normalizarNombre(f.nombre)}`, f]));

export function fichaDe(seccion: string, nombre: string): Ficha | undefined {
  return POR_CLAVE.get(`${seccion}|${normalizarNombre(nombre)}`);
}

export function fotoDeFicha(f: Ficha): ImagenRef | null {
  return f.foto ? { src: `/images/platos/${f.foto}.webp`, alt: `${f.nombre} en El Despacho de La Ofi` } : null;
}

/** kcal redondeadas a la decena: es una estimación, no una medida. */
export function kcalDeFicha(f: Ficha): number {
  const [p, c, g] = f.macros;
  return f.kcal ?? Math.round((p * 4 + c * 4 + g * 9) / 10) * 10;
}

function conFicha(item: CartaItem, seccion: string): CartaItem {
  const f = fichaDe(seccion, item.nombre);
  if (!f) return item;
  const foto = item.imagen ? null : fotoDeFicha(f);
  const [p, c, g] = f.macros;
  return {
    ...item,
    imagen: item.imagen ?? foto,
    imagenes: foto ? [foto, ...item.imagenes] : item.imagenes,
    ingredientes: item.ingredientes.length > 0 ? item.ingredientes : f.ingredientes,
    nutricion: item.nutricion ?? { calorias: kcalDeFicha(f), proteinas: p, carbohidratos: c, grasas: g, fuente: "estimacion", racion: f.racion },
  };
}

/** Completa cada plato con su ficha (foto, ingredientes, nutrición) donde falte. */
export function conFichas(secciones: CartaSeccion[]): CartaSeccion[] {
  return secciones.map((s) => ({ ...s, items: s.items.map((i) => conFicha(i, s.slug)) }));
}

export const FOTOS_FICHA = FICHAS.filter((f) => f.foto).map((f) => f.foto!);
