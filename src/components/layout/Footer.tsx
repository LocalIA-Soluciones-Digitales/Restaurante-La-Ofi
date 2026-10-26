import Link from "next/link";
import type { NavItem } from "@/components/layout/nav";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * Pie al estilo de The Fat Duck: sobre papel claro, columnas cortas de contacto,
 * dirección y páginas, y el nombre «La Ofi» a todo el ancho como cierre, con la
 * firma debajo. El nombre sube al entrar en pantalla (CSS .footer-name).
 */
export function Footer({ locale, items }: { locale: Locale; items: NavItem[] }) {
  const year = new Date().getFullYear();
  const titulo = "font-display text-[0.95rem] uppercase tracking-[0.12em] text-carbon";
  return (
    <footer className="overflow-hidden border-t border-tinta-line bg-papel pb-28 pt-20 text-carbon-muted lg:pb-8">
      <div className="container-wide grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className={titulo}>Reservas</h2>
          <a href={SITE.phone.href} className="mt-4 block font-display text-2xl text-carbon hover:text-brasa">
            {SITE.phone.display}
          </a>
          <Link href={href(locale, "/reservar")} className="link-arrow mt-3 text-sm">
            Reservar mesa
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <h2 className={titulo}>Dirección</h2>
          <address className="mt-4 text-[0.95rem] not-italic leading-relaxed">
            {SITE.address.street}
            <br />
            {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
            <br />
            <span className="text-sm">{SITE.address.context}</span>
          </address>
          <a href={SITE.maps.place} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm">
            <Icon name="pin" className="h-4 w-4" />
            Ver en Google Maps
          </a>
        </div>

        <nav aria-label="Pie de página">
          <h2 className={titulo}>La Ofi</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[0.95rem] lg:grid-cols-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-8 items-center hover:text-carbon">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={titulo}>Síguenos</h2>
          <a
            href={SITE.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-[0.95rem] hover:text-carbon"
          >
            <Icon name="instagram" className="h-5 w-5" />
            {SITE.instagram.handle}
          </a>
        </div>
      </div>

      {/* El nombre a todo el ancho, como cierre de página, con manchas de acuarela
          detrás y dibujos a línea que se trazan al llegar (The Fat Duck). */}
      <div aria-hidden="true" className="relative mt-20 select-none px-2 sm:mt-24">
        <Manchas />
        <Dibujos />
        <p className="footer-name relative whitespace-nowrap text-center font-display text-[25.5vw] font-normal leading-[0.78] tracking-[-0.045em] text-carbon">
          La Ofi
        </p>
        <p className="relative mt-4 text-center font-display text-[clamp(1.2rem,0.8rem+1.8vw,2.4rem)] font-light italic text-madera">restaurante · derio</p>
      </div>

      <div className="container-wide mt-14 flex flex-col items-center gap-4 text-xs sm:flex-row sm:justify-between">
        <p>
          © {year} {SITE.name} · {SITE.address.locality}, {SITE.address.region}
        </p>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <li>
            <Link href={href(locale, "/aviso-legal")} className="hover:text-carbon">
              Aviso legal
            </Link>
          </li>
          <li>
            <Link href={href(locale, "/privacidad")} className="hover:text-carbon">
              Privacidad
            </Link>
          </li>
          <li>
            <Link href={href(locale, "/cookies")} className="hover:text-carbon">
              Cookies
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

/** Manchas de color difuminadas (acuarela) con los tonos del local, flotando a distinto ritmo. */
function Manchas() {
  const manchas = [
    "left-[6%] top-[8%] h-[16vw] w-[16vw] bg-ratan/45",
    "left-[30%] top-[38%] h-[11vw] w-[11vw] bg-brasa/25",
    "left-[52%] top-[2%] h-[14vw] w-[14vw] bg-oliva/25",
    "right-[8%] top-[30%] h-[18vw] w-[18vw] bg-neon/45",
    "right-[30%] bottom-[0%] h-[10vw] w-[10vw] bg-ratan/35",
  ];
  return (
    <>
      {manchas.map((m) => (
        <span key={m} className={`footer-blob pointer-events-none absolute rounded-[46%_54%_58%_42%/52%_44%_56%_48%] mix-blend-multiply blur-2xl ${m}`} />
      ))}
    </>
  );
}

/** Dibujos a línea (taza, copa, ramita y llama de la brasa) que se trazan al entrar en pantalla. */
function Dibujos() {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1 };
  return (
    <>
      {/* Taza de café con vapor */}
      <svg viewBox="0 0 120 120" className="footer-draw pointer-events-none absolute left-[3%] top-[-18%] hidden w-[11vw] max-w-[9rem] text-carbon/70 md:block">
        <path {...trazo} d="M24 52h58v22a26 26 0 0 1-26 26h-6a26 26 0 0 1-26-26z" />
        <path {...trazo} d="M82 60h8a11 11 0 0 1 0 22h-9" />
        <path {...trazo} d="M16 106h80" />
        <path {...trazo} d="M42 42c-6-8 6-12 0-22M56 42c-6-8 6-12 0-22M70 42c-6-8 6-12 0-22" />
      </svg>
      {/* Copa de vino */}
      <svg viewBox="0 0 120 160" className="footer-draw pointer-events-none absolute right-[4%] top-[-30%] hidden w-[8vw] max-w-[7rem] text-carbon/70 md:block">
        <path {...trazo} d="M36 14h48c4 30 0 58-24 64-24-6-28-34-24-64z" />
        <path {...trazo} d="M40 44c12 6 28 6 40 0" />
        <path {...trazo} d="M60 78v56M38 146h44" />
      </svg>
      {/* Ramita de olivo */}
      <svg viewBox="0 0 160 80" className="footer-draw pointer-events-none absolute bottom-[-6%] left-[18%] hidden w-[10vw] max-w-[9rem] text-oliva/80 lg:block">
        <path {...trazo} d="M8 60C50 50 100 30 150 12" />
        <ellipse {...trazo} cx="44" cy="44" rx="13" ry="6" transform="rotate(-30 44 44)" />
        <ellipse {...trazo} cx="78" cy="42" rx="13" ry="6" transform="rotate(30 78 42)" />
        <ellipse {...trazo} cx="104" cy="24" rx="13" ry="6" transform="rotate(-30 104 24)" />
      </svg>
      {/* Llama de la brasa */}
      <svg viewBox="0 0 100 130" className="footer-draw pointer-events-none absolute bottom-[4%] right-[20%] hidden w-[6vw] max-w-[5rem] text-brasa/80 lg:block">
        <path {...trazo} d="M50 8c8 24 34 34 34 66a34 34 0 0 1-68 0c0-18 10-26 16-36 2 12 8 18 14 20-4-18-2-34 4-50z" />
        <path {...trazo} d="M50 70c4 10 14 14 14 28a14 14 0 0 1-28 0c0-10 8-16 14-28z" />
      </svg>
    </>
  );
}
