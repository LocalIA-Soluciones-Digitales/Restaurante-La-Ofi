"use client";

import Image, { type StaticImageData } from "next/image";
import { useState, type ReactNode } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Icon } from "@/components/ui/Icon";
import { videoSources, type VideoAsset } from "@/lib/media";

/**
 * "Video moment" (patrón EnergyVideoMoment de Amway): un vídeo grande que solo se
 * descarga cuando el visitante pulsa reproducir. Si todavía no hay vídeo real, la
 * sección se queda como momento fotográfico (foto real + ambiente generado) y NO
 * muestra botón de reproducir: nunca se promete un vídeo que no existe.
 */
export function VideoMoment({
  id,
  video,
  ambiente,
  poster,
  eyebrow,
  title,
  children,
}: {
  id: string;
  video: VideoAsset | null;
  ambiente: VideoAsset | null;
  poster: { src: StaticImageData; alt: string; credit?: string };
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  const [playing, setPlaying] = useState(false);
  const fuentes = video ? videoSources(video) : null;

  return (
    <section aria-labelledby={id} className="cv-auto grain relative isolate flex min-h-[78svh] items-center justify-center overflow-hidden bg-[#0a0604] text-crema sm:min-h-[90svh]">
      {playing && fuentes ? (
        <video className="absolute inset-0 h-full w-full object-cover" poster={fuentes.poster} controls autoPlay playsInline aria-label={video!.label}>
          {fuentes.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} media={s.media} />
          ))}
        </video>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <Image src={poster.src} alt="" fill sizes="100vw" className="parallax-soft object-cover opacity-70" />
          </div>
          {ambiente ? (
            <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 mix-blend-screen">
              <AmbientVideo video={ambiente} showPoster={false} />
            </div>
          ) : null}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a0604] via-[#0a0604]/50 to-[#0a0604]/30" />

          <div className="container-page reveal relative flex flex-col items-center gap-6 py-24 text-center">
            <p className="eyebrow text-ratan">{eyebrow}</p>
            <h2 id={id} className="display-lg max-w-4xl text-crema">
              {title}
            </h2>
            {children}
            {fuentes ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group relative mt-4 grid h-20 w-20 place-items-center rounded-full bg-crema text-carbon transition-transform duration-300 hover:scale-110 active:scale-95 sm:h-24 sm:w-24"
              >
                <span aria-hidden="true" className="absolute inset-0 rounded-full bg-crema/40 blur-xl motion-safe:animate-pulse" />
                <Icon name="play" className="relative ml-1 h-8 w-8 fill-carbon" />
                <span className="sr-only">Reproducir vídeo: {video!.label}</span>
              </button>
            ) : null}
          </div>
          {poster.credit ? <p className="absolute bottom-4 right-4 text-xs text-crema/50">Foto: {poster.credit}</p> : null}
        </>
      )}
    </section>
  );
}
