import { AmbientVideo } from "@/components/media/AmbientVideo";
import { creditoVideo, VIDEOS } from "@/lib/media";

/**
 * Primera pantalla de la home (tras la entrada con el rótulo): la sección se
 * ancla, el vídeo del salón se abre desde un óvalo central hasta la pantalla
 * completa mientras «Del primer café · a la última copa» se separan, y al final
 * aparece el lema (CSS .reel-*, ligado al scroll). Es el único vídeo de la
 * cabecera de la home. Sin soporte o con "reducir movimiento": vídeo entero y lema.
 */
export function Declaracion() {
  const video = VIDEOS.heroNoche;
  const credito = creditoVideo(video);
  return (
    <section aria-labelledby="reel-title" className="reel bg-crema">
      <h1 className="sr-only">La Ofi, restaurante en el Parque Tecnológico de Bizkaia (Derio)</h1>
      <div className="reel-sticky relative h-[100svh] overflow-hidden">
        <div className="reel-media absolute inset-0 bg-noche">
          <div className="reel-zoom absolute inset-0">
            <AmbientVideo video={video} threshold={0.01} />
          </div>
          <span aria-hidden="true" className="absolute inset-0 bg-noche/45" />
        </div>

        {/* Columnas a cada lado del hueco del vídeo (30vw, el mismo del recorte inicial). */}
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

        <div className="reel-end absolute inset-0 grid place-items-center px-6 text-center text-crema">
          <div>
            <p className="kicker text-ratan">La Ofi · Derio</p>
            <h2 id="reel-title" className="mt-5 max-w-[14em] font-display text-[clamp(2rem,1rem+3.6vw,4.6rem)] font-light leading-[1.08] tracking-[-0.02em]">
              Durante el día, el restaurante del Parque. <em className="text-ratan">Cuando acaba la oficina, empieza La Ofi.</em>
            </h2>
          </div>
        </div>
        {credito ? <p className="reel-end absolute bottom-4 right-5 text-[0.64rem] text-crema/60">{credito}</p> : null}
      </div>
    </section>
  );
}
