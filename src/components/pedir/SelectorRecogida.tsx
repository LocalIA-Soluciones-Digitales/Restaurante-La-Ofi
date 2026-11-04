"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { fechaMadrid, horaMadrid } from "@/lib/pedidos/franjas";
import type { Franja } from "@/lib/pedidos/types";

const campo =
  "flex h-12 w-full items-center rounded-2xl border border-carbon/15 bg-white px-4 text-left text-base text-carbon focus:border-marino focus:outline-none disabled:opacity-50";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...o, timeZone: "UTC" });
const DIA_BOTON = fmt({ weekday: "short", day: "numeric", month: "short" });
const DIA_LARGO = fmt({ weekday: "long", day: "numeric", month: "long" });
const MES_ANO = fmt({ month: "long", year: "numeric" });
const comoFecha = (iso: string) => new Date(`${iso}T12:00:00Z`);
const masDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
};
/** Lunes de la semana de `iso` (la semana empieza en lunes). */
const lunesDe = (iso: string) => masDias(iso, -((comoFecha(iso).getUTCDay() + 6) % 7));
const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const primeraMayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");

/**
 * Día y hora de recogida. El día, con un calendario propio (el del navegador no deja
 * apagar días sueltos) en el que solo se pueden tocar los días con horas libres, de hoy
 * a 6 días vista. La hora, un desplegable con solo las horas libres de ese día.
 */
export function SelectorRecogida({ franjas, valor, onCambio }: { franjas: Franja[]; valor: string; onCambio: (hora: string) => void }) {
  const hoy = fechaMadrid(new Date());
  const libres = franjas.filter((f) => f.libres > 0);
  const diasConHoras = new Set(libres.map((f) => fechaMadrid(f.hora)));
  const dia = valor ? fechaMadrid(valor) : ([...diasConHoras][0] ?? hoy);
  const horas = libres.filter((f) => fechaMadrid(f.hora) === dia);

  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAbierto(false);
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  // Las semanas que cubren de hoy a 6 días vista (dos filas como mucho).
  const inicio = lunesDe(hoy);
  const fin = masDias(lunesDe(masDias(hoy, 6)), 6);
  const celdas: string[] = [];
  for (let d = inicio; d <= fin; d = masDias(d, 1)) celdas.push(d);
  const meses = [...new Set(celdas.filter((d) => d >= hoy && d <= masDias(hoy, 6)).map((d) => MES_ANO.format(comoFecha(d))))];

  const elegirDia = (iso: string) => {
    const primera = libres.find((f) => fechaMadrid(f.hora) === iso);
    if (primera) onCambio(primera.hora);
    setAbierto(false);
  };

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
        <div ref={caja} className="relative grid gap-1 text-sm">
          <span id="recogida-dia" className="font-semibold text-carbon">
            Día
          </span>
          <button
            type="button"
            aria-labelledby="recogida-dia"
            aria-haspopup="dialog"
            aria-expanded={abierto}
            onClick={() => setAbierto((a) => !a)}
            className={`${campo} justify-between gap-2`}
          >
            <span className="truncate">{dia === hoy ? "Hoy" : primeraMayuscula(DIA_BOTON.format(comoFecha(dia)))}</span>
            <Icon name="calendar" className="h-4 w-4 shrink-0 text-carbon-muted" />
          </button>

          {abierto ? (
            <div role="dialog" aria-label="Elige el día de recogida" className="absolute left-0 top-full z-30 mt-2 w-[19rem] max-w-[calc(100vw-3rem)] rounded-2xl bg-white p-3 shadow-card ring-1 ring-carbon/10">
              <p className="mb-2 px-1 text-sm font-semibold text-carbon first-letter:uppercase">{meses.join(" · ")}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {SEMANA.map((s) => (
                  <span key={s} className="pb-1 text-[0.7rem] font-semibold text-carbon-muted">
                    {s}
                  </span>
                ))}
                {celdas.map((d) => {
                  const enRango = d >= hoy && d <= masDias(hoy, 6);
                  const libre = enRango && diasConHoras.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!libre}
                      aria-pressed={d === dia}
                      aria-label={`${DIA_LARGO.format(comoFecha(d))}${libre ? "" : ", sin recogida"}`}
                      onClick={() => elegirDia(d)}
                      className={`grid h-10 place-items-center rounded-xl text-sm tabular-nums transition-colors ${
                        libre ? "font-semibold text-carbon hover:bg-arena aria-pressed:bg-marino aria-pressed:text-crema" : "cursor-not-allowed text-carbon/25"
                      } ${enRango && !libre ? "line-through" : ""} ${d === hoy && d !== dia ? "ring-1 ring-carbon/20" : ""}`}
                    >
                      {Number(d.slice(8))}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-xs text-carbon-muted">Los días tachados no tienen recogida.</p>
            </div>
          ) : null}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-carbon">Hora</span>
          <span className="relative">
            <select value={valor} onChange={(e) => onCambio(e.target.value)} disabled={horas.length === 0} className={`${campo} appearance-none pr-10 font-semibold tabular-nums`}>
              {horas.map((f) => (
                <option key={f.hora} value={f.hora}>
                  {horaMadrid(f.hora)}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
          </span>
        </label>
      </div>

      {dia !== hoy && !diasConHoras.has(hoy) ? <p className="text-sm text-carbon-muted">Hoy ya no quedan horas: te lo dejamos encargado para el día que elijas.</p> : null}
    </div>
  );
}
