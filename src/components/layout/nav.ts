import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: string;
  /** Rutas que también marcan la casilla como activa (además de `href`). */
  match?: string[];
}

/** Todas las páginas públicas (menú móvil y pie). */
export function mainNav(locale: Locale, t: Dictionary): NavItem[] {
  return [
    { href: href(locale), label: t.nav.inicio },
    cartaYMenu(locale, t),
    { href: href(locale, "/pedir"), label: t.nav.pedirRecoger },
    { href: href(locale, "/espacios"), label: t.nav.espacios },
    { href: href(locale, "/grupos"), label: t.nav.grupos },
    { href: href(locale, "/eventos"), label: t.nav.eventos },
    { href: href(locale, "/galeria"), label: t.nav.galeria },
    { href: href(locale, "/contacto"), label: t.nav.contacto },
  ];
}

/**
 * Enlaces de la cabecera de escritorio: solo lo que de verdad busca quien entra.
 * Menú del día y carta comparten una sola entrada: /menu-del-dia muestra lo de
 * hoy arriba y la carta completa debajo. El resto de páginas vive en el menú
 * desplegable.
 */
export function primaryNav(locale: Locale, t: Dictionary): NavItem[] {
  return [
    cartaYMenu(locale, t),
    { href: href(locale, "/espacios"), label: t.nav.espacios },
    { href: href(locale, "/grupos"), label: t.nav.grupos },
    { href: href(locale, "/eventos"), label: t.nav.eventos },
  ];
}

/** Menú del día y carta: una sola entrada en toda la navegación. */
export function cartaYMenu(locale: Locale, t: Dictionary): NavItem {
  return {
    href: href(locale, "/menu-del-dia"),
    label: t.nav.cartaYMenu,
    match: [href(locale, "/menu-del-dia"), href(locale, "/carta")],
  };
}
