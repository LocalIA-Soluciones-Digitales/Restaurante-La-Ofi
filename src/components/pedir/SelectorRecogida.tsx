"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { fechaMadrid, horaMadrid } from "@/lib/pedidos/franjas";
import type { Franja } from "@/lib/pedidos/types";

const campo =
  "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-carbon/15 bg-white px-4 text-left text-base text-carbon transition-colors hover:border-carbon/30 focus:border-marino focus:outline-none disabled:opacity-50 aria-expanded:border-marino";
const panel = "absolute top-full z-30 mt-2 rounded-2xl bg-white p-3 shadow-card ring-1 ring-carbon/10";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...o, timeZone: "UTC" });
const DIA_BOTON = fmt({ weekday: "short", day: "numeric", month: "short" });
const DIA_LARGO = fmt({ weekday: "long", day: "numeric", month: "long" });
const MES_ANO = fmt({ month: "long", year: "numeric" });
const comoFecha = (iso: string) => new Date(`${iso}T12:00:00Z`);
const masDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
};
/** «2026-11» → «2026-12» (n meses después). */
const masMeses = (mes: string, n: number) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
};
/** Lunes de la semana de `iso` (la semana empieza en lunes). */
const lunesDe = (iso: string) => masDias(iso, -((comoFecha(iso).getUTCDay() + 6) % 7));
const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const primeraMayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");

/**
 * Día y hora de recogida en dos campos. Al tocar el día se abre un calendario del mes
 * (se puede pasar a otros meses mientras haya días con recogida) en el que solo se tocan
 * los días con horas libres; al tocar la hora, las horas libres de ese día en botones.
 */
