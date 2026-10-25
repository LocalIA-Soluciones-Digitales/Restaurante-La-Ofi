import Link from "next/link";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, type HorarioResuelto } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";

/**
 * El menú del día en una sola pantalla: título, si está abierto y dos acciones a
 * un lado, centrados en vertical con la tarjeta del menú al otro.
 * Dirección, teléfono y horario completo viven en "Cómo llegar" y en el pie.
 */
export function HoyEnLaOfi({ locale, menu, horario }: { locale: Locale; menu: ContentState<MenuDiaView>; horario: HorarioResuelto }) {
  return (
    <section id="hoy" aria-labelledby="hoy-title" className="section scroll-mt-16 bg-papel-2">
      <div className="container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
          <p className="kicker text-brasa">Hoy en La Ofi</p>
          <h2 id="hoy-title" className="t-display mt-4 font-light text-carbon">
            El menú
            <em className="block text-madera">del día</em>
          </h2>
          <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="mt-6 text-sm text-carbon-muted" />
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href={href(locale, "/reservar?para=hoy")} className="btn-dark px-7">
              Reservar para hoy
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link href={href(locale, "/pedir")} className="btn-secondary px-6">
              <Icon name="bag" className="h-4 w-4" />
              Pedir para recoger
            </Link>
          </div>
          <Link href={href(locale, "/menu-del-dia")} className="link-arrow mt-4 text-sm">
            Ver con alérgenos
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div className="w-full lg:col-span-7">
          <MenuDelDia state={menu} live />
        </div>
      </div>
    </section>
  );
}
