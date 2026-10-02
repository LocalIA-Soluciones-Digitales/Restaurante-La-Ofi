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
  { seccion: "desayunos", nombre: "salmon", img: "tostadaSalmon" },
  { seccion: "para-picotear", nombre: "pulpo a la parrilla", img: "pulpoBrasa" },
];

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function conFoto(item: CartaItem, seccion: string): CartaItem {
  if (item.imagen) return item;
  const f = FOTOS_DE_PLATO.find((x) => x.seccion === seccion && x.nombre === normalizar(item.nombre));
  if (!f) return item;
  const imagen = { src: IMAGES[f.img].src.src, alt: IMAGES[f.img].alt };
  return { ...item, imagen, imagenes: [imagen, ...item.imagenes] };
}

/** Completa con su foto real los platos de la carta que la tienen en el sitio. */
export function conFotosDePlato(secciones: CartaSeccion[]): CartaSeccion[] {
  return secciones.map((s) => ({ ...s, items: s.items.map((i) => conFoto(i, s.slug)) }));
}

/** Orden de las fotos de plato por calidad (la mejor abre la sección de la home). */
export const PRIORIDAD_FOTO: ImageKey[] = ["tostadaBurrata", "pulpoBrasa", "tostadaBonita", "tostadaSalmon", "tostadaRevuelta"];
