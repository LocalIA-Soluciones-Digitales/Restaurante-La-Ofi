import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { href, type Locale } from "@/lib/i18n";
import type { ImageKey } from "@/lib/images";

/**
 * Una sola frase con fotos pequeñas del local intercaladas entre las palabras.
 * Cada foto se abre desde el centro al entrar en pantalla (CSS .pill-in,
 * clip-path ligado al scroll, escalonadas). Sin soporte se ven abiertas.
 */
export function Declaracion({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="declaracion-title" className="section bg-crema">
      <div className="container-wide flex flex-col items-center text-center">
        <p className="kicker text-brasa">La Ofi</p>
        <h2
          id="declaracion-title"
          className="title-in mt-8 max-w-[15em] font-display text-[clamp(2rem,0.9rem+4.4vw,5.2rem)] font-light leading-[1.14] tracking-[-0.025em] text-carbon"
        >
          Del primer café <Pastilla img="barra" orden={0} /> a la última copa <Pastilla img="terraza" orden={1} /> del viernes,{" "}
          <em className="text-madera">a un paseo</em> <Pastilla img="comedorRatan" orden={2} /> de tu oficina.
        </h2>
        <Link href={href(locale, "/espacios")} className="btn-line mt-12 text-carbon">
          <span>Conoce el local</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

function Pastilla({ img, orden }: { img: ImageKey; orden: number }) {
  return (
    <span
      aria-hidden="true"
      className="pill-in relative mx-[0.08em] inline-block h-[0.78em] w-[1.85em] -translate-y-[0.06em] overflow-hidden rounded-full bg-papel-3 align-middle"
      style={{ animationRange: `entry ${20 + orden * 12}% cover ${42 + orden * 8}%` }}
    >
      <Photo img={img} sizes="10rem" mobileBelow={0} decorative />
    </span>
  );
}
