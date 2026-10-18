"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cifra que cuenta desde 0 la primera vez que entra en pantalla. El HTML del
 * servidor y la versión sin JavaScript muestran ya el valor final; con
 * "reducir movimiento" no cuenta. Formato español (coma decimal).
 */
export function CountUp({ value, decimals = 0, duration = 1400 }: { value: number; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          // ease-out exponencial: rápido al principio, se posa en el valor final.
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          setN(value * eased);
          if (p < 1) raf = requestAnimationFrame(step);
        };
        setN(0);
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
