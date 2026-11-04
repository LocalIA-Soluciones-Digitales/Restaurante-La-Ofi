"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { card } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { ResultadoAccion } from "@/lib/pedidos/types";

const TZ = "Europe/Madrid";
const ISO = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const TITULO_DIA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** AAAA-MM-DD de un instante, en hora de Madrid. */
export const diaMadrid = (d: Date | string) => ISO.format(typeof d === "string" ? new Date(d) : d);

function sumarDias(dia: string, n: number): string {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

const aFecha = (dia: string) => {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const diasEntre = (a: string, b: string) => Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / 86_400_000);

function tituloDia(dia: string, hoy: string): string {
  if (dia === hoy) return "Hoy";
  if (dia === sumarDias(hoy, -1)) return "Ayer";
  if (dia === sumarDias(hoy, 1)) return "Mañana";
  const t = TITULO_DIA.format(aFecha(dia));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function textoRango(desde: string, hasta: string, hoy: string): string {
  if (desde === hasta) return tituloDia(desde, hoy);
  return `${CORTO.format(aFecha(desde))} – ${CORTO.format(aFecha(hasta))}`;
}

/** Días que se piden de más tras «hoy»: encargos para días siguientes ya entregados o anulados. */
const MARGEN_FUTURO = 30;
const MAX_DIAS = 366;

type Rango = "hoy" | "ayer" | "7" | "30" | "mes" | "otro";
type Estado = "todos" | "hechos" | "anulados";

function csvDe(filas: Record<string, string | number>[]): string {
  const cab = Object.keys(filas[0] ?? {});
  const celda = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cab.join(";"), ...filas.map((f) => cab.map((k) => celda(f[k] ?? "")).join(";"))].join("\n");
}

/**
 * Historial por días de lo ya cerrado (entregado o anulado): rangos rápidos, moverse día a
 * día, fechas a medida, buscar por cliente (nombre, teléfono o número), filtrar por estado
 * con su cuenta, resumen (total, ticket medio, anulados) y exportar a CSV.
 */
export function HistorialDias<T>({
  cargar,
  dia,
  cerrado,
  importe,
  anulado,
  clave,
  fila,
  csv,
  version,
  icono,
  nombres,
  etiquetaHecho,
}: {
  cargar: (desde: string, hasta: string, buscar: string) => Promise<ResultadoAccion<T[]>>;
  /** Día al que pertenece (para agrupar). */
  dia: (x: T) => string;
  /** Día en que se cerró: también cuenta para entrar en las fechas elegidas. */
  cerrado?: (x: T) => string;
  importe: (x: T) => number;
  anulado: (x: T) => boolean;
  clave: (x: T) => string;
  fila: (x: T) => ReactNode;
  /** Si se da, aparece «Exportar» con una fila por elemento. */
  csv?: (x: T) => Record<string, string | number>;
  /** Súbelo para volver a cargar (tras editar o borrar). */
  version: number;
  icono: IconName;
  nombres: [singular: string, plural: string];
  etiquetaHecho: string;
}) {
  const [hoy] = useState(() => diaMadrid(new Date()));
  const [rango, setRango] = useState<Rango>("7");
  const [desde, setDesde] = useState(() => sumarDias(hoy, -6));
  const [hasta, setHasta] = useState(hoy);
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState<Estado>("todos");
  const [lista, setLista] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al escribir, espera a que pare un momento para no consultar letra a letra.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscar(texto.trim()), 350);
    return () => window.clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    // Si las fechas llegan a hoy, se piden también los días siguientes: un encargo para
    // mañana que ya se ha entregado o anulado tiene que verse ya.
    const extra = cerrado && hasta >= hoy && diasEntre(desde, hasta) + MARGEN_FUTURO <= MAX_DIAS ? MARGEN_FUTURO : 0;
    void cargar(desde, sumarDias(hasta, extra), buscar).then((r) => {
      if (!vivo) return;
      if (!r.ok) {
        setError(r.error);
        setLista([]);
      } else {
        setError(null);
        const dentro = (d: string) => d >= desde && d <= hasta;
        setLista(r.data.filter((x) => dentro(dia(x)) || (cerrado ? dentro(cerrado(x)) : false)));
      }
    });
    return () => {
      vivo = false;
    };
    // `cargar` es una Server Action estable; recargar solo al cambiar el filtro o la versión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, buscar, version]);

  const fijar = (r: Rango, d: string, h: string) => {
    setRango(r);
    setDesde(d);
    setHasta(h);
  };
  const elegir = (r: Rango) => {
    if (r === "hoy") fijar(r, hoy, hoy);
    else if (r === "ayer") fijar(r, sumarDias(hoy, -1), sumarDias(hoy, -1));
    else if (r === "7") fijar(r, sumarDias(hoy, -6), hoy);
    else if (r === "30") fijar(r, sumarDias(hoy, -29), hoy);
    else if (r === "mes") fijar(r, `${hoy.slice(0, 8)}01`, hoy);
    else setRango("otro");
  };
  /** Mueve el rango entero hacia atrás o adelante (un día si es un solo día). */
  const mover = (sentido: -1 | 1) => {
    const ancho = diasEntre(desde, hasta) + 1;
    let d = sumarDias(desde, sentido * ancho);
    let h = sumarDias(hasta, sentido * ancho);
    if (h > hoy) {
      h = hoy;
      d = sumarDias(hoy, -(ancho - 1));
    }
    const r: Rango = d === hoy && h === hoy ? "hoy" : d === sumarDias(hoy, -1) && h === d ? "ayer" : "otro";
    fijar(r, d, h);
  };

  const todos = lista ?? [];
  const hechos = todos.filter((x) => !anulado(x));
  const anulados = todos.filter((x) => anulado(x));
  const total = hechos.reduce((a, x) => a + importe(x), 0);
  const totalAnulado = anulados.reduce((a, x) => a + importe(x), 0);
  const medio = hechos.length ? Math.round(total / hechos.length) : 0;

  const filtrados = useMemo(
    () => (lista ?? []).filter((x) => (estado === "todos" ? true : estado === "anulados" ? anulado(x) : !anulado(x))),
    [lista, estado, anulado],
  );
  const dias = useMemo(() => {
    const m = new Map<string, T[]>();
    for (const x of filtrados) {
      const d = dia(x);
      m.set(d, [...(m.get(d) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtrados, dia]);
  const n = (k: number) => `${k} ${k === 1 ? nombres[0] : nombres[1]}`;

  const exportar = () => {
    if (!csv || !filtrados.length) return;
    const blob = new Blob([`﻿${csvDe(filtrados.map(csv))}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombres[1]}-${desde}${desde === hasta ? "" : `_${hasta}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangos: { k: Rango; t: string }[] = [
    { k: "hoy", t: "Hoy" },
    { k: "ayer", t: "Ayer" },
    { k: "7", t: "7 días" },
    { k: "30", t: "30 días" },
    { k: "mes", t: "Este mes" },
    { k: "otro", t: "Personalizado" },
  ];
  const estados: { k: Estado; t: string; c: number }[] = [
    { k: "todos", t: "Todos", c: todos.length },
    { k: "hechos", t: etiquetaHecho, c: hechos.length },
    { k: "anulados", t: "Anulados", c: anulados.length },
  ];

  const segmento = "flex gap-1 overflow-x-auto rounded-xl bg-carbon/[0.05] p-1 [scrollbar-width:none] dark:bg-crema/[0.07]";
  const pastilla = (activa: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${
      activa
        ? "bg-white text-carbon shadow-sm dark:bg-noche-3 dark:text-crema"
        : "text-carbon-muted hover:text-carbon dark:text-crema/60 dark:hover:text-crema"
    }`;
  const campo =
    "h-10 rounded-xl border border-carbon/15 bg-white px-3 text-sm text-carbon focus:border-marino focus:outline-none dark:border-crema/15 dark:bg-noche-3 dark:text-crema dark:focus:border-neon";
  const iconoBoton =
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-carbon/15 bg-white text-carbon transition-colors hover:bg-arena disabled:opacity-35 disabled:hover:bg-white dark:border-crema/15 dark:bg-noche-3 dark:text-crema dark:hover:bg-noche-2";

  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3 p-3 sm:p-4`}>
        {/* Fechas: rangos rápidos y, a la derecha, el periodo con flechas para moverse. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`${segmento} max-w-full`} role="group" aria-label="Fechas">
            {rangos.map((r) => (
              <button key={r.k} type="button" onClick={() => elegir(r.k)} aria-pressed={rango === r.k} className={pastilla(rango === r.k)}>
                {r.k === "otro" ? <Icon name="calendar" className="h-3.5 w-3.5" /> : null}
                {r.t}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={() => mover(-1)} className={iconoBoton} aria-label="Periodo anterior">
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <p className="min-w-[8.5rem] px-1 text-center text-sm font-semibold capitalize tabular-nums">{textoRango(desde, hasta, hoy)}</p>
            <button type="button" onClick={() => mover(1)} disabled={hasta >= hoy} className={iconoBoton} aria-label="Periodo siguiente">
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {rango === "otro" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-carbon-muted dark:text-crema/60">Desde</span>
              <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} className={campo} />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-carbon-muted dark:text-crema/60">hasta</span>
              <input type="date" value={hasta} min={desde} max={hoy} onChange={(e) => e.target.value && setHasta(e.target.value)} className={campo} />
            </label>
            {diasEntre(desde, hasta) > MAX_DIAS ? <span className="text-xs font-semibold text-terracota">Como mucho un año cada vez</span> : null}
          </div>
        ) : null}

        {/* Buscar, estado y exportar. */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Buscar por cliente</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              inputMode="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por cliente, teléfono o nº de pedido"
              className={`${campo} w-full pl-9 pr-9`}
            />
            {texto ? (
              <button
                type="button"
                onClick={() => setTexto("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-carbon-muted hover:bg-carbon/10 dark:text-crema/60 dark:hover:bg-crema/10"
                aria-label="Borrar búsqueda"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
          <div className={segmento} role="group" aria-label="Estado">
            {estados.map((e) => (
              <button key={e.k} type="button" onClick={() => setEstado(e.k)} aria-pressed={estado === e.k} className={pastilla(estado === e.k)}>
                {e.t}
                <span className="rounded-md bg-carbon/[0.07] px-1.5 text-xs tabular-nums dark:bg-crema/10">{lista ? e.c : "–"}</span>
              </button>
            ))}
          </div>
          {csv ? (
            <button
              type="button"
              onClick={exportar}
              disabled={!filtrados.length}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-carbon/15 bg-white px-3 text-sm font-semibold text-carbon transition-colors hover:bg-arena disabled:opacity-40 dark:border-crema/15 dark:bg-noche-3 dark:text-crema dark:hover:bg-noche-2"
            >
              <Icon name="download" className="h-4 w-4" />
              Exportar
            </button>
          ) : null}
        </div>
      </div>

      {/* Resumen del periodo. */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { t: etiquetaHecho, v: lista ? String(hechos.length) : "–" },
          { t: "Facturado", v: lista ? formatCentimos(total) : "–" },
          { t: "Ticket medio", v: lista ? formatCentimos(medio) : "–" },
          { t: "Anulados", v: lista ? (anulados.length ? `${anulados.length} · ${formatCentimos(totalAnulado)}` : "0") : "–" },
        ].map((k) => (
          <div key={k.t} className={`${card} px-4 py-3`}>
            <dt className="text-xs font-medium text-carbon-muted dark:text-crema/60">{k.t}</dt>
            <dd className="mt-0.5 font-display text-2xl tabular-nums tracking-tight">{k.v}</dd>
          </div>
        ))}
      </dl>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {lista === null ? (
        <p className={`${card} px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>Cargando…</p>
      ) : dias.length === 0 ? (
        <div className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name={icono} className="h-8 w-8 opacity-50" />
          <p>{buscar ? `Nada con «${buscar}» en estas fechas.` : estado !== "todos" && todos.length ? "Nada con este estado en estas fechas." : "Nada en estas fechas."}</p>
          {rango !== "30" && !buscar ? (
            <button type="button" onClick={() => elegir("30")} className="text-sm font-semibold text-marino underline-offset-4 hover:underline dark:text-neon">
              Ver los últimos 30 días
            </button>
          ) : null}
        </div>
      ) : (
        dias.map(([d, xs]) => {
          const hechosDia = xs.filter((x) => !anulado(x));
          return (
            <section key={d} className="grid gap-1.5">
              <h3 className="flex items-baseline justify-between gap-2 px-1">
                <span className="font-display text-xl">{tituloDia(d, hoy)}</span>
                <span className="text-xs text-carbon-muted dark:text-crema/60">
                  {n(xs.length)} · <span className="font-semibold tabular-nums">{formatCentimos(hechosDia.reduce((a, x) => a + importe(x), 0))}</span>
                </span>
              </h3>
              <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
                {xs.map((x) => (
                  <li key={clave(x)}>{fila(x)}</li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
