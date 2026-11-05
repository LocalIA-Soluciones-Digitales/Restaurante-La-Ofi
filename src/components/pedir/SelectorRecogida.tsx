"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { fechaMadrid, horaMadrid, nombreDia } from "@/lib/pedidos/franjas";
import type { Franja } from "@/lib/pedidos/types";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...o, timeZone: "UTC" });
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

/**
 * Día y hora de recogida. Un calendario del mes entero (se puede pasar a otros meses
 * mientras haya días con recogida) en el que solo se tocan los días con horas libres,
 * y debajo las horas libres de ese día, en botones.
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

  const primerMes = hoy.slice(0, 7);
  const ultimoMes = ultimoDia.slice(0, 7);
  const [mes, setMes] = useState(dia.slice(0, 7));

  // Celdas del mes, de lunes a domingo; los huecos de otros meses van vacíos.
  const inicio = lunesDe(`${mes}-01`);
  const fin = masDias(`${masMeses(mes, 1)}-01`, -1);
  const celdas: (string | null)[] = [];
  for (let d = inicio; d <= fin; d = masDias(d, 1)) celdas.push(d.startsWith(mes) ? d : null);

  const elegirDia = (iso: string) => {
    const primera = libres.find((f) => fechaMadrid(f.hora) === iso);
    if (primera) onCambio(primera.hora);
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-3 ring-1 ring-carbon/10 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2 pl-1">
          <p className="text-base font-semibold text-carbon first-letter:uppercase" aria-live="polite">
            {MES_ANO.format(comoFecha(`${mes}-01`))}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMes(masMeses(mes, -1))}
              disabled={mes <= primerMes}
              className="grid h-9 w-9 place-items-center rounded-full text-carbon transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
              <span className="sr-only">Mes anterior</span>
            </button>
            <button
              type="button"
              onClick={() => setMes(masMeses(mes, 1))}
              disabled={mes >= ultimoMes}
              className="grid h-9 w-9 place-items-center rounded-full text-carbon transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
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
                  className={`relative grid aspect-square w-full max-w-10 place-items-center rounded-full text-sm tabular-nums transition-colors ${
                    elegido
                      ? "bg-marino font-semibold text-crema"
                      : libre
                        ? "font-semibold text-carbon hover:bg-arena"
                        : "cursor-not-allowed text-carbon/25"
                  } ${cerrado ? "line-through" : ""}`}
                >
                  {Number(d.slice(8))}
                  {d === hoy ? <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${elegido ? "bg-crema" : "bg-marino"}`} /> : null}
                </button>
              </span>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-xs text-carbon-muted">Los días tachados no hay recogida.</p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-carbon">
          Hora <span className="font-normal text-carbon-muted">· {nombreDia(`${dia}T12:00:00Z`)}</span>
        </p>
        {horas.length ? (
          <div role="radiogroup" aria-label="Hora de recogida" className="grid grid-cols-4 gap-2">
            {horas.map((f) => (
              <button
                key={f.hora}
                type="button"
                role="radio"
                aria-checked={f.hora === valor}
                onClick={() => onCambio(f.hora)}
                className="h-11 rounded-xl border border-carbon/15 bg-white text-sm font-semibold tabular-nums text-carbon transition-colors hover:border-marino/40 aria-checked:border-marino aria-checked:bg-marino aria-checked:text-crema"
              >
                {horaMadrid(f.hora)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-carbon-muted">Elige un día en el calendario.</p>
        )}
      </div>

      {dia !== hoy && !diasConHoras.has(hoy) ? <p className="text-sm text-carbon-muted">Hoy ya no quedan horas: te lo dejamos encargado para el día que elijas.</p> : null}
    </div>
  );
}
