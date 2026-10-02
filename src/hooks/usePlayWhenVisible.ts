"use client";

import { useEffect, type RefObject } from "react";
import { prefersLightMedia, prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Reproduce un vídeo mudo en bucle solo mientras está en pantalla y lo pausa al
 * salir (patrón de Amway). Se combina con preload="none": no se descarga nada
 * hasta que el vídeo está a punto de verse. Con "reducir movimiento" o ahorro de
 * datos se queda en el póster.
 */
export function usePlayWhenVisible(ref: RefObject<HTMLVideoElement | null>, threshold = 0.35, enabled = true) {
  useEffect(() => {
    const video = ref.current;
    if (!video || !enabled) return;
    if (prefersReducedMotion() || prefersLightMedia()) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [ref, threshold, enabled]);
}
