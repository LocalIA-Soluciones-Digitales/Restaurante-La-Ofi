import type { StaticImageData } from "next/image";
import { FOTOS_PLANTILLA } from "@/lib/env";
import { PLANTILLA, PLANTILLA_CROPS, PLANTILLA_FOCUS } from "@/lib/images-plantilla";
// Fotos profesionales del local entregadas por el restaurante (2026-10-17): scripts/fotos-local.py
import barraMesasAltas from "../../public/images/local/pro/barra-mesas-altas.webp";
import barraMesasAltasM from "../../public/images/local/pro/barra-mesas-altas-m.webp";
import barraNeon from "../../public/images/local/pro/barra-neon.webp";
import barraNeonM from "../../public/images/local/pro/barra-neon-m.webp";
import comedor from "../../public/images/local/pro/comedor.webp";
import comedorM from "../../public/images/local/pro/comedor-m.webp";
import despacho from "../../public/images/local/pro/despacho.webp";
import despachoM from "../../public/images/local/pro/despacho-m.webp";
import despachoRotulo from "../../public/images/local/pro/despacho-rotulo.webp";
import fachadaCarpa from "../../public/images/local/pro/fachada-carpa.webp";
import fachadaCarpaM from "../../public/images/local/pro/fachada-carpa-m.webp";
import furgoneta from "../../public/images/local/pro/furgoneta.webp";
import lounge from "../../public/images/local/pro/lounge-vinoteca.webp";
import loungeM from "../../public/images/local/pro/lounge-vinoteca-m.webp";
import rotuloAguila from "../../public/images/local/pro/rotulo-aguila.webp";
import terraza from "../../public/images/local/pro/terraza.webp";
import terrazaM from "../../public/images/local/pro/terraza-m.webp";
// Mejoradas con IA (Gemini) a partir de las fotos reales: scripts/fotos-ia.py
import pulpo from "../../public/images/ia/pulpo.webp";
import salon from "../../public/images/ia/salon.webp";
import salonM from "../../public/images/ia/salon-m.webp";
import terrazaNoche from "../../public/images/ia/terraza-noche.webp";
import terrazaNocheM from "../../public/images/ia/terraza-noche-m.webp";
import tostadaBonita from "../../public/images/ia/tostada-bonita.webp";
import tostadaBurrata from "../../public/images/ia/tostada-burrata.webp";
// Reveladas a partir de las originales (sin IA): scripts/editar-fotos.py
import cartaTostadas from "../../public/images/ed/carta-tostadas-desayuno.webp";
import tostadaRevuelta from "../../public/images/ed/tostada-revuelta.webp";
import tostadaRevueltaM from "../../public/images/ed/tostada-revuelta-m.webp";
import tostadaSalmon from "../../public/images/ed/tostada-salmon.webp";
import tostadaSalmonM from "../../public/images/ed/tostada-salmon-m.webp";
import mapa from "../../public/images/local/mapa-la-ofi-osm.webp";

// Procedencia completa de cada archivo en IMAGES_SOURCES.md.
// oficial = publicada por el propio restaurante (Instagram / Google Business), uso autorizado (2026-10-01).
// tercero = prensa o directorio, SOLO DEMO: sustituir antes de producción.
// ilustrativa = stock de plantilla (Unsplash), no es La Ofi (images-plantilla.ts).
// `ia: true` = la misma foto real, mejorada con IA (resolución, luz y encuadre).
export type ImageKind = "oficial" | "tercero" | "generada" | "ilustrativa";

export interface SiteImage {
  src: StaticImageData;
  alt: string;
  kind: ImageKind;
  credit: string;
  ia?: boolean;
  /** Pie propio cuando la procedencia necesita más precisión (p. ej. escena recreada). */
  pie?: string;
}

