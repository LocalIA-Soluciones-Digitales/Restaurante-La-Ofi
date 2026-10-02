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
}: {
  video: VideoAsset;
  className?: string;
  threshold?: number;
  showPoster?: boolean;
  /** Retrasa la reproducción hasta `afterLoadMs` tras el evento load (vídeos sobre el LCP). */
  afterLoadMs?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(afterLoadMs === undefined);
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
      className={`pointer-events-none h-full w-full object-cover ${className}`}
    >
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} media={s.media} />
      ))}
    </video>
  );
}
