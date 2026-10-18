"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import type { ImageKey } from "@/lib/images";

export interface Momento {
  titulo: string;
  texto: string;
  href: string;
  img: ImageKey;
}

/**
 * Índice de La Ofi como lista de filas a todo el ancho: título grande, una línea
 * y "Saber más". Con ratón, la foto de la fila aparece junto al cursor y lo
 * sigue con un leve retraso (interpolación por frame, solo transform). En
 * táctil, o con "reducir movimiento" sin el retraso, la lista funciona igual.
 */
export function ParaCadaMomento({ items }: { items: Momento[] }) {
  const [activo, setActivo] = useState(0);
  const [visible, setVisible] = useState(false);
  const [puntero, setPuntero] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const objetivo = useRef({ x: 0, y: 0 });
  const actual = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setPuntero(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!puntero || !visible) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      const k = suave ? 0.16 : 1;
      actual.current.x += (objetivo.current.x - actual.current.x) * k;
      actual.current.y += (objetivo.current.y - actual.current.y) * k;
      if (caja.current) caja.current.style.transform = `translate3d(${actual.current.x}px, ${actual.current.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [puntero, visible]);

  const mover = (e: React.PointerEvent) => {
    objetivo.current = { x: e.clientX + 28, y: e.clientY - 140 };
    // Primera entrada: aparece donde está el cursor, sin viajar desde la esquina.
    if (!visible) actual.current = { ...objetivo.current };
  };

  return (
    <section aria-labelledby="momentos-title" className="section bg-papel-2">
      <div className="container-wide">
        <SectionRule id="momentos-title" title="Para cada momento" aside={<span>{items.length} formas de venir</span>} />

        <ul className="mt-10 border-t border-tinta-line" onPointerMove={mover} onPointerEnter={() => setVisible(true)} onPointerLeave={() => setVisible(false)}>
          {items.map((m, i) => (
            <li key={m.href} className="border-b border-tinta-line">
              <Link
                href={m.href}
                onPointerEnter={() => setActivo(i)}
                onFocus={() => setActivo(i)}
                className="group grid grid-cols-[2rem_1fr_auto] items-center gap-x-4 py-6 sm:grid-cols-[3rem_1fr_1fr_auto] sm:py-8"
              >
                <span aria-hidden="true" className="text-xs tabular-nums text-carbon-muted">
                  0{i + 1}
                </span>
                <span className="block font-display text-[clamp(1.6rem,1.1rem+2.2vw,3.4rem)] font-light leading-[1.05] tracking-[-0.015em] text-carbon transition-[color,transform] duration-300 ease-out-expo group-hover:text-brasa motion-safe:group-hover:translate-x-2">
                  {m.titulo}
                </span>
                <span className="col-start-2 mt-1 block text-sm leading-relaxed text-carbon-muted sm:col-start-3 sm:mt-0">{m.texto}</span>
                <span className="kicker hidden items-center gap-2 text-carbon sm:inline-flex">
                  Saber más
                  <Icon name="arrow" className="h-4 w-4 text-brasa transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <Icon name="arrow" className="col-start-3 row-start-1 h-4 w-4 text-brasa sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {puntero ? (
        <div ref={caja} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 will-change-transform">
          <div
            className={`relative aspect-[4/5] w-[19rem] overflow-hidden bg-papel-3 shadow-lift transition-[opacity,transform] duration-300 ease-out-expo ${
              visible ? "scale-100 opacity-100" : "scale-[0.94] opacity-0"
            }`}
          >
            {items.map((m, i) => (
              <div key={m.href} className={`absolute inset-0 transition-opacity duration-300 ease-out ${i === activo ? "opacity-100" : "opacity-0"}`}>
                <Photo img={m.img} sizes="19rem" mobileBelow={9999} decorative />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
