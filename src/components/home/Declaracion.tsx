import { Photo } from "@/components/media/Photo";

/**
 * Primera pantalla de la home (tras la entrada con el rótulo): la sección se
 * ancla, la foto del comedor (fotógrafo) se abre desde un óvalo central hasta la
 * pantalla completa mientras «Del primer café · a la última copa» se separan, y
 * al final aparece el lema (CSS .reel-*, ligado al scroll). Sin soporte o con
 * "reducir movimiento": foto entera y lema.
 */
export function Declaracion() {
  return (
    <section aria-labelledby="reel-title" className="reel bg-crema">
      <h1 className="sr-only">La Ofi, restaurante en el Parque Tecnológico de Bizkaia (Derio)</h1>
      <div className="reel-sticky relative h-[100svh] overflow-hidden">
        <div className="reel-media absolute inset-0 bg-noche">
          <div className="reel-zoom absolute inset-0">
            <Photo img="comedorPanoramica" sizes="100vw" mobileBelow={768} priority decorative />
          </div>
          <span aria-hidden="true" className="absolute inset-0 bg-noche/50" />
        </div>

        {/* Columnas a cada lado del hueco de la foto (30vw, el mismo del recorte inicial). */}
        <p aria-hidden="true" className="reel-words relative grid h-full w-full grid-rows-[1fr_36svh_1fr] items-center px-5 text-center font-display text-[clamp(2.1rem,1rem+3vw,4.2rem)] font-light leading-[1.02] tracking-[-0.03em] text-carbon lg:grid-cols-[1fr_30vw_1fr] lg:grid-rows-1 lg:px-0">
          <span className="reel-l self-end pb-6 lg:self-auto lg:pb-0 lg:pr-[2.5vw] lg:text-right">Del primer café</span>
          <span />
          <span className="reel-r self-start pt-6 italic text-madera lg:self-auto lg:pt-0 lg:pl-[2.5vw] lg:text-left">a la última copa</span>
        </p>

        {/* Indicador de scroll: solo al principio, se va en cuanto empieza el recorrido. */}
        <span aria-hidden="true" className="reel-cue absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[0.66rem] uppercase tracking-[0.22em] text-carbon lg:bottom-8">
          Desliza
          <span className="relative block h-10 w-px overflow-hidden bg-carbon/20">
            <span className="scroll-line absolute inset-x-0 top-0 h-1/2 bg-carbon" />
          </span>
        </span>

        {/* Al final, la foto se funde en niebla hacia la sección oscura siguiente. */}
        <span aria-hidden="true" className="reel-fog absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent via-noche/70 to-noche" />

        <div className="reel-end absolute inset-0 grid place-items-center px-6 text-center text-crema">
          <div>
            <p className="kicker text-ratan">
              <span className="sm:hidden">Parque Tecnológico · Derio</span>
              <span className="hidden sm:inline">Parque Tecnológico de Bizkaia · Derio</span>
            </p>
            <h2 id="reel-title" className="mt-6 font-display text-[clamp(2.4rem,1rem+5vw,6.2rem)] font-light leading-[1.02] tracking-[-0.03em]">
              La mejor reunión del día <em className="block text-ratan">es en La Ofi.</em>
            </h2>
          </div>

          {/* Designer credit: sale con el lema, sobre la foto ya oscura. En móvil, por encima de la BottomBar. */}
          <div className="pointer-events-none absolute bottom-24 right-5 text-right lg:bottom-8 lg:right-8">
            <span className="block text-[10px] font-light tracking-wide text-white">Designed &amp; Developed by</span>
            <span className="mt-1 block text-[11px] font-medium tracking-wide text-white">
              Local<span className="font-bold text-ratan">IA</span>.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
