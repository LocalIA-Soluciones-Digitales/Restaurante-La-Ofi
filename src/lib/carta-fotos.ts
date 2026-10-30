import { IMAGES, type ImageKey } from "@/lib/images";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

// Fotos REALES de platos concretos de La Ofi que ya están en el sitio (publicadas
// por el restaurante o por Deia, ver IMAGES_SOURCES.md). Se asignan solo a ese
// plato en esa sección: nunca se pone la foto de un plato a otro. Si el
// restaurante sube su propia foto desde /admin, manda la suya.
const FOTOS_DE_PLATO: { seccion: string; nombre: string; img: ImageKey }[] = [
  { seccion: "desayunos", nombre: "burrata", img: "tostadaBurrata" },
  { seccion: "desayunos", nombre: "bonita", img: "tostadaBonita" },
  { seccion: "desayunos", nombre: "revuelta", img: "tostadaRevuelta" },
  // El pulpo de La Ofi fotografiado por Deia (09/2025): carta oficial y contenido publicado.
  { seccion: "entrantes-brasa", nombre: "pulpo", img: "pulpoBrasa" },
  { seccion: "para-picotear", nombre: "pulpo a la parrilla", img: "pulpoBrasa" },
];

export const normalizarNombre = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function conFoto(item: CartaItem, seccion: string): CartaItem {
  if (item.imagen) return item;
  const f = FOTOS_DE_PLATO.find((x) => x.seccion === seccion && x.nombre === normalizarNombre(item.nombre));
  if (!f) return item;
  const imagen = { src: IMAGES[f.img].src.src, alt: IMAGES[f.img].alt };
  return { ...item, imagen, imagenes: [imagen, ...item.imagenes] };
}

/** Completa con su foto real los platos de la carta que la tienen en el sitio. */
export function conFotosDePlato(secciones: CartaSeccion[]): CartaSeccion[] {
  return secciones.map((s) => ({ ...s, items: s.items.map((i) => conFoto(i, s.slug)) }));
}

/** Orden de las fotos de plato en la home: abre la brasa (el pulpo) y siguen las tostadas. */
export const PRIORIDAD_FOTO: ImageKey[] = ["pulpoBrasa", "tostadaBurrata", "tostadaBonita", "tostadaRevuelta", "tostadaSalmon"];

/** Foto real de un plato de la carta (la suya de /admin o la del sitio), o null. */
export function fotoDePlato(seccion: string, nombre: string, propias: (string | null | undefined)[] = []): string | null {
  const suya = propias.find(Boolean);
  if (suya) return suya;
  const f = FOTOS_DE_PLATO.find((x) => x.seccion === seccion && x.nombre === normalizarNombre(nombre));
  return f ? IMAGES[f.img].src.src : null;
}

export type ClasePlato = "pescado" | "carne" | "cuchara" | "verdura" | "huevo" | "pan" | "postre" | "vino" | "cafe" | "otro";

// Por orden: lo primero que encaja manda («arroz con leche» es postre, no cuchara).
const PISTAS: [ClasePlato, RegExp][] = [
  ["postre", /\b(postre|crema catalana|tarta|pastel|flan|natilla|helado|sorbete|cuajada|arroz con leche|brownie|coulant|torrija|tiramisu|goxua|mousse|bizcocho|fruta|cheesecake|chocolate|intxaursaltsa|panchineta)/],
  ["vino", /\b(vino|vinos|cava|cavas|champagne|txakoli|rosado|tinto|crianza|reserva|albarino|verdejo|rioja|ribera)\b/],
  ["cafe", /\b(cafe|cortado|capuchino|infusion|te)\b/],
  ["huevo", /\b(huevo|huevos|tortilla|revuelto|revuelta)\b/],
  ["pescado", /\b(merluza|bacalao|atun|bonito|bonita|rape|lubina|dorada|besugo|salmon|pulpo|calamar|calamares|chipiron|chipirones|gamba|gambas|langostino|langostinos|txitxarro|pescado|pescados|anchoa|anchoas|sardina|kokotxa|kokotxas|mejillon|mejillones|almeja|almejas|rodaballo|marisco|txipiron)/],
  ["carne", /\b(ternera|carrillera|carrilleras|chuleta|chuleton|txuleta|solomillo|entrecot|cordero|cerdo|pollo|hamburguesa|secreto|presa|costilla|costillas|carne|carnes|lomo|albondiga|albondigas|rabo|pato|cachopo|filete|escalope|chorizo|jamon|morcilla|cecina|pluma|vaca|buey|ibérico|iberico)/],
  ["cuchara", /\b(alubia|alubias|lenteja|lentejas|garbanzo|garbanzos|potaje|sopa|crema|caldo|porrusalda|purrusalda|marmitako|guiso|pure|arroz|risotto|pasta|espagueti|macarrones|fideua|cocido)/],
  ["verdura", /\b(ensalada|ensaladas|verdura|verduras|menestra|vegetal|alcachofa|alcachofas|esparrago|esparragos|tomate|pimientos|burrata|guacamole|hummus|piquillo)/],
  ["pan", /\b(tostada|tostadas|pan|croissant|bocadillo|bocata|sandwich|montadito|pintxo|pintxos|desayuno|desayunos)/],
];

/** Qué tipo de plato es, por su nombre y su sección (o el grupo del menú). */
export function clasePlato(nombre: string, seccion = ""): ClasePlato {
  const s = normalizarNombre(seccion);
  if (/postre/.test(s)) return "postre";
  if (/vino|cava|champagne|bodega/.test(s)) return "vino";
  const n = normalizarNombre(nombre);
  for (const [clase, re] of PISTAS) if (re.test(n)) return clase;
  for (const [clase, re] of PISTAS) if (re.test(s)) return clase;
  return "otro";
}
