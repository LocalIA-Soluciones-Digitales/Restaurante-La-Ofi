import type { CSSProperties } from "react";
import { Photo } from "@/components/media/Photo";
import type { ImageKey } from "@/lib/images";

// Fotos del local (fotógrafo, 2026-10-17) que flotan alrededor de la frase, cada
// una a su velocidad (--f = recorrido vertical mientras la sección cruza la pantalla).
const FLOTANTES: { img: ImageKey; pos: string; f: number }[] = [
  { img: "rotuloAguila", pos: "left-[4%] top-[8%] w-[15%] aspect-[4/5]", f: 90 },
  { img: "despachoRotulo", pos: "right-[5%] top-[4%] w-[13%] aspect-[4/5]", f: 50 },
  { img: "barraMesasAltas", pos: "left-[9%] bottom-[2%] w-[12%] aspect-[3/4]", f: 140 },
  { img: "comedorPanoramica", pos: "right-[8%] bottom-[8%] w-[17%] aspect-[4/3]", f: 110 },
];

/**
 * Manifiesto de la marca: la frase grande en el centro y fotos del local que
 * flotan alrededor a distinta velocidad con el scroll (parallax en capas). En
 * móvil, la frase sola y dos fotos debajo.
 */
export function Manifiesto() {
  return (
    <section aria-labelledby="manifiesto-title" className="relative overflow-hidden bg-noche py-28 text-crema sm:py-40 lg:py-56">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        {FLOTANTES.map((f) => (
          <div key={f.img} className={`float-y absolute overflow-hidden bg-noche-3 ${f.pos}`} style={{ "--f": `${f.f}px` } as CSSProperties}>
            <Photo img={f.img} sizes="18vw" mobileBelow={9999} decorative />
          </div>
        ))}
      </div>

      <div className="container-wide relative">
        <p className="kicker text-center text-ratan">La Ofi · Derio</p>
        <blockquote className="mx-auto mt-8 text-center">
          <p id="manifiesto-title" className="title-in mx-auto max-w-[17em] font-display text-[clamp(2rem,1.2rem+3.4vw,4.6rem)] lg:max-w-[14em] font-light leading-[1.08] tracking-[-0.02em]">
            Durante el día, el restaurante del Parque. <em className="text-ratan">Cuando acaba la oficina, empieza La Ofi.</em>
          </p>
        </blockquote>

        <div aria-hidden="true" className="mx-auto mt-14 grid max-w-md grid-cols-2 gap-3 lg:hidden">
          <div className="relative aspect-[4/5] overflow-hidden bg-noche-3">
            <Photo img="rotuloAguila" sizes="50vw" mobileBelow={9999} decorative />
          </div>
          <div className="relative mt-10 aspect-[4/5] overflow-hidden bg-noche-3">
            <Photo img="despachoRotulo" sizes="50vw" mobileBelow={9999} decorative />
          </div>
        </div>
      </div>
    </section>
  );
}
