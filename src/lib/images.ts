import type { StaticImageData } from "next/image";
import comedorRatan from "../../public/images/hero/comedor-ratan-avdg.webp";
import salonNoche from "../../public/images/eventos/salon-celebracion-noche.webp";
import cartaTostadas from "../../public/images/carta/carta-tostadas-desayuno.webp";
import pulpoBrasa from "../../public/images/carta/pulpo-brasa-deia.webp";
import tostadaBonita from "../../public/images/pintxos/tostada-bonita.webp";
import tostadaRevuelta from "../../public/images/pintxos/tostada-revuelta.webp";
import tostadaSalmon from "../../public/images/pintxos/tostada-salmon.webp";
import tostadaBurrata from "../../public/images/pintxos/tostada-burrata.webp";
import barra from "../../public/images/local/barra-deia.webp";
import terrazaNoche from "../../public/images/local/terraza-noche-deia.webp";
import rotuloNeon from "../../public/images/local/rotulo-neon-rg.webp";
import terrazaCarpa from "../../public/images/local/terraza-carpa-rg.webp";
import mapa from "../../public/images/local/mapa-la-ofi-osm.webp";

// Procedencia completa de cada archivo en IMAGES_SOURCES.md.
// oficial = publicada por el propio restaurante (Instagram / Google Business), uso autorizado (2026-10-01).
// tercero = prensa o directorio, SOLO DEMO: sustituir antes de producción.
export type ImageKind = "oficial" | "tercero" | "generada";

export interface SiteImage {
  src: StaticImageData;
  alt: string;
  kind: ImageKind;
  credit: string;
}

export const IMAGES = {
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
  mapa: {
    src: mapa,
    alt: "Mapa del Parque Tecnológico con la ubicación de La Ofi en Ibaizabal bidea, edificio 502",
    kind: "generada",
    credit: "© OpenStreetMap contributors",
  },
} satisfies Record<string, SiteImage>;

export type ImageKey = keyof typeof IMAGES;
