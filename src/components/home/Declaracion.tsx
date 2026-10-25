import { Photo } from "@/components/media/Photo";

/**
 * Imagen que crece con el scroll: la sección se ancla, el comedor de día (foto
 * del fotógrafo) se abre desde un óvalo central hasta la pantalla completa
 * mientras la frase se separa y se aleja un poco, y al final aparece el lema
 * (CSS .reel-*, ligado al scroll). El vídeo queda solo en el hero: de noche, el
 * salón; aquí, el día. Sin soporte o con "reducir movimiento": foto entera y lema.
 */
export function Declaracion() {
  return (
    <section aria-labelledby="reel-title" className="reel bg-crema">
      <div className="reel-sticky relative h-[100svh] overflow-hidden">
        <div className="reel-media absolute inset-0 bg-noche">
          <div className="reel-zoom absolute inset-0">
            <Photo img="comedorPanoramica" sizes="100vw" mobileBelow={768} decorative />
          </div>
          <span aria-hidden="true" className="absolute inset-0 bg-noche/50" />
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
      </div>
    </section>
  );
}
