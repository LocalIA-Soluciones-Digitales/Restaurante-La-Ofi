import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import type { Momento } from "@/components/ui/SectionHeader";
import { imageKeyBySrc } from "@/lib/images";
import type { VideoAsset } from "@/lib/media";

const MOMENTO_LABEL: Record<Momento, string> = { manana: "Mañana", mediodia: "Mediodía", tarde: "Tarde", noche: "Noche" };

/**
 * Cabecera de las páginas interiores: etiqueta entre puntos, titular grande
 * centrado, entradilla y botones, y debajo la foto real a todo el ancho. Sin
 * velos oscuros: la foto se ve como es. `video`, `ambiente` y `noche` se aceptan por compatibilidad,
 * pero la cabecera ya no cambia de identidad.
 */
export function PageHero({
  id,
  title,
  eyebrow,
  lead,
  momento,
  image,
  compact = false,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  lead?: ReactNode;
  momento?: Momento;
  image?: { src: StaticImageData; alt: string };
  video?: VideoAsset | null;
  ambiente?: VideoAsset | null;
  noche?: boolean;
  compact?: boolean;
  children?: ReactNode;
}) {
  const key = image ? imageKeyBySrc(image.src.src) : null;
  const kicker = [momento ? MOMENTO_LABEL[momento] : null, eyebrow].filter(Boolean).join(" · ");

  return (
    <header className={`bg-crema pt-28 lg:pt-40 ${image ? "" : "pb-12 sm:pb-16"}`}>
      <div className="container-wide flex flex-col items-center text-center">
        {kicker ? (
          <p className="flex items-center gap-3 text-[0.8rem] font-medium text-carbon">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-carbon" />
            {kicker}
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-carbon" />
          </p>
        ) : null}
        <h1 id={id} className="t-display mt-6 max-w-[20ch] font-light text-carbon">
          {title}
        </h1>
        {lead ? <div className="lead mx-auto mt-6">{lead}</div> : null}
        {/* Los botones que pasa cada página llegan en una fila flex: centrados. */}
        {children ? <div className="flex flex-col items-center [&_.flex-wrap]:justify-center">{children}</div> : null}
      </div>
      {image ? (
        <div className={`relative mt-14 w-full overflow-hidden bg-papel-3 lg:mt-20 ${compact ? "aspect-[4/3] sm:aspect-[21/9]" : "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"}`}>
          {key ? (
            <Photo img={key} sizes="100vw" priority mobileBelow={640} imgClassName="motion-safe:animate-kenburns" />
          ) : (
            <Image src={image.src} alt={image.alt} fill priority sizes="100vw" className="object-cover" />
          )}
        </div>
      ) : null}
    </header>
  );
}
