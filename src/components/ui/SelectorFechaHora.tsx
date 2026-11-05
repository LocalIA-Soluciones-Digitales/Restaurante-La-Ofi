"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { hoyEnMadrid } from "@/lib/format";
import { type Cierre, type Semana, horaDeMinutos, horasRecogida, minutosDe, normalizarHora, rangoRecogida } from "@/lib/horario";

const campo =
  "flex h-12 w-full items-center gap-2 rounded-xl border border-carbon/15 bg-white px-4 text-left text-base text-carbon transition-colors hover:border-carbon/30 focus-within:border-carbon aria-expanded:border-carbon data-[abierto=true]:border-carbon";
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
const masMeses = (mes: string, n: number) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + n, 1)).toISOString().slice(0, 7);
};
const lunesDe = (iso: string) => masDias(iso, -((comoFecha(iso).getUTCDay() + 6) % 7));
const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");

/** Primer día con el local abierto (de hoy a `maxDias`), para dejarlo elegido de salida. */
export function primerDiaRecogida(semana: Semana, cierres: readonly Cierre[], maxDias = 60): string {
  const hoy = hoyEnMadrid();
  for (let i = 0; i <= maxDias; i++) {
    const d = masDias(hoy, i);
    if (horasRecogida(semana, cierres, d).length > 0) return d;
  }
  return hoy;
}

/**
 * Día y hora de recogida en dos campos. El día abre un calendario del mes en el que solo
 * se tocan los días con el local abierto (horario y cierres puntuales), hasta `maxDias`.
 * La hora se escribe a mano («1830», «18:30») o se elige en un desplegable con las horas
 * en que está abierto ese día. `hora` llega vacía mientras lo escrito no valga.
 */
