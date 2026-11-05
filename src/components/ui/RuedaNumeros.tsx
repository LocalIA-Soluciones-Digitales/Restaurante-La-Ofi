"use client";

import { useCallback, useEffect, useRef } from "react";

const FILA = 40; // alto de cada número (px)
const VISIBLES = 5; // filas a la vista: la del medio es la elegida

/**
 * Una rueda de números como la del reloj del móvil: se desliza con el dedo (o la rueda
 * del ratón) y se queda en el número que cae en la franja del medio. También se toca un
 * número para ir a él, y con el teclado, flechas arriba y abajo.
 */
export function RuedaNumeros({
  valores,
  valor,
  onCambio,
  etiqueta,
}: {
  valores: string[];
  valor: string;
  onCambio: (v: string) => void;
  etiqueta: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const programado = useRef(false);
  const parada = useRef<number | null>(null);
  const indice = Math.max(0, valores.indexOf(valor));

  // Si el valor cambia desde fuera (al abrir, o al ajustarse a la hora de apertura), la
  // rueda va a él sin avisar de vuelta.
  useEffect(() => {
    const el = caja.current;
    if (!el || Math.round(el.scrollTop / FILA) === indice) return;
    programado.current = true;
    el.scrollTo({ top: indice * FILA, behavior: "auto" });
    window.setTimeout(() => (programado.current = false), 60);
  }, [indice]);

  const asentar = useCallback(() => {
    const el = caja.current;
    if (!el) return;
    const i = Math.min(valores.length - 1, Math.max(0, Math.round(el.scrollTop / FILA)));
    if (valores[i] !== undefined && valores[i] !== valor) onCambio(valores[i]!);
  }, [valores, valor, onCambio]);

  const alDesplazar = () => {
    if (programado.current) return;
    // Cuando deja de moverse (con el impulso del dedo incluido), se queda con ese número.
    if (parada.current) window.clearTimeout(parada.current);
    parada.current = window.setTimeout(asentar, 110);
  };

  useEffect(() => () => void (parada.current && window.clearTimeout(parada.current)), []);

  const ir = (i: number) => {
    const destino = Math.min(valores.length - 1, Math.max(0, i));
    caja.current?.scrollTo({ top: destino * FILA, behavior: "smooth" });
  };

  return (
    <div className="relative" style={{ height: FILA * VISIBLES }}>
      {/* Franja de la elección y degradados arriba y abajo, como en el móvil. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-arena" />
      <div
        ref={caja}
        role="listbox"
        tabIndex={0}
        aria-label={etiqueta}
        aria-activedescendant={`rueda-${etiqueta}-${indice}`}
        onScroll={alDesplazar}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            ir(indice + (e.key === "ArrowDown" ? 1 : -1));
          }
        }}
        className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon [&::-webkit-scrollbar]:hidden"
        style={{
          paddingBlock: FILA * Math.floor(VISIBLES / 2),
          maskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
        }}
      >
        {valores.map((v, i) => (
          <div
            key={v}
            id={`rueda-${etiqueta}-${i}`}
            role="option"
            aria-selected={i === indice}
            onClick={() => ir(i)}
            className={`grid snap-center place-items-center font-display text-2xl tabular-nums transition-colors ${
              i === indice ? "font-semibold text-carbon" : "text-carbon/45"
            } cursor-pointer select-none`}
            style={{ height: FILA }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}
