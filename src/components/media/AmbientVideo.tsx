"use client";

import { useRef } from "react";
import { usePlayWhenVisible } from "@/hooks/usePlayWhenVisible";
import { videoSources, type VideoAsset } from "@/lib/media";

/**
 * Vídeo de fondo mudo en bucle. `preload="none"` + póster: no descarga nada hasta
 * que entra en pantalla, y con "reducir movimiento" o ahorro de datos se queda en
 * el póster (usePlayWhenVisible). 720p en móvil, 1080p desde 1024 px.
 */
export function AmbientVideo({
  video,
  className = "",
  threshold = 0.2,
  showPoster = true,
}: {
  video: VideoAsset;
  className?: string;
  threshold?: number;
  showPoster?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  usePlayWhenVisible(ref, threshold);
  const { poster, sources } = videoSources(video);
  const decorative = video.label === "";

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={showPoster ? poster : undefined}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : video.label}
      tabIndex={-1}
      disablePictureInPicture
      className={`pointer-events-none h-full w-full object-cover ${className}`}
    >
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} media={s.media} />
      ))}
    </video>
  );
}
