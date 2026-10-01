"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { loadGsap } from "@/lib/motion/gsap";

type LenisInstance = InstanceType<typeof import("lenis").default>;

let lenisRef: LenisInstance | null = null;

/** Lenis activo (null en móvil, con reduced motion o antes de cargarse). */
export function getLenis(): LenisInstance | null {
  return lenisRef;
}

/** Desplaza suavemente con Lenis si está activo; si no, con el scroll nativo. */
export function scrollToTarget(target: HTMLElement, offset = 0) {
  if (lenisRef) lenisRef.scrollTo(target, { offset, duration: 1.3 });
  else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * Scroll suave de Lenis sincronizado con ScrollTrigger (integración estándar de
 * Amway `SmoothScroll`). Diferencias a propósito, por rendimiento:
 *  - No envuelve el árbol: no añade nada al render inicial.
 *  - Solo con puntero fino (ratón/trackpad) y sin `prefers-reduced-motion`: en
 *    móvil el scroll nativo ya es suave y Lenis solo añadiría JS.
 *  - Se carga cuando el navegador está ocioso, después del `load`.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import("lenis"), loadGsap()]);
      if (cancelled) return;

      const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false, gestureOrientation: "both" });
      lenisRef = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Lenis solo remide al cambiar <html>; el contenido que crece después
      // (imágenes, secciones diferidas) dejaría un límite de scroll obsoleto.
      let frame = 0;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          lenis.resize();
          ScrollTrigger.refresh();
        });
      });
      observer.observe(document.body);

      cleanup = () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef = null;
      };
    };

    const idle = (cb: () => void) => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cb, { timeout: 2500 });
      else setTimeout(cb, 1200);
    };
    const run = () => idle(() => void start());
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", run);
      cleanup?.();
    };
  }, []);

  return null;
}
