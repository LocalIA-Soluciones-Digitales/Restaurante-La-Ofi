"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fondo que no compite con el LCP: el póster se pinta enseguida y el
 * vídeo solo se descarga tras la carga de la página, nunca con "reduce motion"
 * ni con ahorro de datos activado.
 */
export function HeroVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduceMotion || saveData) return;

    const start = () => {
      video.src = src;
      video.play().catch(() => undefined);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
