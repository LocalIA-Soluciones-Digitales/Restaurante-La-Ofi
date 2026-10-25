import Link from "next/link";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, type HorarioResuelto } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { creditoVideo, VIDEOS } from "@/lib/media";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";

/**
 * El menú del día en una sola pantalla: título, si está abierto y dos acciones a
 * un lado y, al otro, la tarjeta del menú montada sobre una foto del comedor.
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

          {/* Vídeo del plato en bucle: llena el hueco con movimiento, no con más texto. */}
          <figure className="mt-12 hidden w-full max-w-[30rem] lg:block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-noche">
              <AmbientVideo video={VIDEOS.heroMediodia} />
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-noche/55 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-crema backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-brasa motion-safe:animate-pulse" />
                De la brasa
              </span>
            </div>
            <figcaption className="mt-2 text-[0.68rem] text-carbon-muted">Pulpo a la brasa · {creditoVideo(VIDEOS.heroMediodia)}</figcaption>
          </figure>
        </div>

        {/* La foto del comedor detrás y la tarjeta del menú montada encima. */}
        <div className="relative w-full lg:col-span-7 lg:min-h-[46rem]">
          <div className="parallax relative aspect-[4/3] overflow-hidden bg-papel-3 lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[60%]">
            <Photo img="comedorRatan" sizes="(min-width: 1024px) 34vw, 100vw" mobileBelow={0} />
          </div>
          <div className="relative z-10 mx-3 -mt-20 sm:mx-10 lg:absolute lg:left-0 lg:top-1/2 lg:mx-0 lg:mt-0 lg:w-[64%] lg:-translate-y-1/2">
            <MenuDelDia state={menu} live />
          </div>
        </div>
      </div>
    </section>
  );
}
