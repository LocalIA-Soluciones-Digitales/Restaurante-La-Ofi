"use client";

import { useRef, useState } from "react";
import { posicionesPorDefecto, tamanoMesa, minutosDesde, type PosMesa } from "@/lib/admin/plano";
import { ESTADO_MESA, estadoMesa, type MesaSalon, type Zona } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";

const W = 1000;
const H = 620;
const COLOR_ZONA: Record<Zona["tipo"], string> = {
  barra: "#1E3557",
  comedor: "#A9784A",
  despacho: "#96442B",
  terraza: "#56653A",
  otra: "#5E554B",
};

/**
 * Plano 2D (vista superior) del salón: zonas, mesas coloreadas por estado, tiempo
 * sentado, importe acumulado y avisos. En modo edición las mesas se arrastran
 * (posición en % del plano, se guarda al soltar).
 */
export function Plano2D({
  zonas,
  mesas,
  seleccion,
  multiSeleccion,
  editar,
  onSelect,
  onMover,
}: {
  zonas: Zona[];
  mesas: MesaSalon[];
  seleccion: string | null;
  multiSeleccion: string[];
  editar: boolean;
  onSelect: (id: string) => void;
  onMover: (id: string, pos: PosMesa) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastre, setArrastre] = useState<{ id: string; pos: PosMesa } | null>(null);
  const pos = posicionesPorDefecto(zonas, mesas);
  const ahora = Date.now();

  const aPorcentaje = (e: React.PointerEvent): PosMesa | null => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(98, Math.max(2, ((e.clientY - r.top) / r.height) * 100)),
    };
  };

  // Uniones de mesas: una línea discontinua entre las mesas del mismo grupo.
  const grupos = new Map<string, MesaSalon[]>();
  for (const m of mesas) if (m.union_grupo_id) grupos.set(m.union_grupo_id, [...(grupos.get(m.union_grupo_id) ?? []), m]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label="Plano del salón"
      className={`h-auto w-full touch-none select-none rounded-[1.5rem] bg-arena/60 dark:bg-noche-3 ${editar ? "cursor-move" : ""}`}
      onPointerMove={(e) => {
        if (!arrastre) return;
        const p = aPorcentaje(e);
        if (p) setArrastre({ id: arrastre.id, pos: p });
      }}
      onPointerUp={() => {
        if (arrastre) onMover(arrastre.id, arrastre.pos);
        setArrastre(null);
      }}
      onPointerLeave={() => setArrastre(null)}
    >
      <defs>
        <pattern id="hex" width="28" height="24" patternUnits="userSpaceOnUse">
          <path d="M7 0h14l7 12-7 12H7L0 12z" fill="none" stroke="currentColor" strokeOpacity=".08" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#hex)" className="text-marino dark:text-neon" />

      {zonas.map((z) => (
        <g key={z.id}>
          <rect
            x={(Number(z.x) / 100) * W}
            y={(Number(z.y) / 100) * H}
            width={(Number(z.ancho) / 100) * W}
            height={(Number(z.alto) / 100) * H}
            rx="18"
            fill={COLOR_ZONA[z.tipo]}
            fillOpacity=".08"
            stroke={COLOR_ZONA[z.tipo]}
            strokeOpacity=".35"
            strokeWidth="2"
            strokeDasharray={z.tipo === "terraza" ? "8 6" : undefined}
          />
          <text x={(Number(z.x) / 100) * W + 14} y={(Number(z.y) / 100) * H + 26} fontSize="17" fontWeight="700" fill={COLOR_ZONA[z.tipo]} className="dark:fill-crema/70">
            {z.nombre}
          </text>
        </g>
      ))}

      {[...grupos.values()].map((g) =>
        g.slice(1).map((m, i) => {
          const a = pos.get(g[i]!.id)!;
          const b = pos.get(m.id)!;
          return (
            <line key={m.id} x1={(a.x / 100) * W} y1={(a.y / 100) * H} x2={(b.x / 100) * W} y2={(b.y / 100) * H} stroke="#8E7CF0" strokeWidth="4" strokeDasharray="6 6" />
          );
        }),
      )}

      {mesas.map((m) => {
        const p = arrastre?.id === m.id ? arrastre.pos : pos.get(m.id)!;
        const { w, h } = tamanoMesa(m);
        const cx = (p.x / 100) * W;
        const cy = (p.y / 100) * H;
        const est = ESTADO_MESA[estadoMesa(m)];
        const sel = seleccion === m.id || multiSeleccion.includes(m.id);
        const min = minutosDesde(m.entrada_at, ahora);
        const redonda = m.forma === "redonda" || m.forma === "taburete";
        return (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`${m.nombre ?? `Mesa ${m.numero}`}: ${est.label}${m.ocupada ? `, ${m.comensales} comensales` : ""}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(m.id)}
            onPointerDown={(e) => {
              onSelect(m.id);
              if (editar) {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setArrastre({ id: m.id, pos: p });
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>*:first-child]:stroke-[#96442B]"
          >
            {(m.aviso_camarero || m.pide_cuenta) && !editar ? (
              <circle cx={cx} cy={cy} r={Math.max(w, h) / 2 + 14} fill="none" stroke="#8E7CF0" strokeWidth="4" className="motion-safe:animate-pulse" />
            ) : null}
            {redonda ? (
              <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={est.color} stroke={sel ? "#0B1424" : "#fff"} strokeWidth={sel ? 5 : 3} />
            ) : (
              <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="10" fill={est.color} stroke={sel ? "#0B1424" : "#fff"} strokeWidth={sel ? 5 : 3} />
            )}
            <text x={cx} y={cy + (m.ocupada ? -2 : 6)} textAnchor="middle" fontSize={m.forma === "taburete" ? 12 : 18} fontWeight="800" fill={estadoMesa(m) === "limpiar" ? "#2B2722" : "#fff"}>
              {m.numero}
            </text>
            {m.ocupada && m.forma !== "taburete" ? (
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
                {m.comensales}p{min !== null ? ` · ${min}′` : ""}
              </text>
            ) : null}
            {m.ocupada && m.importe_centimos > 0 && !editar ? (
              <text x={cx} y={cy + h / 2 + 16} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-carbon dark:fill-crema">
                {formatCentimos(m.importe_centimos)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
