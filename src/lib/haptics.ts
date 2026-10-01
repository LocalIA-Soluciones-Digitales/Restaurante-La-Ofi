import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Vibración corta de confirmación (añadir a la cesta, pedido listo…). Portado de
 * Palomita-Bar. No-op si el navegador no lo soporta (p. ej. iOS Safari) o si el
 * usuario pide reducir el movimiento.
 */
export function vibrar(patron: number | number[] = 12) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator) || prefersReducedMotion()) return;
  navigator.vibrate(patron);
}
