import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { PinnedStoryLoader } from "@/components/home/PinnedStoryLoader";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { VideoAsset } from "@/lib/media";

export interface Capitulo {
  id: string;
  hora: string;
  titulo: string;
  texto: string;
  icon: IconName;
  fondo: { src: StaticImageData; alt: string };
  /** Vídeo real del capítulo (si existe) o ambiente generado sobre la foto. */
  video: VideoAsset | null;
  ambiente: VideoAsset | null;
  /** Plato protagonista que entra en escena (foto real o hueco de marca). */
  plato: { src: StaticImageData; alt: string } | null;
  cta: { label: string; href: string };
  noche?: boolean;
}

/**
 * "Del desayuno al tardeo": historia fijada en escritorio (patrón
 * EnergyScrollStory de Amway). Cada capítulo tiene su fondo permanente en el DOM
 * (solo cambia la opacidad, sin parpadeos), el plato entra con un movimiento
 * continuo ligado al scroll y el titular se revela por palabras con GSAP, que se
 * descarga solo cuando la sección se acerca. En móvil, capítulos apilados con
 * revelado CSS: ni GSAP ni sección fijada.
 */
export function ScrollStory({ capitulos }: { capitulos: Capitulo[] }) {
  return (
    <section aria-labelledby="historia-title" className="relative bg-noche text-crema">
      <h2 id="historia-title" className="sr-only">
        Del desayuno al tardeo: un día en La Ofi
      </h2>
      <PinnedStoryLoader capitulos={capitulos} />
      <StackedStory capitulos={capitulos} />
    </section>
  );
}

export function StackedStory({ capitulos }: { capitulos: Capitulo[] }) {
  return (
    <ol className="lg:hidden">
      {capitulos.map((c) => (
        <li key={c.id} className="cv-auto relative isolate flex min-h-[88svh] items-end overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <Image src={c.fondo.src} alt="" fill sizes="100vw" className="parallax-soft object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-noche via-noche/70 to-noche/20" />
          </div>
          <div className="container-page reveal pb-14 pt-24">
            {c.plato ? (
              <div className="relative mb-8 h-36 w-36 overflow-hidden rounded-full border-4 border-crema/90 shadow-lift">
                <Image src={c.plato.src} alt={c.plato.alt} fill sizes="144px" className="object-cover" />
              </div>
            ) : null}
            <p className="eyebrow flex items-center gap-2 text-neon">
              <Icon name={c.icon} className="h-4 w-4" />
              {c.hora}
            </p>
            <h3 className={`display-lg mt-3 ${c.noche ? "neon-text" : ""}`}>{c.titulo}</h3>
            <p className="mt-4 text-lg leading-relaxed text-crema/80">{c.texto}</p>
            <Link href={c.cta.href} className="btn-neon mt-6">
              {c.cta.label}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
