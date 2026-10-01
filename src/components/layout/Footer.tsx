import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import type { NavItem } from "@/components/layout/nav";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function Footer({ locale, items }: { locale: Locale; items: NavItem[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-marino-900 pb-28 pt-16 text-crema/80 lg:pb-12">
      <div className="container-page grid gap-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs font-display text-2xl leading-snug text-crema">{SITE.tagline}.</p>
          <a
            href={SITE.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-crema/20 px-4 py-2 text-sm text-crema transition-colors hover:bg-crema/10"
          >
            <Icon name="instagram" className="h-4 w-4" />
            {SITE.instagram.handle}
          </a>
        </div>

        <nav aria-label="Pie de página">
          <h2 className="eyebrow font-sans text-neon">Navegación</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-crema">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow font-sans text-neon">Dónde estamos</h2>
          <address className="mt-4 grid gap-3 text-sm not-italic">
            <span>
              {SITE.address.street}
              <br />
              {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
              <br />
              <span className="text-crema/60">{SITE.address.context}</span>
            </span>
            <a href={SITE.phone.href} className="inline-flex items-center gap-2 text-crema hover:underline">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
            <a href={SITE.maps.place} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-crema">
              <Icon name="pin" className="h-4 w-4" />
              Ver en Google Maps
            </a>
          </address>
        </div>
      </div>

      <div className="container-page mt-14 flex flex-col gap-4 border-t border-crema/10 pt-6 text-xs text-crema/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {SITE.name}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href={href(locale, "/aviso-legal")} className="hover:text-crema">
              Aviso legal
            </Link>
          </li>
          <li>
            <Link href={href(locale, "/privacidad")} className="hover:text-crema">
              Privacidad
            </Link>
          </li>
          <li>
            <Link href={href(locale, "/cookies")} className="hover:text-crema">
              Cookies
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
