"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { card } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { signoPct } from "@/lib/admin/analitica";

// Piezas de analítica del panel. Una sola tinta para magnitudes (marino; neón en
// oscuro); oliva/terracota solo para estado (mejor/peor, sobra/falta) y siempre
// con signo o texto, nunca el color solo.

/** Variación frente al periodo anterior: flecha + signo + texto. */
export function Delta({ valor, invertir = false, sufijo = "vs periodo anterior" }: { valor: number | null; invertir?: boolean; sufijo?: string }) {
  if (valor === null || !Number.isFinite(valor)) return <span className="text-xs text-carbon-muted dark:text-crema/55">Sin periodo anterior con el que comparar</span>;
  const bueno = invertir ? valor < 0 : valor > 0;
  const plano = Math.abs(valor) < 0.005;
  const color = plano ? "bg-arena text-carbon-muted dark:bg-noche-3 dark:text-crema/70" : bueno ? "bg-oliva-soft text-oliva dark:bg-oliva/25 dark:text-oliva-soft" : "bg-terracota-soft text-terracota dark:bg-terracota/25 dark:text-terracota-soft";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums ${color}`}>
        <span aria-hidden>{plano ? "→" : valor > 0 ? "↑" : "↓"}</span>
        {signoPct(valor)}
      </span>
      <span className="text-carbon-muted dark:text-crema/55">{sufijo}</span>
    </span>
  );
}

/** Línea mínima de evolución (sin ejes): acompaña a una cifra, no la sustituye. */
export function Sparkline({ valores, alto = 36, etiqueta }: { valores: number[]; alto?: number; etiqueta: string }) {
  if (valores.length < 2) return null;
  const ancho = 120;
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * ancho, alto - 3 - (v / max) * (alto - 6)] as const);
  const linea = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pts[pts.length - 1] ?? [0, 0];
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-9 w-full" preserveAspectRatio="none" role="img" aria-label={etiqueta}>
      <path d={`${linea} L${ancho},${alto} L0,${alto} Z`} className="fill-marino/[0.07] dark:fill-neon/10" />
      <path d={linea} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-marino dark:stroke-neon" />
      <circle cx={ux} cy={uy} r="3" className="fill-marino dark:fill-neon" />
    </svg>
  );
}

/** Tarjeta de indicador: cifra principal, variación y su evolución. */
export function Kpi({ label, valor, icon, delta, invertir, serie, nota }: { label: string; valor: ReactNode; icon: IconName; delta?: number | null; invertir?: boolean; serie?: number[]; nota?: ReactNode }) {
  return (
    <div className={`${card} flex flex-col gap-2 p-5 transition-shadow hover:shadow-lift break-inside-avoid`}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-carbon-muted dark:text-crema/65">
        {label}
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-marino/[0.08] text-marino dark:bg-neon/15 dark:text-neon">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="font-display text-3xl tabular-nums tracking-tight sm:text-4xl">{valor}</p>
      {delta !== undefined ? <Delta valor={delta} invertir={invertir} /> : null}
      {nota ? <p className="text-xs text-carbon-muted dark:text-crema/55">{nota}</p> : null}
      {serie ? (
        <div className="mt-auto pt-1">
          <Sparkline valores={serie} etiqueta={`Evolución de ${label.toLowerCase()} en el periodo`} />
        </div>
      ) : null}
    </div>
  );
}

/** Barra de cuota horizontal (una fila por categoría, misma tinta): sin leyenda de colores. */
export function Cuotas({ filas, formato }: { filas: { etiqueta: string; valor: number; detalle?: string }[]; formato: (v: number) => string }) {
  const total = filas.reduce((a, f) => a + f.valor, 0);
  if (!total) return <p className="py-4 text-sm text-carbon-muted dark:text-crema/55">Sin datos.</p>;
  return (
    <ul className="grid gap-3">
      {filas.map((f) => {
        const c = f.valor / total;
        return (
          <li key={f.etiqueta} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{f.etiqueta}</span>
              <span className="tabular-nums">
                {formato(f.valor)} <span className="text-carbon-muted dark:text-crema/55">· {Math.round(c * 100)} %</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10" role="img" aria-label={`${f.etiqueta}: ${Math.round(c * 100)} %`}>
              <div className="h-full rounded-full bg-marino transition-[width] duration-500 dark:bg-neon" style={{ width: `${Math.max(1, c * 100)}%` }} />
            </div>
            {f.detalle ? <span className="text-xs text-carbon-muted dark:text-crema/55">{f.detalle}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Progreso hacia un objetivo (p. ej. lo vendido frente a lo previsto). */
export function Progreso({ valor, objetivo, etiqueta }: { valor: number; objetivo: number; etiqueta: string }) {
  const c = objetivo ? valor / objetivo : 0;
  return (
    <div className="grid gap-1">
      <div className="h-3 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c * 100)}>
        <div className={`h-full rounded-full transition-[width] duration-700 ${c >= 1 ? "bg-oliva dark:bg-oliva-soft" : "bg-marino dark:bg-neon"}`} style={{ width: `${Math.min(100, c * 100)}%` }} />
      </div>
    </div>
  );
}

/** Ancho real del contenedor en px, para dibujar el SVG sin escalar el texto. */
function useAncho(inicial = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setAncho(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

export interface BarraPrevista {
  etiqueta: string;
  valor: number;
  /** Barra prevista (rayada) en lugar de real. */
  prevista?: boolean;
  bajo?: number;
  alto?: number;
  /** Referencia (media del periodo anterior, mismo día de la semana…): marca horizontal. */
  referencia?: number;
  detalle?: string;
}

/**
 * Barras de ventas reales + previstas (mismas tinta y escala; las previstas van
 * rayadas con banda de confianza) y línea de media. Leyenda siempre visible.
 */
export function BarrasPrevision({ titulo, datos, formato, media, alto = 200 }: { titulo: string; datos: BarraPrevista[]; formato: (v: number) => string; media?: number; alto?: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => Math.max(d.valor, d.alto ?? 0, d.referencia ?? 0)), media ?? 0) * 1.08;
  const [caja, disponible] = useAncho();
  const ancho = Math.max(320, disponible, datos.length * 12);
  const barra = ancho / Math.max(1, datos.length);
  const y = (v: number) => alto - (v / max) * (alto - 4);
  const rayado = `rayado-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const hayPrevision = datos.some((d) => d.prevista);
  // Una etiqueta cada `paso` barras para que nunca se pisen (≈6,5 px por carácter a 11 px).
  const anchoEtiqueta = Math.max(0, ...datos.map((d) => d.etiqueta.length)) * 6.5 + 10;
  const paso = Math.max(1, Math.ceil(anchoEtiqueta / barra));

  return (
    <figure className="relative">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="flex flex-wrap items-center gap-3 text-xs text-carbon-muted dark:text-crema/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-marino dark:bg-neon" /> Real
          </span>
          {hayPrevision ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-marino bg-marino/25 dark:border-neon dark:bg-neon/25" /> Previsión
            </span>
          ) : null}
          {media ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-0 w-3 border-t-2 border-dashed border-carbon/50 dark:border-crema/50" /> Media {formato(media)}
            </span>
          ) : null}
        </span>
      </figcaption>
      {datos.length === 0 ? (
        <p className="py-8 text-center text-sm opacity-60">Sin datos en este periodo.</p>
      ) : (
        <div ref={caja} className="overflow-x-auto">
          <svg viewBox={`0 0 ${ancho} ${alto + 22}`} width={ancho} height={alto + 22} className="block" role="img" aria-label={`${titulo}: gráfico de barras`}>
            <defs>
              <pattern id={rayado} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" strokeWidth="2.5" className="stroke-marino/45 dark:stroke-neon/50" />
              </pattern>
            </defs>
            {[0.25, 0.5, 0.75].map((l) => (
              <line key={l} x1="0" x2={ancho} y1={alto - alto * l} y2={alto - alto * l} className="stroke-carbon/[0.07] dark:stroke-crema/10" strokeWidth="1" />
            ))}
            <line x1="0" x2={ancho} y1={alto} y2={alto} className="stroke-carbon/30 dark:stroke-crema/30" strokeWidth="1" />
            {datos.map((d, i) => {
              const x = i * barra + 1;
              const w = Math.max(2, barra - 3);
              const h = Math.max(d.valor > 0 ? 2 : 0, alto - y(d.valor));
              const r = Math.min(4, w / 2, h);
              const top = alto - h;
              const path = `M${x},${alto} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${alto} Z`;
              const atenuar = activo !== null && activo !== i ? "opacity-45" : "";
              return (
                <g
                  key={`${d.etiqueta}-${i}`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.etiqueta}: ${d.prevista ? "previsto " : ""}${formato(d.valor)}${d.detalle ? `, ${d.detalle}` : ""}`}
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  className="outline-none"
                >
                  <rect x={i * barra} y="0" width={barra} height={alto} fill="transparent" />
                  {d.prevista ? (
                    <>
                      {d.alto !== undefined && d.bajo !== undefined && d.alto > d.bajo ? (
                        <line x1={x + w / 2} x2={x + w / 2} y1={y(d.alto)} y2={y(d.bajo)} strokeWidth="1.5" className={`stroke-carbon/40 dark:stroke-crema/40 ${atenuar}`} />
                      ) : null}
                      <path d={path} fill={`url(#${rayado})`} strokeDasharray="3 2" strokeWidth="1" className={`stroke-marino dark:stroke-neon ${atenuar}`} />
                    </>
                  ) : (
                    <path d={path} className={`fill-marino dark:fill-neon ${atenuar}`} />
                  )}
                  {d.referencia ? <line x1={x} x2={x + w} y1={y(d.referencia)} y2={y(d.referencia)} strokeWidth="2" className={`stroke-ratan ${atenuar}`} /> : null}
                  {i % paso === 0 ? (
                    <text x={Math.min(ancho - anchoEtiqueta / 2, Math.max(anchoEtiqueta / 2, x + w / 2))} y={alto + 16} textAnchor="middle" fontSize="11" className="fill-carbon-muted dark:fill-crema/60">
                      {d.etiqueta}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {media ? <line x1="0" x2={ancho} y1={y(media)} y2={y(media)} strokeDasharray="5 4" strokeWidth="1.5" className="pointer-events-none stroke-carbon/50 dark:stroke-crema/50" /> : null}
          </svg>
        </div>
      )}
      {activo !== null && datos[activo] ? (
        <div role="tooltip" className="pointer-events-none absolute right-0 top-8 z-10 rounded-xl bg-noche px-3 py-2 text-sm text-crema shadow-lift">
          <b>{datos[activo].etiqueta}</b> · {datos[activo].prevista ? "previsto " : ""}
          {formato(datos[activo].valor)}
          {datos[activo].prevista && datos[activo].alto ? (
            <span className="block text-xs text-crema/70">
              Rango probable {formato(datos[activo].bajo ?? 0)} – {formato(datos[activo].alto ?? 0)}
            </span>
          ) : null}
          {datos[activo].referencia ? <span className="block text-xs text-crema/70">Periodo anterior {formato(datos[activo].referencia ?? 0)}</span> : null}
          {datos[activo].detalle ? <span className="block text-xs text-crema/70">{datos[activo].detalle}</span> : null}
        </div>
      ) : null}
    </figure>
  );
}

/**
 * Barras divergentes desde 0 (descuadres de caja): sobra hacia arriba en oliva,
 * falta hacia abajo en terracota; el signo va en el tooltip y en la tabla.
 */
export function BarrasDivergentes({ titulo, datos, formato, alto = 140 }: { titulo: string; datos: { etiqueta: string; valor: number; detalle?: string }[]; formato: (v: number) => string; alto?: number }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(100, ...datos.map((d) => Math.abs(d.valor)));
  const ancho = Math.max(320, datos.length * 22);
  const barra = ancho / Math.max(1, datos.length);
  const medio = alto / 2;
  return (
    <figure className="relative">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="flex gap-3 text-xs text-carbon-muted dark:text-crema/60">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-oliva" /> ↑ Sobra
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-terracota" /> ↓ Falta
          </span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full min-w-[320px]" role="img" aria-label={`${titulo}: los datos están en la tabla`}>
        <line x1="0" x2={ancho} y1={medio} y2={medio} className="stroke-carbon/30 dark:stroke-crema/30" strokeWidth="1" />
        {datos.map((d, i) => {
          const h = d.valor === 0 ? 2 : Math.max(2, (Math.abs(d.valor) / max) * (medio - 4));
          const x = i * barra + 1;
          const w = Math.max(2, barra - 3);
          return (
            <g
              key={`${d.etiqueta}-${i}`}
              tabIndex={0}
              role="img"
              aria-label={`${d.etiqueta}: ${formato(d.valor)}`}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              className="outline-none"
            >
              <rect x={i * barra} y="0" width={barra} height={alto} fill="transparent" />
              <rect
                x={x}
                width={w}
                y={d.valor >= 0 ? medio - h : medio}
                height={h}
                rx={Math.min(3, w / 2)}
                className={`${d.valor === 0 ? "fill-carbon/30 dark:fill-crema/40" : d.valor > 0 ? "fill-oliva dark:fill-oliva-soft" : "fill-terracota dark:fill-terracota-soft"} ${activo !== null && activo !== i ? "opacity-45" : ""}`}
              />
            </g>
          );
        })}
      </svg>
      {activo !== null && datos[activo] ? (
        <div role="tooltip" className="pointer-events-none absolute right-0 top-8 z-10 rounded-xl bg-noche px-3 py-2 text-sm text-crema shadow-lift">
          <b>{datos[activo].etiqueta}</b> · {datos[activo].valor > 0 ? "+" : ""}
          {formato(datos[activo].valor)}
          {datos[activo].detalle ? <span className="block text-xs text-crema/70">{datos[activo].detalle}</span> : null}
        </div>
      ) : null}
    </figure>
  );
}

/** Conclusión destacada generada a partir de los datos. */
export function Hallazgo({ icon, titulo, children, tono = "neutro" }: { icon: IconName; titulo: ReactNode; children?: ReactNode; tono?: "neutro" | "ok" | "aviso" }) {
  const color =
    tono === "ok" ? "bg-oliva-soft text-oliva dark:bg-oliva/25 dark:text-oliva-soft" : tono === "aviso" ? "bg-terracota-soft text-terracota dark:bg-terracota/25 dark:text-terracota-soft" : "bg-marino/[0.08] text-marino dark:bg-neon/15 dark:text-neon";
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${color}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="text-sm">
        <p className="font-semibold">{titulo}</p>
        {children ? <p className="text-carbon-muted dark:text-crema/65">{children}</p> : null}
      </div>
    </li>
  );
}
