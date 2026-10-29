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
  // En móvil cada bloque va separado por un filete, como las fichas de la casa;
  // en escritorio, cuatro columnas sin filetes.
  const bloque = "border-t border-tinta-line pt-6 first:border-0 first:pt-0 sm:border-0 sm:pt-0";
  const titulo = "kicker text-brasa";
  return (
    <footer className="overflow-hidden border-t border-tinta-line bg-papel pb-8 pt-16 text-carbon-muted sm:pt-20">
      <div className="container-wide grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-4">
        <div className={bloque}>
          <h2 className={titulo}>Reservas</h2>
          <a href={SITE.phone.href} className="mt-4 block font-display text-[2rem] leading-none tabular-nums text-carbon hover:text-brasa sm:text-2xl">
            {SITE.phone.display}
          </a>
          <Link href={href(locale, "/reservar")} className="link-arrow mt-3 text-sm">
            Reservar mesa
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div className={bloque}>
          <h2 className={titulo}>Dirección</h2>
          <address className="mt-4 text-[0.95rem] not-italic leading-relaxed">
            <span className="text-carbon">{SITE.address.street}</span>
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

        <nav aria-label="Pie de página" className={bloque}>
          <h2 className={titulo}>La Ofi</h2>
          {/* Móvil: índice a una columna con filetes y flecha; escritorio: lista corta. */}
          <ul className="mt-3 lg:mt-4">
            {items.map((item) => (
              <li key={item.href} className="border-b border-tinta-line last:border-0 lg:border-0">
                <Link
                  href={item.href}
                  className="group flex min-h-12 items-center justify-between font-display text-[1.3rem] font-light text-carbon hover:text-brasa lg:inline-flex lg:min-h-8 lg:font-sans lg:text-[0.95rem] lg:font-normal lg:text-carbon-muted lg:hover:text-carbon"
                >
                  {item.label}
                  <Icon name="arrow" className="h-4 w-4 text-carbon/40 transition-transform duration-300 group-hover:translate-x-1 lg:hidden" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={bloque}>
          <h2 className={titulo}>Síguenos</h2>
          <a
            href={SITE.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2.5 border border-carbon/20 px-4 text-[0.95rem] text-carbon transition-colors duration-300 hover:border-carbon/60"
          >
            <Icon name="instagram" className="h-5 w-5" />
            {SITE.instagram.handle}
          </a>
        </div>
      </div>

      {/* El nombre a todo el ancho, como cierre de página, con manchas de acuarela
          detrás y dibujos a línea que se trazan al llegar (The Fat Duck). */}
      <div aria-hidden="true" className="relative mt-16 select-none px-2 sm:mt-24">
        <Manchas />
        <Dibujos />
        <p className="footer-name relative whitespace-nowrap text-center font-display text-[25.5vw] font-normal leading-[0.78] tracking-[-0.045em] text-carbon">
          La Ofi
        </p>
        <p className="relative mt-4 text-center font-display text-[clamp(1.2rem,0.8rem+1.8vw,2.4rem)] font-light italic text-madera-oscura">restaurante · derio</p>
      </div>

      <div className="container-wide mt-14">
        <div className="flex flex-col items-center gap-4 border-t border-tinta-line pt-6 text-xs sm:flex-row sm:justify-between">
          <p>
            © {year} {SITE.name} · {SITE.address.locality}, {SITE.address.region}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <li>
              <Link href={href(locale, "/aviso-legal")} className="inline-flex min-h-6 items-center py-2 hover:text-carbon">
                Aviso legal
              </Link>
            </li>
            <li>
              <Link href={href(locale, "/privacidad")} className="inline-flex min-h-6 items-center py-2 hover:text-carbon">
                Privacidad
              </Link>
            </li>
            <li>
              <Link href={href(locale, "/cookies")} className="inline-flex min-h-6 items-center py-2 hover:text-carbon">
                Cookies
              </Link>
            </li>
          </ul>
          <p>
            Designed &amp; Developed by Local<span className="font-bold text-brasa">IA</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Manchas difuminadas (acuarela) solo en tonos cálidos del local: ratán, madera, arena y un toque de brasa. */
function Manchas() {
  const manchas = [
    "left-[6%] top-[10%] h-[16vw] w-[16vw] bg-ratan/30",
    "left-[34%] top-[40%] h-[12vw] w-[12vw] bg-madera/15",
    "left-[54%] top-[4%] h-[14vw] w-[14vw] bg-arena-2/70",
    "right-[8%] top-[28%] h-[18vw] w-[18vw] bg-ratan/25",
    "right-[30%] bottom-[0%] h-[10vw] w-[10vw] bg-brasa/10",
  ];
  return (
    <>
      {manchas.map((m) => (
        <span key={m} className={`footer-blob pointer-events-none absolute rounded-[46%_54%_58%_42%/52%_44%_56%_48%] mix-blend-multiply blur-[3vw] md:blur-2xl ${m}`} />
      ))}
    </>
  );
}

/**
 * Dibujos a línea (taza, copa, ramita y llama de la brasa) que se trazan al
 * entrar en pantalla. Misma composición en móvil que en escritorio, a escala;
 * en móvil el trazo es más grueso para no quedarse en medio píxel.
 */
function Dibujos() {
  const trazo = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1 };
  return (
    <>
      {/* Taza de café con vapor */}
      <svg viewBox="0 0 120 120" className="footer-draw pointer-events-none absolute [stroke-width:2.6] md:[stroke-width:1.4] left-[3%] top-[-18%] w-[12vw] max-w-[9rem] text-carbon/70 md:w-[11vw]">
        <path {...trazo} d="M24 52h58v22a26 26 0 0 1-26 26h-6a26 26 0 0 1-26-26z" />
        <path {...trazo} d="M82 60h8a11 11 0 0 1 0 22h-9" />
        <path {...trazo} d="M16 106h80" />
        <path {...trazo} d="M42 42c-6-8 6-12 0-22M56 42c-6-8 6-12 0-22M70 42c-6-8 6-12 0-22" />
      </svg>
      {/* Copa de vino */}
      <svg viewBox="0 0 120 160" className="footer-draw pointer-events-none absolute [stroke-width:2.6] md:[stroke-width:1.4] right-[4%] top-[-30%] w-[8.5vw] max-w-[7rem] text-carbon/70 md:w-[8vw]">
        <path {...trazo} d="M36 14h48c4 30 0 58-24 64-24-6-28-34-24-64z" />
        <path {...trazo} d="M40 44c12 6 28 6 40 0" />
        <path {...trazo} d="M60 78v56M38 146h44" />
      </svg>
      {/* Ramita de olivo */}
      <svg viewBox="0 0 160 80" className="footer-draw pointer-events-none absolute [stroke-width:2.6] md:[stroke-width:1.4] bottom-[-6%] left-[18%] w-[10vw] max-w-[9rem] text-oliva/80">
        <path {...trazo} d="M8 60C50 50 100 30 150 12" />
        <ellipse {...trazo} cx="44" cy="44" rx="13" ry="6" transform="rotate(-30 44 44)" />
        <ellipse {...trazo} cx="78" cy="42" rx="13" ry="6" transform="rotate(30 78 42)" />
        <ellipse {...trazo} cx="104" cy="24" rx="13" ry="6" transform="rotate(-30 104 24)" />
      </svg>
      {/* Llama de la brasa */}
      <svg viewBox="0 0 100 130" className="footer-draw pointer-events-none absolute [stroke-width:2.6] md:[stroke-width:1.4] bottom-[4%] right-[20%] w-[6vw] max-w-[5rem] text-brasa/80">
        <path {...trazo} d="M50 8c8 24 34 34 34 66a34 34 0 0 1-68 0c0-18 10-26 16-36 2 12 8 18 14 20-4-18-2-34 4-50z" />
        <path {...trazo} d="M50 70c4 10 14 14 14 28a14 14 0 0 1-28 0c0-10 8-16 14-28z" />
      </svg>
    </>
  );
}
