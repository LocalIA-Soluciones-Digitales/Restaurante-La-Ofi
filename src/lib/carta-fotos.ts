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
