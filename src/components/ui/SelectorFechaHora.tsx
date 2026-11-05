"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { RuedaNumeros } from "@/components/ui/RuedaNumeros";
import { hoyEnMadrid } from "@/lib/format";
import { type Cierre, type Semana, horaDeMinutos, horasRecogida, minutosDe, rangoRecogida } from "@/lib/horario";

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

const PASO_MIN = 5;
const dos = (n: number) => String(n).padStart(2, "0");

/**
 * Día y hora de recogida en dos campos. El día abre un calendario del mes en el que solo
 * se tocan los días con el local abierto (horario y cierres puntuales), hasta `maxDias`.
 * La hora abre dos ruedas, horas y minutos (de 5 en 5), como el reloj del móvil: solo las
 * horas en que está abierto ese día, y si la combinación se sale del horario se ajusta sola.
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
  // Lo que se puede elegir ese día, en minutos y a múltiplos de 5.
  const minimo = rango ? Math.ceil(rango.desde / PASO_MIN) * PASO_MIN : 0;
  const maximo = rango ? Math.floor(rango.hasta / PASO_MIN) * PASO_MIN : 0;

  const [abierto, setAbierto] = useState<"dia" | "hora" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

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

  // Al abrir un desplegable, que se vea entero (dentro de un panel con scroll).
  useEffect(() => {
    if (!abierto) return;
    caja.current?.querySelector<HTMLElement>("[data-desplegable]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

  /** Pone la hora (en minutos), ajustada al horario de ese día. */
  const ponerMinutos = (m: number) => {
    setAviso(null);
    onCambio({ fecha, hora: horaDeMinutos(Math.min(maximo, Math.max(minimo, m))) });
  };

  const abrirHora = () => {
    if (abierto === "hora") return setAbierto(null);
    // Sin hora todavía: de salida, la primera a la que se puede pasar.
    if (!hora && rango) ponerMinutos(minimo);
    setAbierto("hora");
  };

  const actual = hora ? minutosDe(hora) : minimo;
  const valoresHora = Array.from({ length: Math.floor(maximo / 60) - Math.floor(minimo / 60) + 1 }, (_, k) => dos(Math.floor(minimo / 60) + k));
  const valoresMin = Array.from({ length: 60 / PASO_MIN }, (_, k) => dos(k * PASO_MIN));

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
            <div data-desplegable role="dialog" aria-label="Elige el día de recogida" className={`${panel} left-0 w-[20rem] max-w-[calc(100vw-3rem)]`}>
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

        {/* Hora: dos ruedas, horas y minutos */}
        <div className="relative grid gap-1 text-sm">
          <span id={`${id}-hora`} className="font-semibold">
            Hora
          </span>
          <button
            type="button"
            aria-labelledby={`${id}-hora`}
            aria-haspopup="dialog"
            aria-expanded={abierto === "hora"}
            disabled={!rango}
            onClick={abrirHora}
            className={`${campo} justify-between disabled:opacity-50`}
          >
            <span className={`truncate font-semibold tabular-nums ${hora ? "" : "font-normal text-carbon-muted/70"}`}>{hora || "Elegir"}</span>
            <Icon name="clock" className="h-4 w-4 shrink-0 text-carbon-muted" />
          </button>

          {abierto === "hora" && rango ? (
            <div data-desplegable role="dialog" aria-label="Elige la hora de recogida" className={`${panel} right-0 w-[16rem] max-w-[calc(100vw-3rem)]`}>
              <p className="mb-1 px-1 text-sm font-semibold">{fecha === hoy ? "Hoy" : mayuscula(DIA_LARGO.format(comoFecha(fecha)))}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                <RuedaNumeros etiqueta="Horas" valores={valoresHora} valor={dos(Math.floor(actual / 60))} onCambio={(h) => ponerMinutos(Number(h) * 60 + (actual % 60))} />
                <span aria-hidden="true" className="font-display text-2xl font-semibold text-carbon">
                  :
                </span>
                <RuedaNumeros etiqueta="Minutos" valores={valoresMin} valor={dos(actual % 60)} onCambio={(m) => ponerMinutos(Math.floor(actual / 60) * 60 + Number(m))} />
              </div>
              <p className="mt-2 px-1 text-xs text-carbon-muted">
                Abierto de {horaDeMinutos(rango.desde)} a {horaDeMinutos(rango.hasta)}.
              </p>
              <button type="button" onClick={() => setAbierto(null)} className="btn mt-3 w-full bg-carbon text-crema hover:bg-[#1f1c18]">
                Listo · {hora || horaDeMinutos(minimo)}
              </button>
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
