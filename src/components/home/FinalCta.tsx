import Image from "next/image";
import Link from "next/link";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { WordReveal } from "@/components/motion/WordReveal";
import { Icon } from "@/components/ui/Icon";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { VIDEOS } from "@/lib/media";
import { SITE } from "@/lib/site";

/** CTA final a pantalla completa: la terraza de noche (vídeo real cuando exista) + neón. */
export function FinalCta({ locale, t }: { locale: Locale; t: Dictionary }) {
  const foto = IMAGES.terrazaCarpa;
  return (
    <section aria-labelledby="cta-final-title" className="cv-auto grain relative isolate flex min-h-[92svh] items-center overflow-hidden bg-noche text-crema">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {VIDEOS.heroNoche ? (
          <AmbientVideo video={VIDEOS.heroNoche} />
        ) : (
          <Image src={foto.src} alt="" fill sizes="100vw" className="parallax-soft object-cover opacity-60" />
        )}
        <div className="absolute inset-0 opacity-60 mix-blend-screen">
          <AmbientVideo video={VIDEOS.ambienteNeon} showPoster={false} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-noche via-noche/60 to-noche/70" />
      </div>
      <div className="container-page reveal py-24 text-center">
        <p className="eyebrow text-neon">#puntodeencuentroybuenrollo</p>
        <h2 id="cta-final-title" className="mt-6">
          <WordReveal replayOnView lines={["Nos vemos", "en La Ofi"]} className="display-xl block motion-safe:animate-neon-flicker" wordClassName="neon-text" />
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-lg text-crema/80">
          Del café de las 7:30 al tardeo del viernes. Edificio 502 del Parque Tecnológico, Derio.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={href(locale, "/reservar")} className="btn-neon">
            <Icon name="calendar" className="h-4 w-4" />
            {t.cta.reservar}
          </Link>
          <Link href={href(locale, "/pedir")} className="btn-ghost-light">
            <Icon name="bag" className="h-4 w-4" />
            {t.cta.pedir}
          </Link>
          <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
            <Icon name="pin" className="h-4 w-4" />
            {t.cta.comoLlegar}
          </a>
        </div>
      </div>
      {foto.kind === "tercero" ? <p className="absolute bottom-4 right-4 text-xs text-crema/50">Foto: {foto.credit}</p> : null}
    </section>
  );
}
