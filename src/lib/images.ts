import type { StaticImageData } from "next/image";
import { FOTOS_PLANTILLA } from "@/lib/env";
import { PLANTILLA, PLANTILLA_CROPS, PLANTILLA_FOCUS } from "@/lib/images-plantilla";
import comedorRatan from "../../public/images/ed/comedor-ratan-avdg.webp";
import salonNoche from "../../public/images/ed/salon-celebracion-noche.webp";
import cartaTostadas from "../../public/images/ed/carta-tostadas-desayuno.webp";
import pulpoBrasa from "../../public/images/ed/pulpo-brasa-deia.webp";
import tostadaBonita from "../../public/images/ed/tostada-bonita.webp";
import tostadaRevuelta from "../../public/images/ed/tostada-revuelta.webp";
import tostadaSalmon from "../../public/images/ed/tostada-salmon.webp";
import tostadaBurrata from "../../public/images/ed/tostada-burrata.webp";
import barra from "../../public/images/ed/barra-deia.webp";
import terrazaNoche from "../../public/images/ed/terraza-noche-deia.webp";
import rotuloNeon from "../../public/images/ed/rotulo-neon-rg.webp";
import terrazaCarpa from "../../public/images/ed/terraza-carpa-rg.webp";
import mapa from "../../public/images/local/mapa-la-ofi-osm.webp";
import comedorRatanM from "../../public/images/ed/comedor-ratan-avdg-m.webp";
import salonNocheM from "../../public/images/ed/salon-celebracion-noche-m.webp";
import pulpoBrasaM from "../../public/images/ed/pulpo-brasa-deia-m.webp";
import tostadaBonitaM from "../../public/images/ed/tostada-bonita-m.webp";
import tostadaRevueltaM from "../../public/images/ed/tostada-revuelta-m.webp";
import tostadaSalmonM from "../../public/images/ed/tostada-salmon-m.webp";
import tostadaBurrataM from "../../public/images/ed/tostada-burrata-m.webp";
import barraM from "../../public/images/ed/barra-deia-m.webp";
import terrazaNocheM from "../../public/images/ed/terraza-noche-deia-m.webp";
import rotuloNeonM from "../../public/images/ed/rotulo-neon-rg-m.webp";

// Procedencia completa de cada archivo en IMAGES_SOURCES.md.
// oficial = publicada por el propio restaurante (Instagram / Google Business), uso autorizado (2026-10-01).
// tercero = prensa o directorio, SOLO DEMO: sustituir antes de producción.
// ilustrativa = stock de plantilla (Unsplash), no es La Ofi (images-plantilla.ts).
export type ImageKind = "oficial" | "tercero" | "generada" | "ilustrativa";

export interface SiteImage {
  src: StaticImageData;
  alt: string;
  kind: ImageKind;
  credit: string;
}

