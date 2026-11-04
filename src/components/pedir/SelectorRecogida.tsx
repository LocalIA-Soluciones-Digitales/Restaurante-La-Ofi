"use client";

import { useState } from "react";
import { fechaMadrid, horaMadrid } from "@/lib/pedidos/franjas";
import type { Franja } from "@/lib/pedidos/types";

/** Ficha elegible (día, hora, turno): marino cuando está marcada. Igual que en el formulario de reserva. */
const ficha =
  "rounded-2xl border border-carbon/[0.12] bg-white text-carbon transition-colors hover:border-carbon/35 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-carbon/[0.12] aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-crema";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...o, timeZone: "UTC" });
const DIA_SEMANA = fmt({ weekday: "short" });
const MES = fmt({ month: "short" });
const DIA_LARGO = fmt({ weekday: "long", day: "numeric", month: "long" });
const comoFecha = (iso: string) => new Date(`${iso}T12:00:00Z`);
const masDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
};

const TURNOS = [
  { id: "manana", titulo: "Mañana", de: "00:00", a: "12:00" },
  { id: "mediodia", titulo: "Mediodía", de: "12:00", a: "17:00" },
  { id: "tarde", titulo: "Tarde", de: "17:00", a: "24:00" },
] as const;
type Turno = (typeof TURNOS)[number]["id"];
const turnoDe = (hora: string): Turno => TURNOS.find((t) => hora >= t.de && hora < t.a)!.id;

/**
 * Día y hora de recogida en dos pasos: una semana (hoy y los 6 días siguientes) y,
 * debajo, las horas libres de ese día por turnos. Los días sin horas salen apagados.
 */
export function SelectorRecogida({ franjas, valor, onCambio }: { franjas: Franja[]; valor: string; onCambio: (hora: string) => void }) {
  const hoy = fechaMadrid(new Date());
  const libres = franjas.filter((f) => f.libres > 0);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const iso = masDias(hoy, i);
    const delDia = franjas.filter((f) => fechaMadrid(f.hora) === iso);
    return { iso, franjas: delDia, libre: delDia.some((f) => f.libres > 0) };
  });
  const diaElegido = valor ? fechaMadrid(valor) : (dias.find((d) => d.libre)?.iso ?? hoy);
  const delDia = dias.find((d) => d.iso === diaElegido)?.franjas ?? [];
  const turnosDelDia = TURNOS.filter((t) => delDia.some((f) => turnoDe(horaMadrid(f.hora)) === t.id));
  const [turnoElegido, setTurno] = useState<Turno | null>(null);
  const turnoValor = valor ? turnoDe(horaMadrid(valor)) : null;
  const turno = turnosDelDia.find((t) => t.id === turnoElegido)?.id ?? turnoValor ?? turnosDelDia[0]?.id ?? null;
  const horas = delDia.filter((f) => turno && turnoDe(horaMadrid(f.hora)) === turno);

  const elegirDia = (iso: string) => {
    setTurno(null);
    const primera = libres.find((f) => fechaMadrid(f.hora) === iso);
    if (primera) onCambio(primera.hora);
  };
  const elegirTurno = (t: Turno) => {
    setTurno(t);
    const primera = delDia.find((f) => f.libres > 0 && turnoDe(horaMadrid(f.hora)) === t);
    if (primera) onCambio(primera.hora);
  };

  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-carbon">Día</legend>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => (
            <button
              key={d.iso}
              type="button"
              aria-pressed={d.iso === diaElegido}
              aria-label={`${DIA_LARGO.format(comoFecha(d.iso))}${d.libre ? "" : ", sin horas de recogida"}`}
              disabled={!d.libre}
              onClick={() => elegirDia(d.iso)}
              className={`${ficha} flex min-w-0 flex-col items-center px-0.5 py-2`}
            >
              <span className="text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{d.iso === hoy ? "Hoy" : DIA_SEMANA.format(comoFecha(d.iso)).replace(".", "")}</span>
              <span className="font-display text-xl leading-tight tabular-nums">{Number(d.iso.slice(8))}</span>
              <span className="max-w-full truncate text-[0.62rem] opacity-70">{d.libre ? MES.format(comoFecha(d.iso)).replace(".", "") : "—"}</span>
            </button>
          ))}
        </div>
        {!dias[0]!.libre && diaElegido !== hoy ? (
          <p className="mt-2 text-sm text-carbon-muted">Hoy ya no quedan horas: te lo dejamos encargado para el día que elijas.</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-sm font-semibold text-carbon">
          Hora
          <span className="font-normal text-carbon-muted first-letter:uppercase">{DIA_LARGO.format(comoFecha(diaElegido))}</span>
        </legend>
        {turnosDelDia.length > 1 ? (
          <div role="group" aria-label="Turno" className="mb-2 grid grid-flow-col gap-1 rounded-2xl bg-arena p-1">
            {turnosDelDia.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={turno === t.id}
                onClick={() => elegirTurno(t.id)}
                className="min-h-9 rounded-xl text-sm font-semibold text-carbon-muted aria-pressed:bg-white aria-pressed:text-carbon aria-pressed:shadow-card"
              >
                {t.titulo}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {horas.map((f) => (
            <button
              key={f.hora}
              type="button"
              aria-pressed={f.hora === valor}
              aria-label={`${horaMadrid(f.hora)}${f.libres === 0 ? ", completa" : ""}`}
              disabled={f.libres === 0}
              onClick={() => onCambio(f.hora)}
              className={`${ficha} min-h-11 text-sm font-semibold tabular-nums`}
            >
              {horaMadrid(f.hora)}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
