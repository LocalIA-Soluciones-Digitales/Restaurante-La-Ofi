// Estructura multi-idioma: rutas /es y /eu. V1 publica solo castellano; el
// euskera se activa añadiéndolo a ENABLED_LOCALES cuando exista una traducción
// revisada por una persona (no se publican traducciones automáticas).
export const LOCALES = ["es", "eu"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";
export const ENABLED_LOCALES: readonly Locale[] = ["es"];

export const HTML_LANG: Record<Locale, string> = { es: "es-ES", eu: "eu-ES" };

export function isEnabledLocale(value: string): value is Locale {
  return (ENABLED_LOCALES as readonly string[]).includes(value);
}

/** Ruta interna con prefijo de idioma: href("es", "/carta") → "/es/carta". */
export function href(locale: Locale, path = ""): string {
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}
