import type { StaticImageData } from "next/image";
import { FOTOS_PLANTILLA } from "@/lib/env";
import { PLANTILLA, PLANTILLA_CROPS, PLANTILLA_FOCUS } from "@/lib/images-plantilla";
// Mejoradas con IA (Gemini) a partir de las fotos reales: scripts/fotos-ia.py
import barraNeon from "../../public/images/ia/barra-neon.webp";
import barraNeonM from "../../public/images/ia/barra-neon-m.webp";
import comedor from "../../public/images/ia/comedor.webp";
import comedorM from "../../public/images/ia/comedor-m.webp";
import comedorPanoramica from "../../public/images/ia/comedor-panoramica.webp";
import comedorPanoramicaM from "../../public/images/ia/comedor-panoramica-m.webp";
import pulpo from "../../public/images/ia/pulpo.webp";
import salon from "../../public/images/ia/salon.webp";
import salonM from "../../public/images/ia/salon-m.webp";
import terrazaNoche from "../../public/images/ia/terraza-noche.webp";
import terrazaNocheM from "../../public/images/ia/terraza-noche-m.webp";
import tostadaBonita from "../../public/images/ia/tostada-bonita.webp";
import tostadaBurrata from "../../public/images/ia/tostada-burrata.webp";
// Reveladas a partir de las originales (sin IA): scripts/editar-fotos.py
import cartaTostadas from "../../public/images/ed/carta-tostadas-desayuno.webp";
import terrazaCarpa from "../../public/images/ed/terraza-carpa-rg.webp";
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
}

/** Fotos reales del restaurante (o de su entorno). La galería usa siempre estas. */
export const IMAGES_REALES = {
  comedorRatan: {
    src: comedor,
    alt: "Comedor de La Ofi con grandes lámparas de ratán, mesas de madera y suelo de baldosa hexagonal, junto a ventanales",
    kind: "tercero",
    credit: "Academia Vasca de Gastronomía",
    ia: true,
  },
  comedorPanoramica: {
    src: comedorPanoramica,
    alt: "Vista amplia del comedor de La Ofi con lámparas de ratán, techo de madera y ventanales al Parque",
    kind: "tercero",
    credit: "Academia Vasca de Gastronomía",
    ia: true,
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
    alt: "Barra de La Ofi con el rótulo de neón «la ofi», cafeteras y frontal de listones de madera",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
    ia: true,
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
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y las cafeteras",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
    ia: true,
  },
  terrazaCarpa: {
    src: terrazaCarpa,
    alt: "Terraza cubierta con carpa e iluminación de colores al anochecer",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
  },
  // Papeles de la plantilla sin foto real propia: muestran la real más cercana.
  pintxosBarra: {
    src: barraNeon,
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y las cafeteras",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
    ia: true,
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
    alt: "Barra de La Ofi con el rótulo de neón «la ofi» y las cafeteras",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
    ia: true,
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

/** true si la foto de un plato (por URL) es de plantilla, no del restaurante. */
export function esIlustrativa(src: string): boolean {
  return Object.values(IMAGES).some((v) => v.src.src === src && v.kind === "ilustrativa");
}

/** Pie de foto obligatorio según procedencia (null = foto propia sin retocar con IA, sin pie). */
export function creditoFoto(img: SiteImage): string | null {
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
  comedorPanoramica: comedorPanoramicaM,
  salonNoche: salonM,
  tostadaRevuelta: tostadaRevueltaM,
  tostadaSalmon: tostadaSalmonM,
  barra: barraNeonM,
  rotuloNeon: barraNeonM,
  terrazaNoche: terrazaNocheM,
};

/** Punto focal (object-position) de cada foto: lo que no debe perderse al recortar. */
const FOCUS_REALES: Partial<Record<ImageKey, string>> = {
  comedorRatan: "62% 50%",
  comedorPanoramica: "50% 50%",
  salonNoche: "55% 45%",
  pulpoBrasa: "50% 50%",
  tostadaBonita: "50% 62%",
  tostadaRevuelta: "55% 55%",
  tostadaSalmon: "45% 50%",
  tostadaBurrata: "50% 58%",
  barra: "32% 50%",
  rotuloNeon: "32% 50%",
  terrazaNoche: "55% 55%",
  terrazaCarpa: "50% 55%",
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
