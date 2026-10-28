import Link from "next/link";
import type { NavItem } from "@/components/layout/nav";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { agruparHorario, estadoAhora, type Semana } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * Pie «noche editorial»: en el azul de la barra, como la cinta de letras de la
 * home. Arriba la llamada a reservar con el estado del momento, debajo los datos
 * en columnas finas y, como cierre, «La Ofi» enorme en crema cortado por abajo.
 * El nombre sube al entrar en pantalla (CSS .footer-name).
 */
export function Footer({ locale, items, semana }: { locale: Locale; items: NavItem[]; semana: Semana }) {
  const year = new Date().getFullYear();
  const titulo = "kicker text-ratan";
  const enlace = "transition-colors duration-300 hover:text-crema";
  return (
    <footer className="overflow-hidden bg-noche text-crema/65">
      <div className="container-wide pt-16 sm:pt-24">
        {/* Llamada a reservar */}
        <div className="flex flex-col gap-8 border-b border-crema/15 pb-12 sm:pb-16 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <EstadoAhora semana={semana} inicial={estadoAhora(semana)} tone="light" className="text-[0.8rem] text-crema/70" />
            <p className="mt-5 font-display text-[clamp(2.4rem,1.6rem+3.4vw,4.75rem)] font-light leading-[0.95] tracking-[-0.02em] text-crema">
              ¿Mesa para hoy?
            </p>
            <a href={SITE.phone.href} className="mt-4 inline-block font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] tabular-nums text-ratan transition-colors duration-300 hover:text-crema">
              {SITE.phone.display}
            </a>
          </div>
          <Link
            href={href(locale, "/reservar")}
            className="group inline-flex min-h-14 items-center justify-between gap-8 bg-crema px-6 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-carbon transition-colors duration-300 hover:bg-ratan sm:self-start lg:self-auto"
          >
            Reservar mesa
            <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Datos en columnas finas */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 text-[0.92rem] leading-relaxed sm:py-16 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <h2 className={titulo}>Dirección</h2>
            <address className="mt-4 not-italic">
              <span className="text-crema">{SITE.address.street}</span>
              <br />
              {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
              <br />
              <span className="text-[0.82rem] text-crema/50">{SITE.address.context}</span>
            </address>
            <a
              href={SITE.maps.place}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex min-h-11 items-center gap-2 text-crema underline decoration-crema/30 underline-offset-[6px] ${enlace} hover:decoration-ratan`}
            >
              <Icon name="pin" className="h-4 w-4" />
              Ver en Google Maps
            </a>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h2 className={titulo}>Horario</h2>
            <dl className="mt-4 grid gap-1.5">
              {agruparHorario(semana).map((g) => (
                <div key={g.dias} className="flex justify-between gap-4 border-b border-crema/10 pb-1.5 lg:block lg:border-0 lg:pb-0">
                  <dt>{g.dias}</dt>
                  <dd className="tabular-nums text-crema">{g.horas}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav aria-label="Pie de página">
            <h2 className={titulo}>La Ofi</h2>
            <ul className="mt-4 grid gap-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`inline-flex min-h-9 items-center ${enlace}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={titulo}>Síguenos</h2>
            <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex min-h-9 items-center gap-2 ${enlace}`}>
              <Icon name="instagram" className="h-5 w-5" />
              {SITE.instagram.handle}
            </a>
          </div>
        </div>
      </div>

      {/* Cierre: el nombre en crema a todo el ancho, cortado por abajo. flow-root:
          overflow:clip (globals.css) no impide que el margen negativo se salga. */}
      <div aria-hidden="true" className="flow-root select-none overflow-hidden border-t border-crema/15">
        <p className="footer-name -mb-[0.04em] whitespace-nowrap text-center font-display text-[31vw] font-normal leading-[0.82] tracking-[-0.045em] text-crema">
          La Ofi
        </p>
      </div>

      <div className="border-t border-crema/15 bg-noche pb-28 lg:pb-0">
        <div className="container-wide flex flex-col items-center gap-3 py-6 text-xs sm:flex-row sm:justify-between">
          <p>
            © {year} {SITE.name} · {SITE.address.locality}, {SITE.address.region}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <li>
              <Link href={href(locale, "/aviso-legal")} className={enlace}>
                Aviso legal
              </Link>
            </li>
            <li>
              <Link href={href(locale, "/privacidad")} className={enlace}>
                Privacidad
              </Link>
            </li>
            <li>
              <Link href={href(locale, "/cookies")} className={enlace}>
                Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
