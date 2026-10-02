import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: string;
}

export function mainNav(locale: Locale, t: Dictionary): NavItem[] {
  return [
    { href: href(locale), label: t.nav.inicio },
    { href: href(locale, "/carta"), label: t.nav.carta },
    { href: href(locale, "/menu-del-dia"), label: t.nav.menuDelDia },
    { href: href(locale, "/espacios"), label: t.nav.espacios },
    { href: href(locale, "/empresas"), label: t.nav.empresas },
    { href: href(locale, "/eventos"), label: t.nav.eventos },
    { href: href(locale, "/galeria"), label: t.nav.galeria },
    { href: href(locale, "/contacto"), label: t.nav.contacto },
  ];
}
