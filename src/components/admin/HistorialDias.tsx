"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { card, input } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { ResultadoAccion } from "@/lib/pedidos/types";

const TZ = "Europe/Madrid";
const ISO = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const TITULO_DIA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** AAAA-MM-DD de un instante, en hora de Madrid. */
export const diaMadrid = (d: Date | string) => ISO.format(typeof d === "string" ? new Date(d) : d);

function sumarDias(dia: string, n: number): string {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

function tituloDia(dia: string, hoy: string): string {
  if (dia === hoy) return "Hoy";
  if (dia === sumarDias(hoy, -1)) return "Ayer";
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  const t = TITULO_DIA.format(new Date(Date.UTC(a, m - 1, d)));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type Rango = "hoy" | "ayer" | "7" | "30" | "mes" | "dia" | "otro";
type Estado = "todos" | "hechos" | "anulados";

/**
 * Historial por días de lo ya cerrado (entregado o anulado): rangos rápidos, ir a un
 * día concreto o a unas fechas, buscar por cliente (nombre, teléfono o número) y
 * filtrar por estado. Cada día con su cuenta y su total; la fila la pone quien lo usa.
 */
export function HistorialDias<T>({
  cargar,
  dia,
  importe,
  anulado,
  clave,
  fila,
  version,
  icono,
  nombres,
  etiquetaHecho,
}: {
  cargar: (desde: string, hasta: string, buscar: string) => Promise<ResultadoAccion<T[]>>;
  dia: (x: T) => string;
  importe: (x: T) => number;
  anulado: (x: T) => boolean;
  clave: (x: T) => string;
  fila: (x: T) => ReactNode;
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
    void cargar(desde, hasta, buscar).then((r) => {
      if (!vivo) return;
      if (!r.ok) {
        setError(r.error);
        setLista([]);
      } else {
        setError(null);
        setLista(r.data);
      }
    });
    return () => {
      vivo = false;
    };
    // `cargar` es una Server Action estable; recargar solo al cambiar el filtro o la versión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, buscar, version]);

  const elegir = (r: Rango) => {
    setRango(r);
    const fechas: Partial<Record<Rango, [string, string]>> = {
      hoy: [hoy, hoy],
      ayer: [sumarDias(hoy, -1), sumarDias(hoy, -1)],
      "7": [sumarDias(hoy, -6), hoy],
      "30": [sumarDias(hoy, -29), hoy],
      mes: [`${hoy.slice(0, 8)}01`, hoy],
      dia: [hasta, hasta],
    };
    const f = fechas[r];
    if (f) {
      setDesde(f[0]);
      setHasta(f[1]);
    }
  };

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
  const hechos = (lista ?? []).filter((x) => !anulado(x));
  const total = hechos.reduce((a, x) => a + importe(x), 0);
  const n = (k: number) => `${k} ${k === 1 ? nombres[0] : nombres[1]}`;

  const control = `${input} h-10 w-auto text-sm font-semibold`;
  const fecha = `${input} h-10 w-[9.5rem] px-2 text-sm`;
  const rangos: { k: Rango; t: string }[] = [
    { k: "hoy", t: "Hoy" },
    { k: "ayer", t: "Ayer" },
    { k: "7", t: "Últimos 7 días" },
    { k: "30", t: "Últimos 30 días" },
    { k: "mes", t: "Este mes" },
    { k: "dia", t: "Un día…" },
    { k: "otro", t: "Entre fechas…" },
  ];

  return (
    <div className="grid gap-3">
      {/* Una sola fila: buscar · fechas · estado · total. En el móvil se reparte en dos. */}
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <label className="relative min-w-0 basis-full sm:basis-auto sm:flex-1">
          <span className="sr-only">Buscar por cliente</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar cliente, teléfono o nº" className={`${input} h-10 pl-9 text-sm`} />
        </label>
        <select value={rango} onChange={(e) => elegir(e.target.value as Rango)} className={control} aria-label="Fechas">
          {rangos.map((r) => (
            <option key={r.k} value={r.k}>
              {r.t}
            </option>
          ))}
        </select>
        {rango === "dia" ? (
          <input
            type="date"
            max={hoy}
            value={desde}
            onChange={(e) => {
              if (!e.target.value) return;
              setDesde(e.target.value);
              setHasta(e.target.value);
            }}
            className={fecha}
            aria-label="Día"
          />
        ) : rango === "otro" ? (
          <>
            <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} className={fecha} aria-label="Desde" />
            <span className="text-sm text-carbon-muted dark:text-crema/60">a</span>
            <input type="date" value={hasta} min={desde} max={hoy} onChange={(e) => e.target.value && setHasta(e.target.value)} className={fecha} aria-label="Hasta" />
          </>
        ) : null}
        <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)} className={control} aria-label="Estado">
          <option value="todos">Todos</option>
          <option value="hechos">{etiquetaHecho}</option>
          <option value="anulados">Anulados</option>
        </select>
        {lista ? (
          <p className="ml-auto whitespace-nowrap pl-2 text-sm text-carbon-muted dark:text-crema/65">
            {n(hechos.length)} · <span className="font-semibold tabular-nums text-carbon dark:text-crema">{formatCentimos(total)}</span>
          </p>
        ) : null}
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {lista === null ? (
        <p className={`${card} px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>Cargando…</p>
      ) : dias.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name={icono} className="h-8 w-8 opacity-50" />
          {buscar ? `Nada con «${buscar}» en estas fechas.` : "Nada en estas fechas."}
        </p>
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