/** Fotos reales del restaurante (o de su entorno). La galería usa siempre estas. */
export const IMAGES_REALES = {
  comedorRatan: {
    src: comedorRatan,
    alt: "Comedor de La Ofi con grandes lámparas de ratán, mesas de madera y suelo de baldosa hexagonal, junto a ventanales",
    kind: "tercero",
    credit: "Academia Vasca de Gastronomía",
  },
  salonNoche: {
    src: salonNoche,
    alt: "Salón de La Ofi de noche durante una celebración, con bombillas colgadas de cuerdas y mesas vestidas",
    kind: "oficial",
    credit: "Restaurante La Ofi (Google)",
  },
  cartaTostadas: {
    src: cartaTostadas,
    alt: "Carta de tostadas del desayuno de La Ofi sobre una mesa de madera",
    kind: "oficial",
    credit: "@laofiparke",
  },
  pulpoBrasa: {
    src: pulpoBrasa,
    alt: "Pulpo a la brasa con patata cocida y pimentón",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  tostadaBonita: {
    src: tostadaBonita,
    alt: "Tostada de pan de masa madre con aguacate laminado y tortilla francesa de bonito",
    kind: "oficial",
    credit: "@laofiparke",
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
  },
  barra: {
    src: barra,
    alt: "Barra de La Ofi con frontal de listones de madera, rótulo luminoso y mesas altas",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  terrazaNoche: {
    src: terrazaNoche,
    alt: "Fachada acristalada de La Ofi de noche con la terraza de césped y sofás",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  rotuloNeon: {
    src: rotuloNeon,
    alt: "Rótulo de neón «la ofi» sobre la barra, con las cafeteras",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
  },
  terrazaCarpa: {
    src: terrazaCarpa,
    alt: "Terraza cubierta con carpa e iluminación de colores al anochecer",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
  },
  // Papeles nuevos de la plantilla; sin plantilla muestran la foto real equivalente.
  pintxosBarra: {
    src: barra,
    alt: "Barra de La Ofi con frontal de listones de madera, rótulo luminoso y mesas altas",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  brasaParrilla: {
    src: pulpoBrasa,
    alt: "Pulpo a la brasa con patata cocida y pimentón",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  brasaCarne: {
    src: pulpoBrasa,
    alt: "Pulpo a la brasa con patata cocida y pimentón",
    kind: "tercero",
    credit: "Deia · Itziar Acereda",
  },
  cafeLatte: {
    src: rotuloNeon,
    alt: "Rótulo de neón «la ofi» sobre la barra, con las cafeteras",
    kind: "tercero",
    credit: "Restaurant Guru (foto de cliente)",
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

/** Pie de foto obligatorio según procedencia (null = foto propia, sin pie). */
export function creditoFoto(img: SiteImage): string | null {
  if (img.kind === "tercero") return `Foto: ${img.credit}`;
  if (img.kind === "ilustrativa") return "Imagen ilustrativa";
  return null;
}

// --- Dirección de arte responsive ------------------------------------------
// Recortes 4:5 para móvil generados por scripts/editar-fotos.py (plato o espacio
// centrado) y punto focal para object-position cuando la foto se recorta en CSS.

const MOBILE_CROPS_REALES: Partial<Record<ImageKey, StaticImageData>> = {
  comedorRatan: comedorRatanM,
  salonNoche: salonNocheM,
  pulpoBrasa: pulpoBrasaM,
  tostadaBonita: tostadaBonitaM,
  tostadaRevuelta: tostadaRevueltaM,
  tostadaSalmon: tostadaSalmonM,
  tostadaBurrata: tostadaBurrataM,
  barra: barraM,
  terrazaNoche: terrazaNocheM,
  rotuloNeon: rotuloNeonM,
};

/** Punto focal (object-position) de cada foto: lo que no debe perderse al recortar. */
const FOCUS_REALES: Partial<Record<ImageKey, string>> = {
  comedorRatan: "60% 55%",
  salonNoche: "55% 40%",
  pulpoBrasa: "48% 50%",
  tostadaBonita: "50% 60%",
  tostadaRevuelta: "55% 55%",
  tostadaSalmon: "45% 50%",
  tostadaBurrata: "52% 50%",
  barra: "40% 55%",
  terrazaNoche: "55% 60%",
  rotuloNeon: "28% 45%",
  terrazaCarpa: "50% 55%",
  cartaTostadas: "45% 50%",
};

export const MOBILE_CROPS: Partial<Record<ImageKey, StaticImageData>> = FOTOS_PLANTILLA
  ? { ...MOBILE_CROPS_REALES, ...PLANTILLA_CROPS }
  : MOBILE_CROPS_REALES;
export const FOCUS: Partial<Record<ImageKey, string>> = FOTOS_PLANTILLA ? { ...FOCUS_REALES, ...PLANTILLA_FOCUS } : FOCUS_REALES;

/** Clave de una foto propia a partir de su URL (para recuperar foco y recorte). */
export function imageKeyBySrc(src: string): ImageKey | null {
  const entry = (Object.entries(IMAGES) as [ImageKey, SiteImage][]).find(([, v]) => v.src.src === src)
    ?? (Object.entries(IMAGES_REALES) as [ImageKey, SiteImage][]).find(([, v]) => v.src.src === src);
  return entry ? entry[0] : null;
}