/** Fotos reales del restaurante (o de su entorno). La galería usa siempre estas. */
export const IMAGES_REALES = {
  comedorRatan: {
    src: comedor,
    alt: "Comedor de La Ofi con lámparas de ratán, mesas puestas, suelo de baldosa hexagonal y ventanales al Parque",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  comedorPanoramica: {
    src: lounge,
    alt: "Interior de La Ofi: sillones junto a los ventanales, la vinoteca de rejilla en el centro y, al fondo, el comedor de las lámparas de ratán",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  despacho: {
    src: despacho,
    alt: "El Despacho de La Ofi: mesas puestas con copas, paneles de luz cálida en las paredes y, al fondo, la pared de madera con el rótulo y los vinos",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  despachoRotulo: {
    src: despachoRotulo,
    alt: "Pared de madera de El Despacho con el rótulo «El Despacho de la ofi», cajas de vino iluminadas y la vinoteca",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  salonNoche: {
    src: salon,
    alt: "Salón de La Ofi de noche durante una celebración, con bombillas colgadas de cuerdas y mesas vestidas",
    kind: "oficial",
    credit: "Restaurante La Ofi (Google)",
    ia: true,
  },
  cartaTostadas: {
    src: cartaTostadas,
    alt: "Carta de tostadas del desayuno de La Ofi sobre una mesa de madera",
    kind: "oficial",
    credit: "@laofiparke",
  },
  pulpoBrasa: {
    src: pulpo,
    alt: "Pulpo a la brasa con patata cocida y pimentón en plato de cerámica",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
    ia: true,
  },
  tostadaBonita: {
    src: tostadaBonita,
    alt: "Tostada de pan de masa madre con aguacate laminado y tortilla francesa de bonito",
    kind: "oficial",
    credit: "@laofiparke",
    ia: true,
  },
  tostadaRevuelta: {
    src: tostadaRevuelta,
    alt: "Tostada de pan de masa madre con huevo revuelto, queso cottage y jamón ibérico",
    kind: "oficial",
    credit: "@laofiparke",
  },
  tostadaSalmon: {
    src: tostadaSalmon,
    alt: "Tostada de salmón con queso crema y sésamo",
    kind: "oficial",
    credit: "@laofiparke",
  },
  tostadaBurrata: {
    src: tostadaBurrata,
    alt: "Tostada con burrata, melocotón a la plancha y jamón ibérico",
    kind: "oficial",
    credit: "@laofiparke",
    ia: true,
  },
  barra: {
    src: barraNeon,
    alt: "Barra de La Ofi con el rótulo de neón «la ofi», la cafetera y el frontal de listones de madera",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  barraMesasAltas: {
    src: barraMesasAltas,
    alt: "Zona de mesas altas junto a la barra, con bombillas colgadas de cuerdas, jardín vertical y ventanales",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  terraza: {
    src: terraza,
    alt: "Terraza cubierta de La Ofi bajo la carpa, con mesas de madera y sillas azules frente a la fachada acristalada",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  rotuloAguila: {
    src: rotuloAguila,
    alt: "Rótulo redondo «El Águila · la ofi» colgado junto a lámparas de globo, delante de los ventanales",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  furgoneta: {
    src: furgoneta,
    alt: "Furgoneta blanca de La Ofi aparcada frente al local, junto a la carpa de la terraza",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  terrazaNoche: {
    src: terrazaNoche,
    alt: "Fachada acristalada de La Ofi al anochecer con la terraza de césped y sofás",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
    ia: true,
  },
  rotuloNeon: {
    src: barraNeon,
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y la cafetera",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  terrazaCarpa: {
    src: fachadaCarpa,
    alt: "Fachada de La Ofi con la terraza cubierta por la carpa tensada y la barandilla de acero",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  // Papeles de la plantilla sin foto real propia: muestran la real más cercana.
  pintxosBarra: {
    src: barraNeon,
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y la cafetera",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  brasaParrilla: {
    src: pulpo,
    alt: "Pulpo a la brasa con patata cocida y pimentón en plato de cerámica",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
    ia: true,
  },
  brasaCarne: {
    src: pulpo,
    alt: "Pulpo a la brasa con patata cocida y pimentón en plato de cerámica",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
    ia: true,
  },
  cafeLatte: {
    src: barraNeon,
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y la cafetera",
    kind: "oficial",
    credit: "Restaurante La Ofi",
  },
  mapa: {
    src: mapa,
    alt: "Mapa del Parque Tecnológico con la ubicación de La Ofi en Ibaizabal bidea, edificio 502",
    kind: "generada",
    credit: "© OpenStreetMap contributors",
  },
} satisfies Record<string, SiteImage>;

export type ImageKey = keyof typeof IMAGES_REALES;

/** Fotos que pinta la web: las reales o, con FOTOS_PLANTILLA, las de plantilla donde las hay. */
export const IMAGES: Record<ImageKey, SiteImage> = FOTOS_PLANTILLA ? { ...IMAGES_REALES, ...PLANTILLA } : IMAGES_REALES;

/**
 * Punto focal de las fotos de plato (4:5): el plato está en la mitad de abajo y
 * arriba quedan copa y comedor. Cuando hay que recortarlas (cuadrado, horizontal),
 * se encuadra el plato en vez del centro.
 */
export function encuadrePlato(src: string): string {
  return src.startsWith("/images/carta/platos/") ? "object-[50%_68%]" : "";
}

/** true si la foto de un plato (por URL) es de plantilla, no del restaurante. */
export function esIlustrativa(src: string): boolean {
  // Fotos de plato recreadas con IA (src/lib/carta-fichas.ts).
  if (src.startsWith("/images/carta/platos/")) return true;
  return Object.values(IMAGES).some((v) => v.src.src === src && v.kind === "ilustrativa");
}

/** Pie de foto obligatorio según procedencia (null = foto propia sin retocar con IA, sin pie). */
export function creditoFoto(img: SiteImage): string | null {
  if (img.pie) return img.pie;
  if (img.kind === "ilustrativa") return "Imagen ilustrativa";
  const ia = img.ia ? "mejorada con IA" : null;
  if (img.kind === "tercero") return [`Foto: ${img.credit}`, ia].filter(Boolean).join(" · ");
  return ia ? `Foto ${ia}` : null;
}

// --- Dirección de arte responsive ------------------------------------------
// Recorte 4:5 para móvil de las fotos horizontales (las verticales ya son 4:5) y
// punto focal para object-position cuando la foto se recorta en CSS.

const MOBILE_CROPS_REALES: Partial<Record<ImageKey, StaticImageData>> = {
  comedorRatan: comedorM,
  comedorPanoramica: loungeM,
  despacho: despachoM,
  salonNoche: salonM,
  tostadaRevuelta: tostadaRevueltaM,
  tostadaSalmon: tostadaSalmonM,
  barra: barraNeonM,
  barraMesasAltas: barraMesasAltasM,
  rotuloNeon: barraNeonM,
  pintxosBarra: barraNeonM,
  cafeLatte: barraNeonM,
  terraza: terrazaM,
  terrazaCarpa: fachadaCarpaM,
  terrazaNoche: terrazaNocheM,
};

/** Punto focal (object-position) de cada foto: lo que no debe perderse al recortar. */
const FOCUS_REALES: Partial<Record<ImageKey, string>> = {
  comedorRatan: "56% 50%",
  comedorPanoramica: "55% 50%",
  despacho: "50% 50%",
  despachoRotulo: "55% 45%",
  barraMesasAltas: "45% 50%",
  terraza: "50% 55%",
  rotuloAguila: "45% 45%",
  furgoneta: "55% 55%",
  salonNoche: "55% 45%",
  pulpoBrasa: "50% 50%",
  tostadaBonita: "50% 62%",
  tostadaRevuelta: "55% 55%",
  tostadaSalmon: "45% 50%",
  tostadaBurrata: "50% 58%",
  barra: "52% 45%",
  rotuloNeon: "52% 40%",
  pintxosBarra: "52% 45%",
  cafeLatte: "55% 45%",
  terrazaNoche: "55% 55%",
  terrazaCarpa: "55% 50%",
  cartaTostadas: "45% 50%",
};

export const MOBILE_CROPS: Partial<Record<ImageKey, StaticImageData>> = FOTOS_PLANTILLA
  ? { ...MOBILE_CROPS_REALES, ...PLANTILLA_CROPS }
  : MOBILE_CROPS_REALES;
export const FOCUS: Partial<Record<ImageKey, string>> = FOTOS_PLANTILLA ? { ...FOCUS_REALES, ...PLANTILLA_FOCUS } : FOCUS_REALES;

/** Clave de una foto propia a partir de su URL (para recuperar foco y recorte). */
export function imageKeyBySrc(src: string): ImageKey | null {
  const entry =
    (Object.entries(IMAGES) as [ImageKey, SiteImage][]).find(([, v]) => v.src.src === src) ??
    (Object.entries(IMAGES_REALES) as [ImageKey, SiteImage][]).find(([, v]) => v.src.src === src);
  return entry ? entry[0] : null;
}