export function SelectorFechaHora({
  semana,
  cierres,
  fecha,
  hora,
  onCambio,
  maxDias = 60,
}: {
  semana: Semana;
  cierres: readonly Cierre[];
  fecha: string;
  hora: string;
  onCambio: (v: { fecha: string; hora: string }) => void;
  maxDias?: number;
}) {
  const id = useId();
  const hoy = hoyEnMadrid();
  const ultimo = masDias(hoy, maxDias);
  const abre = (d: string) => d >= hoy && d <= ultimo && rangoRecogida(semana, cierres, d) !== null;
  const rango = rangoRecogida(semana, cierres, fecha);
  const horas = useMemo(() => horasRecogida(semana, cierres, fecha), [semana, cierres, fecha]);

  const [abierto, setAbierto] = useState<"dia" | "hora" | null>(null);
  const [texto, setTexto] = useState(hora);
  const [aviso, setAviso] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => setTexto(hora), [hora]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(null);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Que Esc cierre solo el desplegable, no el panel entero.
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

  // Al abrir un desplegable, que se vea entero (dentro de un panel con scroll) y, en las
  // horas, la elegida a la vista.
  useEffect(() => {
    if (!abierto) return;
    caja.current?.querySelector<HTMLElement>("[role='dialog'], [role='listbox']")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (abierto === "hora") lista.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
  }, [abierto]);

  const [mes, setMes] = useState(fecha.slice(0, 7));
  const celdas: (string | null)[] = [];
  for (let d = lunesDe(`${mes}-01`), fin = masDias(`${masMeses(mes, 1)}-01`, -1); d <= fin; d = masDias(d, 1)) celdas.push(d.startsWith(mes) ? d : null);

  /** ¿Vale esa hora ese día? Devuelve el motivo si no. */
  const motivo = (h: string, d: string): string | null => {
    const r = rangoRecogida(semana, cierres, d);
    if (!r) return "Ese día estamos cerrados: elige otro.";
    const m = minutosDe(h);
    if (m < r.desde || m > r.hasta) return `Elige una hora entre las ${horaDeMinutos(r.desde)} y las ${horaDeMinutos(r.hasta)}.`;
    return null;
  };

  const elegirDia = (d: string) => {
    setAbierto(null);
    // Si la hora elegida no vale el día nuevo, se borra (y se dice por qué).
    const sigue = hora && !motivo(hora, d) ? hora : "";
    setAviso(hora && !sigue ? "Ese día no abrimos a esa hora: elige otra." : null);
    onCambio({ fecha: d, hora: sigue });
  };

  const elegirHora = (h: string) => {
    setAbierto(null);
    setAviso(null);
    setTexto(h);
    onCambio({ fecha, hora: h });
  };

  const confirmarTexto = () => {
    if (!texto.trim()) {
      setAviso(null);
      if (hora) onCambio({ fecha, hora: "" });
      return;
    }
    const h = normalizarHora(texto);
    if (!h) {
      setAviso("Escribe la hora así: 18:30.");
      onCambio({ fecha, hora: "" });
      return;
    }
    setTexto(h);
    const m = motivo(h, fecha);
    setAviso(m);
    onCambio({ fecha, hora: m ? "" : h });
  };

  const etiquetaDia = fecha === hoy ? `Hoy, ${DIA_BOTON.format(comoFecha(fecha)).replace(".", "")}` : mayuscula(DIA_BOTON.format(comoFecha(fecha)));

  return (
    <div className="grid gap-2">
      <div ref={caja} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
        {/* Día */}
        <div className="relative grid gap-1 text-sm">
          <span id={`${id}-dia`} className="font-semibold">
            Día
          </span>
          <button
            type="button"
            aria-labelledby={`${id}-dia`}
            aria-haspopup="dialog"
            aria-expanded={abierto === "dia"}
            onClick={() => {
              if (abierto !== "dia") setMes(fecha.slice(0, 7));
              setAbierto((a) => (a === "dia" ? null : "dia"));
            }}
            className={`${campo} justify-between`}
          >
            <span className="truncate font-semibold">{etiquetaDia}</span>
            <Icon name="calendar" className="h-4 w-4 shrink-0 text-carbon-muted" />
          </button>

          {abierto === "dia" ? (
            <div role="dialog" aria-label="Elige el día de recogida" className={`${panel} left-0 w-[20rem] max-w-[calc(100vw-3rem)]`}>
              <div className="mb-2 flex items-center justify-between gap-2 pl-1">
                <p className="text-sm font-semibold first-letter:uppercase" aria-live="polite">
                  {MES_ANO.format(comoFecha(`${mes}-01`))}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMes(masMeses(mes, -1))}
                    disabled={mes <= hoy.slice(0, 7)}
                    className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
                  >
                    <Icon name="chevronLeft" className="h-4 w-4" />
                    <span className="sr-only">Mes anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMes(masMeses(mes, 1))}
                    disabled={mes >= ultimo.slice(0, 7)}
                    className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-arena disabled:pointer-events-none disabled:opacity-25"
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
                  const libre = abre(d);
                  const cerrado = !libre && d >= hoy && d <= ultimo;
                  const elegido = d === fecha;
                  return (
                    <span key={d} className="grid place-items-center">
                      <button
                        type="button"
                        disabled={!libre}
                        aria-pressed={elegido}
                        aria-label={`${DIA_LARGO.format(comoFecha(d))}${libre ? "" : ", cerrado"}`}
                        onClick={() => elegirDia(d)}
                        className={`relative grid aspect-square w-full max-w-9 place-items-center rounded-full text-sm tabular-nums transition-colors ${
                          elegido ? "bg-carbon font-semibold text-crema" : libre ? "font-semibold text-carbon hover:bg-arena" : "cursor-not-allowed text-carbon/25"
                        } ${cerrado ? "line-through" : ""}`}
                      >
                        {Number(d.slice(8))}
                        {d === hoy ? <span aria-hidden="true" className={`absolute bottom-0.5 h-1 w-1 rounded-full ${elegido ? "bg-crema" : "bg-carbon"}`} /> : null}
                      </button>
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-xs text-carbon-muted">Los días tachados estamos cerrados.</p>
            </div>
          ) : null}
        </div>

        {/* Hora: se escribe o se elige en el desplegable */}
        <div className="relative grid gap-1 text-sm">
          <label htmlFor={`${id}-hora`} className="font-semibold">
            Hora
          </label>
          <div className={campo} data-abierto={abierto === "hora"}>
            <input
              id={`${id}-hora`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="hh:mm"
              value={texto}
              disabled={!rango}
              role="combobox"
              aria-expanded={abierto === "hora"}
              aria-controls={`${id}-horas`}
              aria-invalid={Boolean(aviso)}
              onChange={(e) => setTexto(e.target.value.replace(/[^0-9:.,h ]/gi, "").slice(0, 5))}
              onFocus={() => setAbierto("hora")}
              onBlur={confirmarTexto}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmarTexto();
                  setAbierto(null);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setAbierto("hora");
                  lista.current?.querySelector<HTMLElement>("[aria-selected='true'], [role='option']")?.focus();
                }
              }}
              className="min-w-0 flex-1 bg-transparent font-semibold tabular-nums placeholder:font-normal placeholder:text-carbon-muted/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={!rango}
              onClick={() => setAbierto((a) => (a === "hora" ? null : "hora"))}
              aria-label="Ver las horas"
              className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-carbon-muted hover:bg-arena disabled:opacity-40"
            >
              <Icon name="clock" className="h-4 w-4" />
            </button>
          </div>

          {abierto === "hora" && horas.length > 0 ? (
            <div
              ref={lista}
              id={`${id}-horas`}
              role="listbox"
              aria-label="Horas de recogida"
              // Que tocar una hora no dispare el blur del campo antes de elegirla.
              onPointerDown={(e) => e.preventDefault()}
              className={`${panel} right-0 w-[17rem] max-w-[calc(100vw-3rem)]`}
            >
              <p className="mb-2 px-1 text-sm font-semibold">{fecha === hoy ? "Hoy" : mayuscula(DIA_LARGO.format(comoFecha(fecha)))}</p>
              <div className="grid max-h-60 grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                {horas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    role="option"
                    aria-selected={h === hora}
                    onClick={() => elegirHora(h)}
                    className="h-10 rounded-xl border border-carbon/15 bg-white text-sm font-semibold tabular-nums transition-colors hover:border-carbon/40 focus:border-carbon focus:outline-none aria-selected:border-carbon aria-selected:bg-carbon aria-selected:text-crema"
                  >
                    {h}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-xs text-carbon-muted">O escríbela tú en el campo.</p>
            </div>
          ) : null}
        </div>
      </div>

      <p role={aviso ? "alert" : undefined} className={`text-xs ${aviso ? "font-semibold text-terracota" : "text-carbon-muted"}`}>
        {aviso ?? (rango ? `Ese día puedes pasar de ${horaDeMinutos(rango.desde)} a ${horaDeMinutos(rango.hasta)}.` : "Ese día estamos cerrados: elige otro.")}
      </p>
    </div>
  );
}
