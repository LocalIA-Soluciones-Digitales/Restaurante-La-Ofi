"use client";

import { useRef, useState } from "react";
import { posicionesPorDefecto, puestosMesa, tamanoMesa, minutosDesde, type PosMesa } from "@/lib/admin/plano";
import { ESTADO_MESA, estadoMesa, type EstadoMesa, type MesaSalon, type Zona } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";

// Lienzo del plano (mismas proporciones que el 3D: 1 m de escena = 50 unidades).
const W = 1000;
const H = 620;
const M = 50;
const INTERIOR: Zona["tipo"][] = ["barra", "comedor", "despacho"];
const SUELO: Record<Zona["tipo"], string> = {
  barra: "#bdbab3",
  comedor: "url(#baldosa)",
  despacho: "#d9cdbf",
  terraza: "#3a4150",
  otra: "#9aa1ab",
};
/** Minutos sentados a partir de los que la mesa se marca como "lleva mucho". */
const LARGA = 90;

const esChillOut = (z: Zona) => z.tipo === "otra" && /chill|lounge/i.test(`${z.slug} ${z.nombre}`);

function rect(z: Zona) {
  return { x: (Number(z.x) / 100) * W, y: (Number(z.y) / 100) * H, w: (Number(z.ancho) / 100) * W, h: (Number(z.alto) / 100) * H };
}

/**
 * Plano 2D (vista cenital) del salón, ambientado como el 3D y el local real
 * (fotos públicas): césped alrededor, pabellón con fachada de cristal, barra con
 * neón, comedor de baldosa hexagonal con lámparas de ratán, carpa en la terraza y
 * sofás en el chill-out. Cada mesa lleva sus sillas, el color de su estado, tiempo
 * sentado, importe, reserva próxima, nota y avisos. En modo edición las mesas se
 * arrastran (posición en % del plano, se guarda al soltar).
 */
