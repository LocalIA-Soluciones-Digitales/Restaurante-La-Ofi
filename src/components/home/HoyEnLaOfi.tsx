import Link from "next/link";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, horarioDeHoy, type HorarioResuelto } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * Lo primero que busca quien baja de la oficina: ¿está abierto?, ¿qué hay hoy?,
 * ¿cuánto cuesta?, ¿puedo reservar?, ¿cómo llego? Todo en una pantalla.
 */
export function HoyEnLaOfi({ locale, menu, horario }: { locale: Locale; menu: ContentState<MenuDiaView>; horario: HorarioResuelto }) {
  const hoy = horarioDeHoy(horario.semana);
  const fila = "flex items-start gap-4 border-b border-tinta-line py-5";

  return (
    <section id="hoy" aria-labelledby="hoy-title" className="section scroll-mt-16 bg-papel-2">
      <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="kicker text-brasa">Hoy en La Ofi</p>
          <h2 id="hoy-title" className="t-h2 mt-3 text-carbon">
            Lo que hay hoy, antes de salir de la oficina
          </h2>

          <dl className="mt-8 border-t border-tinta-line">
            <div className={fila}>
              <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              <div>
                <dt className="sr-only">Abierto</dt>
                <dd>
                  <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="text-base text-carbon" />
                  <p className="mt-1 text-sm text-carbon-muted">
                    {hoy ? `Hoy: ${hoy}` : "Hoy: consulta el horario por teléfono"} ·{" "}
                    <Link href={href(locale, "/contacto")} className="underline underline-offset-4 hover:text-carbon">
                      horario completo
                    </Link>
                  </p>
                </dd>
              </div>
            </div>
            <div className={fila}>
              <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              <div>
                <dt className="font-medium text-carbon">Edificio 502 del Parque Tecnológico</dt>
                <dd className="mt-1 text-sm text-carbon-muted">
                  {SITE.address.street}, {SITE.address.locality}. Aparcamiento para 220 coches.
                </dd>
              </div>
            </div>
            <div className={fila}>
              <Icon name="phone" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              <div>
                <dt className="font-medium text-carbon">Para grupos o dudas, llámanos</dt>
                <dd className="mt-1 text-sm">
                  <a href={SITE.phone.href} className="font-semibold text-carbon underline decoration-carbon/30 underline-offset-4 hover:decoration-brasa">
                    {SITE.phone.display}
                  </a>
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
              Reservar para hoy
            </Link>
            <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <Icon name="pin" className="h-4 w-4" />
              Cómo llegar
            </a>
            <Link href={href(locale, "/pedir")} className="btn-secondary">
              <Icon name="bag" className="h-4 w-4" />
              Pedir para recoger
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 lg:pt-2">
          <MenuDelDia state={menu} live />
          <p className="mt-5 text-center">
            <Link href={href(locale, "/menu-del-dia")} className="link-arrow">
              Menú del día con alérgenos
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