export function SelectorRecogida({ franjas, valor, onCambio }: { franjas: Franja[]; valor: string; onCambio: (hora: string) => void }) {
  const hoy = fechaMadrid(new Date());
  const libres = franjas.filter((f) => f.libres > 0);
  const diasConHoras = new Set(libres.map((f) => fechaMadrid(f.hora)));
  const ultimoDia = libres.length ? fechaMadrid(libres[libres.length - 1]!.hora) : hoy;
  // Hasta dónde llegan las horas que da el servidor: dentro, un día sin horas está cerrado (tachado).
  const horizonte = franjas.length ? fechaMadrid(franjas[franjas.length - 1]!.hora) : hoy;
  const dia = valor ? fechaMadrid(valor) : ([...diasConHoras][0] ?? hoy);
  const horas = libres.filter((f) => fechaMadrid(f.hora) === dia);

  const [abierto, setAbierto] = useState<"dia" | "hora" | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(null);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Que Esc cierre solo el desplegable, no la cesta entera.
        e.stopPropagation();
        setAbierto(null);
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  const primerMes = hoy.slice(0, 7);
  const ultimoMes = ultimoDia.slice(0, 7);
  const [mes, setMes] = useState(dia.slice(0, 7));
  const alternar = (q: "dia" | "hora") => {
    if (q === "dia" && abierto !== "dia") setMes(dia.slice(0, 7));
    setAbierto((a) => (a === q ? null : q));
  };

  // Celdas del mes, de lunes a domingo; los huecos de otros meses van vacíos.
  const inicio = lunesDe(`${mes}-01`);
  const fin = masDias(`${masMeses(mes, 1)}-01`, -1);
  const celdas: (string | null)[] = [];
  for (let d = inicio; d <= fin; d = masDias(d, 1)) celdas.push(d.startsWith(mes) ? d : null);

  const elegirDia = (iso: string) => {
    const primera = libres.find((f) => fechaMadrid(f.hora) === iso);
    if (primera) onCambio(primera.hora);
    setAbierto(null);
  };

  // Solo hay horas de hoy (para llevar, solo el menú del día): sin calendario, solo la hora.
  const soloHoy = franjas.every((f) => fechaMadrid(f.hora) === hoy);

  return (
    <div className="grid gap-2">
      <div ref={caja} className={soloHoy ? "grid" : "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2"}>
        {/* Día */}
        <div className={soloHoy ? "hidden" : "relative grid gap-1 text-sm"}>
          <span id="recogida-dia" className="font-semibold text-carbon">
            Día
          </span>
          <button type="button" aria-labelledby="recogida-dia" aria-haspopup="dialog" aria-expanded={abierto === "dia"} onClick={() => alternar("dia")} className={campo}>
            <span className="truncate font-semibold">{dia === hoy ? "Hoy" : primeraMayuscula(DIA_BOTON.format(comoFecha(dia)))}</span>
            <Icon name="calendar" className="h-4 w-4 shrink-0 text-carbon-muted" />
          </button>

          {abierto === "dia" ? (
            <div role="dialog" aria-label="Elige el día de recogida" className={`${panel} left-0 w-[20rem] max-w-[calc(100vw-3rem)]`}>
              <div className="mb-2 flex items-center justify-between gap-2 pl-1">
                <p className="text-sm font-semibold text-carbon first-letter:uppercase" aria-live="polite">
                  {MES_ANO.format(comoFecha(`${mes}-01`))}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMes(masMeses(mes, -1))}
                    disabled={mes <= primerMes}
                    className="grid h-8 w-8 place-items-center rounded-full text-carbon transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
                  >
                    <Icon name="chevronLeft" className="h-4 w-4" />
                    <span className="sr-only">Mes anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMes(masMeses(mes, 1))}
                    disabled={mes >= ultimoMes}
                    className="grid h-8 w-8 place-items-center rounded-full text-carbon transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
                  >
                    <Icon name="chevronRight" className="h-4 w-4" />
                    <span className="sr-only">Mes siguiente</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center">
                {SEMANA.map((s) => (
                  <span key={s} className="pb-1 text-[0.7rem] font-semibold uppercase text-carbon-muted">
                    {s}
                  </span>
                ))}
                {celdas.map((d, i) => {
                  if (!d) return <span key={`v${i}`} aria-hidden="true" />;
                  const libre = diasConHoras.has(d);
                  const cerrado = !libre && d >= hoy && d <= horizonte;
                  const elegido = d === dia;
                  return (
                    <span key={d} className="grid place-items-center">
                      <button
                        type="button"
                        disabled={!libre}
                        aria-pressed={elegido}
                        aria-label={`${DIA_LARGO.format(comoFecha(d))}${libre ? "" : ", sin recogida"}`}
                        onClick={() => elegirDia(d)}
                        className={`relative grid aspect-square w-full max-w-9 place-items-center rounded-full text-sm tabular-nums transition-colors ${
                          elegido ? "bg-marino font-semibold text-crema" : libre ? "font-semibold text-carbon hover:bg-arena" : "cursor-not-allowed text-carbon/25"
                        } ${cerrado ? "line-through" : ""}`}
                      >
                        {Number(d.slice(8))}
                        {d === hoy ? <span aria-hidden="true" className={`absolute bottom-0.5 h-1 w-1 rounded-full ${elegido ? "bg-crema" : "bg-marino"}`} /> : null}
                      </button>
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-xs text-carbon-muted">Los días tachados no hay recogida.</p>
            </div>
          ) : null}
        </div>

        {/* Hora */}
        <div className="relative grid gap-1 text-sm">
          <span id="recogida-hora" className="font-semibold text-carbon">
            {soloHoy ? "Hora (hoy)" : "Hora"}
          </span>
          <button
            type="button"
            aria-labelledby="recogida-hora"
            aria-haspopup="listbox"
            aria-expanded={abierto === "hora"}
            disabled={horas.length === 0}
            onClick={() => alternar("hora")}
            className={campo}
          >
            {valor && horas.some((f) => f.hora === valor) ? (
              <span className="truncate font-semibold tabular-nums">{horaMadrid(valor)}</span>
            ) : (
              <span className="truncate text-carbon-muted/70">Elegir</span>
            )}
            <Icon name="clock" className="h-4 w-4 shrink-0 text-carbon-muted" />
          </button>

          {abierto === "hora" ? (
            <div role="listbox" aria-label="Hora de recogida" className={`${panel} ${soloHoy ? "left-0" : "right-0"} w-[16.5rem] max-w-[calc(100vw-3rem)]`}>
              <p className="mb-2 px-1 text-sm font-semibold text-carbon">{dia === hoy ? "Hoy" : primeraMayuscula(DIA_LARGO.format(comoFecha(dia)))}</p>
              <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
                {horas.map((f) => (
                  <button
                    key={f.hora}
                    type="button"
                    role="option"
                    aria-selected={f.hora === valor}
                    onClick={() => {
                      onCambio(f.hora);
                      setAbierto(null);
                    }}
                    className="h-10 rounded-xl border border-carbon/15 bg-white text-sm font-semibold tabular-nums text-carbon transition-colors hover:border-marino/40 aria-selected:border-marino aria-selected:bg-marino aria-selected:text-crema"
                  >
                    {horaMadrid(f.hora)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {dia !== hoy && !diasConHoras.has(hoy) ? <p className="text-sm text-carbon-muted">Hoy ya no quedan horas: te lo dejamos encargado para el día que elijas.</p> : null}
    </div>
  );
}