export function Plano2D({
  zonas,
  mesas,
  seleccion,
  multiSeleccion,
  editar,
  filtro,
  onSelect,
  onMover,
}: {
  zonas: Zona[];
  mesas: MesaSalon[];
  seleccion: string | null;
  multiSeleccion: string[];
  editar: boolean;
  filtro: EstadoMesa | null;
  onSelect: (id: string) => void;
  onMover: (id: string, pos: PosMesa) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastre, setArrastre] = useState<{ id: string; pos: PosMesa } | null>(null);
  const pos = posicionesPorDefecto(zonas, mesas);
  const ahora = Date.now();
  const zonaDe = new Map(zonas.map((z) => [z.id, z]));
  const interiores = zonas.filter((z) => INTERIOR.includes(z.tipo));
  const izq = Math.min(...interiores.map((z) => Number(z.x)));
  const der = Math.max(...interiores.map((z) => Number(z.x) + Number(z.ancho)));

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
      className={`h-auto w-full touch-none select-none rounded-[1.5rem] bg-[#162a1e] ${editar ? "cursor-move" : ""}`}
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
        {/* Baldosa hidráulica hexagonal del comedor (blanco, grises y azules). */}
        <pattern id="baldosa" width="30" height="52" patternUnits="userSpaceOnUse">
          {/* Tonos suaves: el suelo ambienta, pero no compite con las mesas. */}
          <rect width="30" height="52" fill="#ebe7df" />
          <path d="M7.5 0h15L30 13 22.5 26h-15L0 13z" fill="#f2f0eb" />
          <path d="M7.5 26h15L30 39l-7.5 13h-15L0 39z" fill="#dfe2e7" />
          <path d="M22.5 13h15L45 26l-7.5 13h-15L15 26z" fill="#ccd3de" />
          <path d="M-7.5 13h15L15 26 7.5 39h-15L-15 26z" fill="#e6e9ed" />
          <path d="M7.5 0h15L30 13 22.5 26h-15L0 13zM7.5 26h15L30 39l-7.5 13h-15L0 39z" fill="none" stroke="#d3cdc2" strokeWidth=".8" />
        </pattern>
        <pattern id="cesped" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#162a1e" />
          <path d="M2 4h1M9 2h1M6 10h1M12 8h1" stroke="#1f3a29" strokeWidth="1.4" />
        </pattern>
        <radialGradient id="luzCalida">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="luzMorada">
          <stop offset="0" stopColor="#7a5cff" stopOpacity=".38" />
          <stop offset="1" stopColor="#7a5cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="luzAzul">
          <stop offset="0" stopColor="#2f7bff" stopOpacity=".32" />
          <stop offset="1" stopColor="#2f7bff" stopOpacity="0" />
        </radialGradient>
        <filter id="neon" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="sombra" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity=".35" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#cesped)" />

      {/* Suelos */}
      {zonas.map((z) => {
        const r = rect(z);
        return <rect key={`s-${z.id}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={esChillOut(z) ? "#2f5a35" : SUELO[z.tipo]} />;
      })}

      {/* Ambientación por zona (debajo de las mesas) */}
      {zonas.map((z) => {
        const r = rect(z);
        if (z.tipo === "terraza") {
          const mastiles: [number, number][] = [
            [0, 0], [r.w / 2, 0], [r.w, 0], [0, r.h], [r.w / 2, r.h], [r.w, r.h], [r.w / 4, r.h / 2], [(3 * r.w) / 4, r.h / 2],
          ];
          return (
            <g key={`a-${z.id}`} pointerEvents="none">
              <ellipse cx={r.x + r.w / 4} cy={r.y + r.h / 2} rx={r.w / 3} ry={r.h / 1.6} fill="url(#luzMorada)" />
              <ellipse cx={r.x + (3 * r.w) / 4} cy={r.y + r.h / 2} rx={r.w / 3} ry={r.h / 1.6} fill="url(#luzAzul)" />
              {/* Lona de la carpa: contorno y costuras hacia los mástiles */}
              <rect x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} rx="10" fill="none" stroke="#f4f1ff" strokeOpacity=".35" strokeWidth="2" strokeDasharray="10 6" />
              <path d={`M${r.x} ${r.y}L${r.x + r.w / 4} ${r.y + r.h / 2}L${r.x} ${r.y + r.h}M${r.x + r.w / 2} ${r.y}L${r.x + r.w / 4} ${r.y + r.h / 2}L${r.x + r.w / 2} ${r.y + r.h}L${r.x + (3 * r.w) / 4} ${r.y + r.h / 2}L${r.x + r.w / 2} ${r.y}M${r.x + r.w} ${r.y}L${r.x + (3 * r.w) / 4} ${r.y + r.h / 2}L${r.x + r.w} ${r.y + r.h}`} fill="none" stroke="#f4f1ff" strokeOpacity=".12" strokeWidth="1.5" />
              <line x1={r.x + 6} y1={r.y + r.h - 3} x2={r.x + r.w - 6} y2={r.y + r.h - 3} stroke="#ffe2b0" strokeWidth="2.5" strokeOpacity=".8" />
              {mastiles.map(([mx, my], i) => (
                <circle key={i} cx={r.x + mx} cy={r.y + my} r="4.5" fill="#d9dce2" stroke="#0b1424" strokeWidth="1.5" />
              ))}
            </g>
          );
        }
        if (esChillOut(z)) {
          const grupos: [number, number][] = [
            [r.x + r.w * 0.28, r.y + r.h * 0.3],
            [r.x + r.w * 0.72, r.y + r.h * 0.7],
          ];
          return (
            <g key={`a-${z.id}`} pointerEvents="none">
              {grupos.map(([gx, gy], i) => (
                <g key={i} transform={`translate(${gx} ${gy})`} filter="url(#sombra)">
                  <rect x="-24" y="-38" width="48" height="22" rx="5" fill="#2b2f38" />
                  <rect x="-48" y="-14" width="22" height="46" rx="5" fill="#2b2f38" />
                  <rect x="26" y="-14" width="22" height="46" rx="5" fill="#2b2f38" />
                  <rect x="-14" y="-6" width="28" height="22" rx="3" fill="#1b1f27" />
                </g>
              ))}
            </g>
          );
        }
        if (z.tipo === "barra") {
          const largo = r.w * 0.72;
          const yc = r.y + Math.min(55, r.h * 0.28);
          const lamparas = Math.max(3, Math.round(largo / M / 1.1));
          return (
            <g key={`a-${z.id}`} pointerEvents="none">
              <ellipse cx={r.x + r.w / 2} cy={yc + 10} rx={largo / 1.6} ry="60" fill="url(#luzCalida)" />
              {/* Botellero y cafeteras contra la pared */}
              <rect x={r.x + r.w / 2 + largo * 0.14} y={r.y + 4} width={largo * 0.32} height="12" rx="2" fill="#c79a5b" />
              {/* Mostrador: frontal de listones y encimera negra */}
              <rect x={r.x + r.w / 2 - largo / 2} y={yc - 14} width={largo} height="28" rx="4" fill="#d8c19c" stroke="#141414" strokeWidth="5" filter="url(#sombra)" />
              {[-0.32, -0.18].map((f) => (
                <rect key={f} x={r.x + r.w / 2 + largo * f - 12} y={yc - 10} width="24" height="18" rx="3" fill="#aeb4bd" stroke="#6b7280" />
              ))}
              {Array.from({ length: lamparas }, (_, i) => (
                <circle key={i} cx={r.x + r.w / 2 - largo / 2 + (largo * (i + 0.5)) / lamparas} cy={yc + 4} r="5" fill="#111" stroke="#ffd9a0" strokeWidth="2" />
              ))}
              <text x={r.x + r.w / 2 - largo * 0.25} y={r.y + 24} textAnchor="middle" fontSize="20" fontWeight="600" fill="#f6f2ff" filter="url(#neon)" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
                la ofi
              </text>
            </g>
          );
        }
        if (z.tipo === "comedor") {
          return (
            <g key={`a-${z.id}`} pointerEvents="none">
              <rect x={r.x + r.w - M - 35} y={r.y + 4} width="70" height="11" rx="2" fill="#1c1c1f" />
              {Array.from({ length: 12 }, (_, i) => (
                <circle key={i} cx={r.x + r.w - M - 30 + i * 5.5} cy={r.y + 9.5} r="1.8" fill={i % 3 ? "#6b2a3a" : "#3f6b3a"} />
              ))}
            </g>
          );
        }
        if (z.tipo === "despacho") {
          return (
            <g key={`a-${z.id}`} pointerEvents="none">
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#luzCalida)" opacity=".7" />
              {Array.from({ length: 12 }, (_, i) => {
                const c = i % 4;
                const f = Math.floor(i / 4);
                return <circle key={i} cx={r.x + r.w * (0.15 + 0.233 * c)} cy={r.y + r.h * (0.2 + 0.3 * f)} r="3.5" fill="#fff1d0" stroke="#ffc27a" strokeWidth="2" opacity=".9" />;
              })}
            </g>
          );
        }
        return null;
      })}

      {/* Luz de las lámparas de ratán sobre las mesas del comedor */}
      {mesas.map((m) => {
        const z = m.zona_id ? zonaDe.get(m.zona_id) : undefined;
        if (z?.tipo !== "comedor") return null;
        const p = arrastre?.id === m.id ? arrastre.pos : pos.get(m.id)!;
        return <circle key={`l-${m.id}`} cx={(p.x / 100) * W} cy={(p.y / 100) * H} r="46" fill="url(#luzCalida)" pointerEvents="none" />;
      })}

      {/* Envolvente del pabellón: paredes y fachada de cristal hacia la terraza */}
      {interiores.map((z) => {
        const r = rect(z);
        const tramos = Math.max(2, Math.round(r.w / 55));
        const pared = (x1: number, y1: number, x2: number, y2: number, k: string) => (
          <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e6e8ec" strokeWidth="7" strokeLinecap="square" />
        );
        return (
          <g key={`e-${z.id}`} pointerEvents="none">
            {pared(r.x, r.y, r.x + r.w, r.y, "t")}
            {Number(z.x) === izq ? pared(r.x, r.y, r.x, r.y + r.h, "i") : null}
            {Number(z.x) + Number(z.ancho) === der ? pared(r.x + r.w, r.y, r.x + r.w, r.y + r.h, "d") : null}
            {z.tipo === "despacho" && Number(z.x) + Number(z.ancho) !== der ? (
              <line x1={r.x + r.w} y1={r.y} x2={r.x + r.w} y2={r.y + r.h} stroke="#a9cbff" strokeWidth="3" strokeOpacity=".8" />
            ) : null}
            <line x1={r.x} y1={r.y + r.h} x2={r.x + r.w} y2={r.y + r.h} stroke="#a9cbff" strokeWidth="4" strokeOpacity=".75" />
            {Array.from({ length: tramos + 1 }, (_, i) => (
              <rect key={i} x={r.x + (r.w * i) / tramos - 2} y={r.y + r.h - 3.5} width="4" height="7" fill="#2a2f38" />
            ))}
          </g>
        );
      })}

      {[...grupos.values()].map((g) =>
        g.slice(1).map((m, i) => {
          const a = pos.get(g[i]!.id)!;
          const b = pos.get(m.id)!;
          return <line key={m.id} x1={(a.x / 100) * W} y1={(a.y / 100) * H} x2={(b.x / 100) * W} y2={(b.y / 100) * H} stroke="#C9BBFF" strokeWidth="4" strokeDasharray="6 6" />;
        }),
      )}

      {mesas.map((m) => {
        const p = arrastre?.id === m.id ? arrastre.pos : pos.get(m.id)!;
        const { w, h } = tamanoMesa(m);
        const cx = (p.x / 100) * W;
        const cy = (p.y / 100) * H;
        const estado = estadoMesa(m);
        const est = ESTADO_MESA[estado];
        const sel = seleccion === m.id || multiSeleccion.includes(m.id);
        const min = minutosDesde(m.entrada_at, ahora);
        const redonda = m.forma === "redonda" || m.forma === "taburete";
        const taburete = m.forma === "taburete";
        const zona = m.zona_id ? zonaDe.get(m.zona_id) : undefined;
        const exterior = zona?.tipo === "terraza";
        const atenuada = filtro !== null && filtro !== estado && !(filtro === "cuenta" && m.aviso_camarero);
        const larga = m.ocupada && min !== null && min >= LARGA;
        const textoMesa = estado === "limpiar" ? "#2B2722" : "#fff";
        const radio = Math.max(w, h) / 2;
        return (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`${m.nombre ?? `Mesa ${m.numero}`}: ${est.label}${m.ocupada ? `, ${m.comensales} comensales${min !== null ? `, ${min} minutos` : ""}` : ""}${m.aviso_camarero ? ", llama al camarero" : ""}${m.reserva ? `, reserva ${m.reserva.hora}` : ""}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(m.id)}
            onPointerDown={(e) => {
              onSelect(m.id);
              if (editar) {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setArrastre({ id: m.id, pos: p });
              }
            }}
            opacity={atenuada ? 0.28 : 1}
            className="cursor-pointer outline-none [&:focus-visible>.tablero]:stroke-[#C9BBFF]"
          >
            <g transform={`translate(${cx} ${cy}) rotate(${Number(m.rotacion ?? 0)})`}>
              {/* Sillas (o taburetes) mirando a la mesa */}
              {puestosMesa(m.forma, m.capacidad, w, h, taburete ? 9 : 11).map((s, i) =>
                taburete ? (
                  <circle key={i} cx={s.x} cy={s.y} r="6" fill="#c9a27a" stroke="#1b1b1b" strokeWidth="1.5" />
                ) : (
                  <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${(s.rot * 180) / Math.PI - 90})`}>
                    <rect x="-7.5" y="-5" width="15" height="11" rx="3" fill={exterior ? "#2a2f3a" : "#b98b5e"} stroke={exterior ? "#59606e" : "#7d5a39"} strokeWidth="1" />
                    <rect x="-7.5" y="4" width="15" height="3.5" rx="1.5" fill={exterior ? "#59606e" : "#7d5a39"} />
                  </g>
                ),
              )}
            </g>

            {(m.aviso_camarero || m.pide_cuenta) && !editar ? (
              <circle cx={cx} cy={cy} r={radio + 22} fill="none" stroke="#C9BBFF" strokeWidth="4" className="motion-safe:animate-pulse" />
            ) : null}
            {larga && !editar ? <circle cx={cx} cy={cy} r={radio + 18} fill="none" stroke="#E0A458" strokeWidth="3" strokeDasharray="5 5" /> : null}

            <g transform={`rotate(${Number(m.rotacion ?? 0)} ${cx} ${cy})`} filter="url(#sombra)">
              {redonda ? (
                <ellipse className="tablero" cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={est.color} stroke={sel ? "#C9BBFF" : "#fff"} strokeWidth={sel ? 5 : 2.5} />
              ) : (
                <rect className="tablero" x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="8" fill={est.color} stroke={sel ? "#C9BBFF" : "#fff"} strokeWidth={sel ? 5 : 2.5} />
              )}
            </g>

            <text x={cx} y={cy + (m.ocupada && !taburete ? -2 : taburete ? 4.5 : 6)} textAnchor="middle" fontSize={taburete ? 12 : 18} fontWeight="800" fill={textoMesa}>
              {m.numero}
            </text>
            {m.ocupada && !taburete ? (
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill={larga ? "#FFE2B0" : "#fff"}>
                {m.comensales}p{min !== null ? ` · ${min}′` : ""}
              </text>
            ) : null}

            {!editar ? (
              <>
                {/* Insignia: llama al camarero (!) o pide la cuenta (€) */}
                {m.aviso_camarero || m.pide_cuenta ? (
                  <g transform={`translate(${cx + radio + 4} ${cy - radio - 4})`}>
                    <circle r="11" fill="#8E7CF0" stroke="#fff" strokeWidth="2" />
                    <text y="4.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">
                      {m.pide_cuenta ? "€" : "!"}
                    </text>
                  </g>
                ) : null}
                {/* Nota de la mesa */}
                {m.nota ? (
                  <g transform={`translate(${cx - radio - 4} ${cy - radio - 4})`}>
                    <circle r="9" fill="#F4F0FF" stroke="#1E3557" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1E3557">
                      i
                    </text>
                  </g>
                ) : null}
                {/* Debajo: importe pendiente si está ocupada; si no, la reserva próxima */}
                {m.ocupada && m.importe_centimos > 0 ? (
                  <Etiqueta x={cx} y={cy + radio + 20} texto={formatCentimos(m.pendiente_centimos > 0 ? m.pendiente_centimos : m.importe_centimos)} fondo={m.pendiente_centimos > 0 ? "#0B1424" : "#56653A"} />
                ) : !m.ocupada && m.reserva ? (
                  <Etiqueta x={cx} y={cy + radio + 20} texto={`${m.reserva.hora} · ${m.reserva.personas}p`} fondo="#1E3557" />
                ) : null}
              </>
            ) : null}
          </g>
        );
      })}

      {/* Etiquetas de zona con su ocupación, por encima de todo */}
      {zonas.map((z) => {
        const r = rect(z);
        const deZona = mesas.filter((m) => m.zona_id === z.id);
        const ocupadas = deZona.filter((m) => m.ocupada).length;
        const ancho = (deZona.length ? `${z.nombre}  ${ocupadas}/${deZona.length}` : z.nombre).length * 8.8 + 24;
        const y = z.tipo === "barra" ? r.y + 36 : r.y + 12;
        return (
          <g key={`n-${z.id}`} pointerEvents="none" transform={`translate(${r.x + 10} ${y})`}>
            <rect width={ancho} height="28" rx="14" fill="#0B1424" fillOpacity=".82" />
            <text x="12" y="19.5" fontSize="15" fontWeight="700" fill="#F4F0FF">
              {z.nombre}
              {deZona.length ? (
                <tspan fill={ocupadas ? "#FFB79A" : "#B9C7A0"} fontWeight="800">
                  {`  ${ocupadas}/${deZona.length}`}
                </tspan>
              ) : null}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Etiqueta({ x, y, texto, fondo }: { x: number; y: number; texto: string; fondo: string }) {
  const ancho = texto.length * 6.6 + 14;
  return (
    <g transform={`translate(${x - ancho / 2} ${y - 10})`} pointerEvents="none">
      <rect width={ancho} height="20" rx="10" fill={fondo} stroke="#fff" strokeOpacity=".5" />
      <text x={ancho / 2} y="14" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#fff">
        {texto}
      </text>
    </g>
  );
}
