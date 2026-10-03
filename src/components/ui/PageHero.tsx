import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import type { Momento } from "@/components/ui/SectionHeader";
import { imageKeyBySrc } from "@/lib/images";
import type { VideoAsset } from "@/lib/media";

const MOMENTO_LABEL: Record<Momento, string> = { manana: "Mañana", mediodia: "Mediodía", tarde: "Tarde", noche: "Noche" };

/**
 * Cabecera editorial de las páginas interiores: titular contenido, entradilla y
 * foto real al lado (o debajo en móvil), sobre papel. Sin velos oscuros: la foto
 * se ve como es. `video`, `ambiente` y `noche` se aceptan por compatibilidad,
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
    <header className="bg-crema pb-10 pt-24 sm:pb-14 lg:pt-32">
      <div className="container-wide grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-14">
        <div className={image ? "lg:col-span-6" : "lg:col-span-9"}>
          {kicker ? <p className="kicker text-brasa">{kicker}</p> : null}
          <h1 id={id} className="t-display mt-4 max-w-[18ch] text-carbon">
            {title}
          </h1>
          {lead ? <div className="lead mt-5">{lead}</div> : null}
          {children}
        </div>
        {image ? (
          <div className="lg:col-span-6">
            <div className={`relative overflow-hidden bg-papel-3 ${compact ? "aspect-[16/9] lg:aspect-[16/10]" : "aspect-[4/3]"}`}>
              {key ? (
                <Photo img={key} sizes="(min-width: 1024px) 50vw, 100vw" priority mobileBelow={0} imgClassName="motion-safe:animate-kenburns" />
              ) : (
                <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
