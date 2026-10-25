import { AmbientVideo } from "@/components/media/AmbientVideo";
import { creditoVideo, VIDEOS } from "@/lib/media";

/**
 * Vídeo que crece con el scroll: la sección se ancla, un vídeo pequeño en el
 * centro se abre hasta ocupar toda la pantalla mientras la frase se separa hacia
 * los lados, y al final aparece el lema sobre el vídeo (CSS .reel-*, ligado al
 * scroll). Sin soporte o con "reducir movimiento": vídeo a pantalla completa con
 * el lema encima.
 */
export function Declaracion() {
  const video = VIDEOS.heroNoche;
  return (
    <section aria-labelledby="reel-title" className="reel bg-crema">
      <div className="reel-sticky relative h-[100svh] overflow-hidden">
        <div className="reel-media absolute inset-0 bg-noche">
          <AmbientVideo video={video} threshold={0.05} />
          <span aria-hidden="true" className="absolute inset-0 bg-noche/45" />
        </div>

        {/* Columnas a cada lado del hueco del vídeo (30vw, el mismo del recorte inicial). */}
        <p aria-hidden="true" className="reel-words relative grid h-full w-full grid-rows-[1fr_36svh_1fr] items-center px-5 text-center font-display text-[clamp(2.1rem,1rem+3vw,4.2rem)] font-light leading-[1.02] tracking-[-0.03em] text-carbon lg:grid-cols-[1fr_30vw_1fr] lg:grid-rows-1 lg:px-0">
          <span className="reel-l self-end pb-6 lg:self-auto lg:pb-0 lg:pr-[2.5vw] lg:text-right">Del primer café</span>
          <span />
          <span className="reel-r self-start pt-6 italic text-madera lg:self-auto lg:pt-0 lg:pl-[2.5vw] lg:text-left">a la última copa</span>
        </p>

        <div className="reel-end absolute inset-0 grid place-items-center px-6 text-center text-crema">
          <div>
            <p className="kicker text-ratan">La Ofi</p>
            <h2 id="reel-title" className="mt-5 max-w-[14em] font-display text-[clamp(2rem,1rem+3.6vw,4.6rem)] font-light leading-[1.08] tracking-[-0.02em]">
              Durante el día, el restaurante del Parque. <em className="text-ratan">Cuando acaba la oficina, empieza La Ofi.</em>
            </h2>
          </div>
        </div>
        {creditoVideo(video) ? <p className="reel-end absolute bottom-4 right-5 text-[0.64rem] text-crema/60">{creditoVideo(video)}</p> : null}
      </div>
    </section>
  );
}
