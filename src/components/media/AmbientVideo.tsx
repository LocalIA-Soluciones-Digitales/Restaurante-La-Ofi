"use client";

import { useEffect, useRef, useState } from "react";
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
  afterLoadMs,
  revealOnPlay = false,
}: {
  video: VideoAsset;
  className?: string;
  threshold?: number;
  showPoster?: boolean;
  /** Retrasa la reproducción hasta `afterLoadMs` tras el evento load (vídeos sobre el LCP). */
  afterLoadMs?: number;
  /** Invisible hasta que empieza a reproducirse y entonces aparece con un fundido
   * (sobre una foto nítida: sin póster ni hueco negro mientras carga). */
  revealOnPlay?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(afterLoadMs === undefined);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (afterLoadMs === undefined) return;
    let t = 0;
    const go = () => (t = window.setTimeout(() => setReady(true), afterLoadMs));
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => {
      window.removeEventListener("load", go);
      window.clearTimeout(t);
    };
  }, [afterLoadMs]);
  usePlayWhenVisible(ref, threshold, ready);
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
      onPlaying={revealOnPlay ? () => setPlaying(true) : undefined}
      className={`pointer-events-none h-full w-full object-cover ${
        revealOnPlay ? `transition-opacity duration-1000 ease-out ${playing ? "opacity-100" : "opacity-0"}` : ""
      } ${className}`}
    >
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} media={s.media} />
      ))}
    </video>
  );
}
