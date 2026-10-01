// Flags públicas de entorno. Se leen con acceso literal a process.env para que
// Next.js las sustituya en build (las NEXT_PUBLIC_* se incrustan en el bundle).

/** Modo demo: noindex, robots bloqueado y sitemap vacío. Solo "false" lo desactiva,
 * así que un despliegue sin configurar nunca se indexa por accidente. */
export const IS_DEMO = process.env.NEXT_PUBLIC_IS_DEMO !== "false";

/** Muestra contenido de ejemplo (marcado "Ejemplo") cuando no hay datos reales. */
export const SHOW_DEMO_CONTENT = process.env.NEXT_PUBLIC_SHOW_DEMO_CONTENT === "true";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
