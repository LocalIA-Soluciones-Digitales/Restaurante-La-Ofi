"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true si el usuario pide reducir el movimiento. En servidor se asume que sí
 * (lo más seguro: se pinta el estado final sin animación). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}

/** Lectura puntual fuera de React. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

/** Conexión lenta o "ahorro de datos": no se descargan vídeos. */
export function prefersLightMedia(): boolean {
  if (typeof navigator === "undefined") return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g";
}
