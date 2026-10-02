"use client";

import { useState } from "react";

/**
 * Barras verticales de UNA serie (magnitud): un solo tono (marino; neón en modo
 * oscuro, contraste ≥ 3:1 validado sobre ambas superficies), extremos de datos
 * redondeados de 4 px anclados a la base, 2 px de separación, rejilla recesiva y
 * tooltip por barra (teclado incluido). Una serie no lleva leyenda: el título la
 * nombra. Siempre se acompaña de una tabla con los mismos datos.
 */
export function BarChart({
  titulo,
  datos,
  formato,
  alto = 180,
}: {
  titulo: string;
  datos: { etiqueta: string; valor: number; detalle?: string }[];
  formato: (v: number) => string;
  alto?: number;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const ancho = Math.max(320, datos.length * 28);
  const barra = ancho / Math.max(1, datos.length);
  const lineas = [0.25, 0.5, 0.75, 1];

  return (
    <figure className="relative">
      <figcaption className="mb-2 text-sm font-semibold">{titulo}</figcaption>
      {datos.length === 0 ? (
        <p className="py-8 text-center text-sm opacity-60">Sin datos en este periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${ancho} ${alto + 22}`} className="h-auto w-full min-w-[320px]" role="img" aria-label={`${titulo}: gráfico de barras; los datos están en la tabla de abajo`}>
            {lineas.map((l) => (
              <line key={l} x1="0" x2={ancho} y1={alto - alto * l} y2={alto - alto * l} className="stroke-carbon/10 dark:stroke-crema/10" strokeWidth="1" />
            ))}
            <line x1="0" x2={ancho} y1={alto} y2={alto} className="stroke-carbon/30 dark:stroke-crema/30" strokeWidth="1" />
            {datos.map((d, i) => {
              const h = Math.max(d.valor > 0 ? 2 : 0, (d.valor / max) * (alto - 8));
              const x = i * barra + 1;
              const w = Math.max(2, barra - 2);
              const r = Math.min(4, w / 2, h);
              const y = alto - h;
              // Rectángulo con solo las esquinas superiores redondeadas (extremo de datos).
              const path = `M${x},${alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${alto} Z`;
              return (
                <g
                  key={d.etiqueta}
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.etiqueta}: ${formato(d.valor)}${d.detalle ? `, ${d.detalle}` : ""}`}
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  className="outline-none"
                >
                  {/* Zona de contacto más grande que la barra */}
                  <rect x={i * barra} y="0" width={barra} height={alto} fill="transparent" />
                  <path d={path} className={`fill-marino dark:fill-neon ${activo !== null && activo !== i ? "opacity-50" : ""}`} />
                  {datos.length <= 24 && (i % Math.ceil(datos.length / 12) === 0) ? (
                    <text x={x + w / 2} y={alto + 15} textAnchor="middle" fontSize="10" className="fill-carbon-muted dark:fill-crema/60">
                      {d.etiqueta}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      {activo !== null && datos[activo] ? (
        <div role="tooltip" className="pointer-events-none absolute right-0 top-0 rounded-xl bg-noche px-3 py-2 text-sm text-crema shadow-lift">
          <b>{datos[activo].etiqueta}</b> · {formato(datos[activo].valor)}
          {datos[activo].detalle ? <span className="block text-xs text-crema/70">{datos[activo].detalle}</span> : null}
        </div>
      ) : null}
    </figure>
  );
}
