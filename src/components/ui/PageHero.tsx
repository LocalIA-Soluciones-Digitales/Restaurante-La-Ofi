import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { WordReveal } from "@/components/motion/WordReveal";
import type { Momento } from "@/components/ui/SectionHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { VideoAsset } from "@/lib/media";

const MOMENTO_ICON: Record<Momento, { label: string; icon: IconName }> = {
  manana: { label: "Mañana", icon: "sunrise" },
  mediodia: { label: "Mediodía", icon: "sun" },
  tarde: { label: "Tarde", icon: "sunset" },
  noche: { label: "Noche", icon: "moon" },
};

/**
 * Cabecera inmersiva de páginas interiores: foto real (o vídeo real) a sangre,
 * con ambiente generado opcional, titular grande con revelado por palabras.
 * Sin imagen cae al patrón de baldosa hexagonal sobre marino.
 */
export function PageHero({
  id,
  title,
  eyebrow,
  lead,
  momento,
  image,
  video,
  ambiente,
  noche = false,
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
  const m = momento ? MOMENTO_ICON[momento] : null;
  return (
    <div
      data-header="light"
      className={`grain relative isolate flex items-end overflow-hidden text-crema ${noche ? "bg-noche" : "bg-marino-900"} ${
        compact ? "min-h-[48svh]" : "min-h-[62svh] sm:min-h-[70svh]"
      }`}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {video ? (
          <AmbientVideo video={video} threshold={0.01} />
        ) : image ? (
          <Image src={image.src} alt="" fill priority sizes="100vw" className="animate-kenburns object-cover" />
        ) : (
          <div className={`absolute inset-0 ${noche ? "hex-pattern-night" : "hex-pattern-night opacity-80"}`} />
        )}
        {ambiente && !video ? (
          <div className={`absolute inset-0 ${noche ? "opacity-50 mix-blend-screen" : "opacity-40 mix-blend-soft-light"}`}>
            <AmbientVideo video={ambiente} threshold={0.01} showPoster={false} afterLoadMs={1500} />
          </div>
        ) : null}
        <div className={`absolute inset-0 bg-gradient-to-t ${noche ? "from-noche via-noche/60 to-noche/25" : "from-marino-900 via-marino-900/55 to-carbon/20"}`} />
      </div>

      <div className="container-page w-full pb-12 pt-36 sm:pb-16 sm:pt-44">
        {(m || eyebrow) && (
          <p className={`eyebrow flex items-center gap-2 ${noche ? "text-neon" : "text-ratan"}`}>
            {m ? <Icon name={m.icon} className="h-4 w-4" /> : null}
            {[m?.label, eyebrow].filter(Boolean).join(" · ")}
          </p>
        )}
        <h1 id={id} className="mt-4">
          <WordReveal lines={[title]} className="display-lg block max-w-[16ch]" wordClassName={noche ? "neon-text" : ""} />
        </h1>
        {lead ? <div className="mt-5 max-w-2xl text-lg leading-relaxed text-crema/85 animate-fade-up [animation-delay:450ms]">{lead}</div> : null}
        {children}
      </div>
    </div>
  );
}
