import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { HorarioHoy } from "@/components/ui/HorarioHoy";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, horarioDeHoy, type HorarioResuelto } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { PROXIMAMENTE } from "@/lib/lanzamiento";
import { SITE } from "@/lib/site";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";

/**
 * El menú del día igual que en /menu-del-dia: el comedor a todo el ancho y la
 * hoja del menú centrada encima. Entre dos secciones claras hace de banda oscura
 * que corta el ritmo. Dirección y horario completo viven en "Cómo llegar".
 */
export function HoyEnLaOfi({
  locale,
  menu,
  horario,
  fundido = false,
}: {
  locale: Locale;
  menu: ContentState<MenuDiaView>;
  horario: HorarioResuelto;
  /** La foto sale del crema de la sección de arriba con un degradado largo. */
  fundido?: boolean;
}) {
  
  return (
    <section id="hoy" aria-labelledby="hoy-title" className={`relative isolate scroll-mt-16 overflow-hidden bg-carbon pb-20 text-crema sm:pb-28 ${fundido ? "pt-52 sm:pt-72" : "pt-20 sm:pt-28"}`}>
      <Photo img="comedorRatan" sizes="100vw" mobileBelow={0} decorative imgClassName="motion-safe:animate-kenburns" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-carbon/75 via-carbon/40 to-carbon/85" />
      {fundido ? <div aria-hidden="true" className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-crema via-crema/60 to-crema/0 sm:h-72" /> : null}

      <div className="container-wide relative flex flex-col items-center text-center">
        <p className="kicker text-crema/75">Hoy en La Ofi · Lunes a viernes</p>
        <h2 id="hoy-title" className="t-display mt-4 text-crema">
          Menú <em className="text-[#E2B98A]">del día</em>
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-crema/80">
          <EstadoAhora semana={horario.semana} cierres={horario.cierres} inicial={estadoAhora(horario.semana, undefined, horario.cierres)} tone="light" />
          <HorarioHoy semana={horario.semana} cierres={horario.cierres} inicial={horarioDeHoy(horario.semana, undefined, horario.cierres)} separador />
        </div>

        <div className="reveal mt-10 w-full max-w-xl text-left sm:mt-14">
          <MenuDelDia state={menu} live />
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {PROXIMAMENTE.reservas ? (
            <a href={SITE.phone.href} className="btn-primary">
              <Icon name="phone" className="h-4 w-4" />
              Llamar para reservar
            </a>
          ) : (
            <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
              Reservar para hoy
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          )}
          <Link href={href(locale, "/pedir")} className="btn border border-crema/40 text-crema hover:bg-crema hover:text-carbon">
            <Icon name="bag" className="h-4 w-4" />
            {PROXIMAMENTE.pedidos ? "Para llevar · muy pronto" : "Pedir para llevar"}
          </Link>
        </div>
        <Link href={href(locale, "/menu-del-dia")} className="mt-6 inline-flex items-center gap-2 text-sm text-crema/75 underline decoration-crema/30 underline-offset-4 hover:text-crema">
          Ver con alérgenos y la carta
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
