// Flags públicas de entorno. Se leen con acceso literal a process.env para que
// Next.js las sustituya en build (las NEXT_PUBLIC_* se incrustan en el bundle).

/** Modo demo: noindex, robots bloqueado y sitemap vacío. Solo "false" lo desactiva,
 * así que un despliegue sin configurar nunca se indexa por accidente. */
export const IS_DEMO = process.env.NEXT_PUBLIC_IS_DEMO !== "false";

/** Muestra contenido de ejemplo (marcado "Ejemplo") cuando no hay datos reales. */
export const SHOW_DEMO_CONTENT = process.env.NEXT_PUBLIC_SHOW_DEMO_CONTENT === "true";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Fotos de plantilla (stock de Unsplash, marcadas "Imagen ilustrativa") en lugar de
 * las fotos reales de baja calidad, hasta tener fotos profesionales del local. Solo
 * "false" las apaga (src/lib/images-plantilla.ts, IMAGES_SOURCES.md). */
export const FOTOS_PLANTILLA = process.env.NEXT_PUBLIC_FOTOS_PLANTILLA !== "false";
