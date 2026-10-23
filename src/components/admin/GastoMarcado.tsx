"use client";

import { useMemo, useState } from "react";
import type { MarcasGasto, TipoMarca } from "@/lib/gastos/marcas";

// Un color por cada dato: el mismo en la foto y junto a su casilla del
// formulario, para ver de un vistazo de dónde ha salido cada cosa (como en
// el lector de albaranes de Arrantza).
export const COLOR_MARCA: Record<TipoMarca, string> = {
  proveedor: "#8b5cf6",
  cif: "#6366f1",
  fecha: "#0ea5e9",
  numero: "#84cc16",
  producto: "#f59e0b",
  cantidad: "#3b82f6",
  precio: "#ec4899",
  importe: "#14b8a6",
  iva: "#f97316",
  total: "#dc2626",
  texto: "#94a3b8",
};

const NOMBRE_MARCA: Record<TipoMarca, string> = {
  proveedor: "Proveedor",
  cif: "CIF",
  fecha: "Fecha",
  numero: "Número",
  producto: "Concepto",
  cantidad: "Cantidad",
  precio: "Precio",
  importe: "Importe",
  iva: "IVA",
  total: "Total",
  texto: "Resto del texto",
};

const ORDEN: TipoMarca[] = ["proveedor", "cif", "fecha", "numero", "producto", "cantidad", "precio", "importe", "iva", "total"];

export function PuntoColor({ tipo }: { tipo: TipoMarca }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR_MARCA[tipo] }} />;
}

/** Etiqueta de casilla con el punto del color de su recuadro en la foto. */
export function Etiqueta({ tipo, children }: { tipo?: TipoMarca; children: string }) {
  if (!tipo) return children;
  return (
    <span className="inline-flex items-center gap-1.5">
      <PuntoColor tipo={tipo} />
      {children}
    </span>
  );
}

// La foto con los recuadros encima: un único SVG escalado con la imagen
// (unos cientos de rectángulos, sin coste apreciable) y debajo la leyenda,
// que resalta un dato al tocarlo.
export function FotoMarcada({ src, marcas }: { src: string; marcas: MarcasGasto | null }) {
  const [resto, setResto] = useState(false);
  const [foco, setFoco] = useState<TipoMarca | null>(null);

  const rects = useMemo(
    () =>
      (marcas?.m ?? [])
        .filter(([k]) => resto || k !== "texto")
        .map(([k, x, y, w, h], i) => {
          const apagado = foco != null && k !== foco;
          const gris = k === "texto";
          return (
            <rect
              key={i}
              x={x - 2}
              y={y - 2}
              width={w + 4}
              height={h + 4}
              fill={gris ? "none" : COLOR_MARCA[k]}
              fillOpacity={apagado ? 0.04 : 0.2}
              stroke={COLOR_MARCA[k]}
              strokeOpacity={apagado ? 0.15 : gris ? 0.6 : 1}
              strokeWidth={gris ? 1 : 2}
              vectorEffect="non-scaling-stroke"
            />
          );
        }),
    [marcas, resto, foco],
  );
  const presentes = useMemo(() => new Set(marcas?.m.map(([k]) => k)), [marcas]);
  const chips = ORDEN.filter((k) => presentes.has(k));

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-xl border border-carbon/10 bg-white dark:border-crema/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: o enlace firmado temporal */}
        <img src={src} alt="Documento del gasto" className="block h-auto w-full" />
        {rects.length ? (
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {rects}
          </svg>
        ) : null}
      </div>
      {marcas ? (
        <div className="grid gap-2">
          {chips.length ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Resaltar un dato en la foto">
              {chips.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={foco === k}
                  onClick={() => setFoco((f) => (f === k ? null : k))}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-opacity ${
                    foco === k ? "border-marino bg-marino text-white dark:border-neon dark:bg-neon dark:text-noche" : "border-carbon/15 dark:border-crema/15"
                  } ${foco && foco !== k ? "opacity-50" : ""}`}
                >
                  <PuntoColor tipo={k} />
                  {NOMBRE_MARCA[k]}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-carbon-muted dark:text-crema/60">No ha sabido situar ningún dato en la foto: revísalo todo a mano.</p>
          )}
          <label className="inline-flex items-center gap-2 text-xs text-carbon-muted dark:text-crema/60">
            <input type="checkbox" checked={resto} onChange={(e) => setResto(e.target.checked)} />
            Ver también el resto del texto leído (gris)
          </label>
        </div>
      ) : null}
    </div>
  );
}
