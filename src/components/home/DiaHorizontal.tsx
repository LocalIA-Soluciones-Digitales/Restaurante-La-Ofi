import { Photo } from "@/components/media/Photo";
import type { ImageKey } from "@/lib/images";

// Solo lo verificable: apertura 7:30 L–V y viernes hasta 00:00 (horario publicado),
// tostadas 9:00–11:30 (carta de La Ofi en Instagram), plato del día L–V y brasa
// (Deia, 09/2025), tardeo mensual y terraza cubierta (Deia / Instagram).
const HORAS: { hora: string; titulo: string; texto: string; img: ImageKey }[] = [
  { hora: "7:30", titulo: "El primer café", texto: "Abrimos entre semana a las 7:30: café en barra antes de subir a la oficina.", img: "barra" },
  { hora: "9:00", titulo: "Tostadas de masa madre", texto: "Ocho tostadas, de la clásica con tomate a la de burrata con melocotón, hasta las 11:30.", img: "tostadaRevuelta" },
  { hora: "Mediodía", titulo: "Plato del día y brasa", texto: "De lunes a viernes, plato del día casero a elegir. Y la parrilla: pescado según mercado, carne y verdura.", img: "comedorRatan" },
  { hora: "Viernes", titulo: "La tarde se alarga", texto: "Terraza cubierta, un tardeo al mes y, los viernes, abierto hasta medianoche.", img: "terraza" },
];

// Mismo margen izquierdo que .container-wide, para que la pista arranque en la vertical del título.
const GUTTER = "px-4 sm:px-6 lg:pl-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))] lg:pr-[8vw]";

/**
 * El día en La Ofi como una pista horizontal. En escritorio la sección se ancla y
 * el scroll vertical desplaza la pista (CSS .hscroll, scroll-driven); sin soporte,
 * en móvil o con "reducir movimiento" es un carrusel normal con snap.
 */
export function DiaHorizontal() {
  return (
    <section aria-labelledby="dia-title" className="hscroll bg-papel-2">
      <div className="hscroll-sticky py-20 sm:py-28 lg:py-0">
        <div className="container-wide">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <h2 id="dia-title" className="t-h2 text-carbon">
              Un día en La Ofi
            </h2>
            <p className="kicker text-carbon-muted">De las 7:30 a medianoche</p>
          </div>
          <div aria-hidden="true" className="mt-5 h-[3px] bg-tinta-line">
            <span className="hscroll-bar block h-full bg-carbon" />
          </div>
        </div>

        <ol className={`hscroll-track no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 lg:mt-12 lg:gap-12 ${GUTTER} scroll-px-4 sm:scroll-px-6`}>
          {HORAS.map((h, i) => (
            <li key={h.hora} className="w-[80vw] max-w-[24rem] shrink-0 snap-start sm:w-[46vw] lg:w-[min(34vw,30rem)] lg:max-w-none">
              <div className="flex items-baseline justify-between gap-4 border-b border-tinta-line pb-3">
                <p className="font-display text-[clamp(2.6rem,1.8rem+2.6vw,5rem)] font-light leading-none tabular-nums text-carbon">{h.hora}</p>
                <span aria-hidden="true" className="kicker text-carbon-muted">
                  0{i + 1} / 0{HORAS.length}
                </span>
              </div>
              <figure className="parallax relative mt-5 aspect-[4/5] overflow-hidden bg-papel-3 lg:aspect-auto lg:h-[44svh]">
                <Photo img={h.img} sizes="(min-width: 1024px) 34vw, 80vw" mobileBelow={9999} decorative />
              </figure>
              <h3 className="t-h3 mt-5 text-carbon">{h.titulo}</h3>
              <p className="mt-2 max-w-[34ch] text-[0.95rem] leading-relaxed text-carbon-muted">{h.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
