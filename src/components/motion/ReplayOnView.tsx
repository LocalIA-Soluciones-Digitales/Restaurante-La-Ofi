"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Relanza las animaciones CSS de sus hijos (p. ej. el revelado por palabras) en el
 * momento en que entran en pantalla. Sin JS o con "reducir movimiento" no hace
 * nada: el contenido se ve tal cual.
 */
export function ReplayOnView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        el.querySelectorAll<HTMLElement>(".word-mask, .word-mask > span").forEach((node) => {
          node.style.animation = "none";
          void node.offsetWidth; // fuerza el reinicio de la animación
          node.style.animation = "";
        });
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
