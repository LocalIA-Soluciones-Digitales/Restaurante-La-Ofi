import type { CartaSeccion } from "@/lib/restaurant/types";

// La carta de vinos: lo que usan a la vez las páginas (servidor) y la carta con buscador (cliente).

/** Secciones de vino de la carta (vinos-blancos, vinos-tintos, cavas-champagnes…): van en la carta de vinos. */
export const esSeccionDeVino = (s: Pick<CartaSeccion, "slug">) => /^(vinos|cavas)-/.test(s.slug);

/** Cada tipo con su título, el color del vino y una línea de para qué es, como en una carta impresa. */
export const TIPO: Record<string, { titulo: string; color: string; nota: string }> = {
  "vinos-tintos": { titulo: "Tintos", color: "#7A2635", nota: "Con cuerpo, para la brasa y las carnes." },
  "vinos-blancos": { titulo: "Blancos", color: "#D9C27A", nota: "Frescos y aromáticos: para el pescado, las tostadas y el aperitivo." },
  "vinos-rosados": { titulo: "Rosados", color: "#E39A93", nota: "Ligeros y afrutados, para la terraza." },
  "cavas-champagnes": { titulo: "Espumosos", color: "#D8C9A0", nota: "Cavas y champagnes para brindar." },
  "vinos-dulces": { titulo: "Dulces y generosos", color: "#B5752E", nota: "Para el postre y la sobremesa." },
};
export const tipo = (s: CartaSeccion) => TIPO[s.slug] ?? { titulo: s.nombre, color: "#B08A55", nota: "" };

/** Los dulces y generosos se sirven por copa: su precio es por copa y no se encargan para llevar. */
export const SECCIONES_POR_COPA = ["vinos-dulces"];
export const esPorCopa = (s: Pick<CartaSeccion, "slug">) => SECCIONES_POR_COPA.includes(s.slug);
export const precioPor = (s: Pick<CartaSeccion, "slug">) => (esPorCopa(s) ? "Precio por copa" : "Precio por botella");

/** Lo que es la bodega, sin contar referencias: cambia con la carta. */
export const TEXTO_BODEGA =
  "Una selección de distintas denominaciones y variedades: de los tintos de Rioja, Ribera y Toro a los blancos de Rueda, el txakoli y los cavas y champagnes. Precio por botella; pregúntanos por los vinos por copa.";

/** Tintos primero, luego blancos, rosados, espumosos y dulces. */
export const ORDEN = ["vinos-tintos", "vinos-blancos", "vinos-rosados", "cavas-champagnes", "vinos-dulces"];
export const ordenar = (secciones: CartaSeccion[]) =>
  secciones.filter((s) => s.items.length > 0).sort((a, b) => (ORDEN.indexOf(a.slug) + 1 || 99) - (ORDEN.indexOf(b.slug) + 1 || 99));
