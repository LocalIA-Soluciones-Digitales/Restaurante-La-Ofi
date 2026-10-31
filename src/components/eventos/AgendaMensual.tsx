"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartelEvento } from "@/components/eventos/CartelEvento";
import { horario } from "@/components/eventos/ProgramaEvento";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { EventoView } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

const MES_LARGO = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });
const MES_CORTO = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const DIA_CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const fechaUTC = (iso: string) => new Date(`${iso}T12:00:00Z`);
const sinPunto = (s: string) => s.replace(".", "");

/**
 * Meses (YYYY-MM) por los que se puede pasar: desde el actual hasta el último con
 * eventos, y al menos un año. El mes en curso se salta si ya acaba (desde el 25)
 * y no tiene nada.
 */
function mesesDesde(hoy: string, eventos: EventoView[]): string[] {
  const ultimo = eventos.reduce((max, e) => (e.fecha && e.fecha.slice(0, 7) > max ? e.fecha.slice(0, 7) : max), hoy.slice(0, 7));
  const [y, m] = hoy.split("-").map(Number) as [number, number];
  const saltar = Number(hoy.slice(8, 10)) >= 25 && !eventos.some((e) => e.fecha?.startsWith(hoy.slice(0, 7))) ? 1 : 0;
  const meses: string[] = [];
  for (let i = 0; i < 36; i++) {
    const mes = new Date(Date.UTC(y, m - 1 + saltar + i, 1)).toISOString().slice(0, 7);
    if (i >= 12 && mes > ultimo) break;
    meses.push(mes);
  }
  return meses;
}

const cuantos = (n: number) => (n === 1 ? "1 evento" : `${n} eventos`);

/**
 * Agenda mes a mes: se pasa de un mes a otro con las flechas; la lista del mes a
 * un lado y, al otro, el calendario (días con evento marcados) y las próximas
 * fechas de cualquier mes. Así, mirando noviembre, se ve igualmente que en
 * diciembre hay algo, y un clic lleva allí.
 */
export function AgendaMensual({ eventos, hoy, locale }: { eventos: EventoView[]; hoy: string; locale: Locale }) {
  const meses = useMemo(() => mesesDesde(hoy, eventos), [hoy, eventos]);
  const porMes = useMemo(() => {
    const m = new Map<string, EventoView[]>();
    for (const e of eventos) if (e.fecha) m.set(e.fecha.slice(0, 7), [...(m.get(e.fecha.slice(0, 7)) ?? []), e]);
    return m;
  }, [eventos]);
  const primero = eventos.find((e) => e.fecha)?.fecha?.slice(0, 7);
  const [mes, setMes] = useState(primero && meses.includes(primero) ? primero : meses[0]!);
  const [resaltado, setResaltado] = useState<string | null>(null);
  // Evento al que bajar en cuanto se pinte su mes (desde «Próximas fechas»).
  const [pendiente, setPendiente] = useState<EventoView | null>(null);

  const delMes = porMes.get(mes) ?? [];
  const i = meses.indexOf(mes);
  const siguiente = meses.slice(i + 1).find((m) => porMes.has(m));
  const anterior = meses.slice(0, i).find((m) => porMes.has(m));
  const nombre = (m: string) => MES_LARGO.format(fechaUTC(`${m}-15`));
  const conAnio = (m: string) => (m.slice(0, 4) === mes.slice(0, 4) ? nombre(m) : `${nombre(m)} ${m.slice(0, 4)}`);
  const hayFuera = eventos.some((e) => e.fecha && !e.fecha.startsWith(mes));
  const proximas = eventos.filter((e) => e.fecha).slice(0, 6);

  useEffect(() => {
    if (!pendiente?.fecha?.startsWith(mes)) return;
    document.getElementById(`evento-${pendiente.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setResaltado(pendiente.id);
    setPendiente(null);
    const t = window.setTimeout(() => setResaltado(null), 1800);
    return () => window.clearTimeout(t);
  }, [mes, pendiente]);

  /** Lleva a un evento: cambia de mes si hace falta y lo resalta en la lista. */
  function irA(e: EventoView) {
    if (e.fecha) setMes(e.fecha.slice(0, 7));
    setPendiente(e);
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-8">
        {/* El mes en grande y las flechas; el punto avisa de que en esa dirección hay eventos. */}
        <div className="flex items-end justify-between gap-4 border-b-[3px] border-carbon pb-4">
          <div aria-live="polite">
            <p className="whitespace-nowrap font-display text-[1.75rem] leading-none text-carbon first-letter:uppercase sm:text-[2.5rem]">
              {nombre(mes)} <span className="text-carbon-muted">{mes.slice(0, 4)}</span>
            </p>
            <p className={`mt-2 text-sm font-semibold ${delMes.length > 0 ? "text-brasa" : "text-carbon-muted"}`}>
              {delMes.length > 0 ? cuantos(delMes.length) : "Nada anunciado aún"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <FlechaMes direccion="anterior" destino={meses[i - 1]} hayEventos={Boolean(anterior)} nombre={nombre} onClick={setMes} />
            <FlechaMes direccion="siguiente" destino={meses[i + 1]} hayEventos={Boolean(siguiente)} nombre={nombre} onClick={setMes} />
          </div>
        </div>

        <div key={mes} className="motion-safe:animate-fade-in">
          {delMes.length > 0 ? (
            <ol>
              {delMes.map((e) => (
                <li key={e.id} id={`evento-${e.id}`} className="scroll-mt-28 border-b border-tinta-line py-1">
                  <FilaEvento evento={e} locale={locale} resaltado={resaltado === e.id} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-carbon/20 px-6 py-12 text-center sm:px-10">
              <Icon name="calendar" className="mx-auto h-7 w-7 text-brasa" />
              <p className="t-h3 mt-4 text-carbon">
                Aún no hay nada anunciado en <span className="lowercase">{nombre(mes)}</span>
              </p>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-carbon-muted">
                Los eventos se anuncian con unas semanas de antelación. En cuanto haya fecha aparecerá aquí, y lo contamos antes en Instagram.
              </p>
              <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-7 px-6">
                <Icon name="instagram" className="h-4 w-4" />
                {SITE.instagram.handle}
              </a>
            </div>
          )}
        </div>

        {/* Lo siguiente, aunque caiga en otro mes: un clic y se pasa a él. */}
        {siguiente ? (
          <button
            type="button"
            onClick={() => setMes(siguiente)}
            className="group mt-6 flex w-full items-center justify-between gap-4 rounded-2xl bg-papel-2 px-5 py-4 text-left ring-1 ring-inset ring-tinta-line transition-colors hover:bg-carbon hover:text-crema"
          >
            <span>
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted group-hover:text-crema/60">
                {siguiente === meses[i + 1] ? "El mes que viene" : "Lo siguiente"}
              </span>
              <span className="mt-1 block font-display text-xl first-letter:uppercase">
                {conAnio(siguiente)} · {cuantos(porMes.get(siguiente)!.length)}
              </span>
            </span>
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-carbon text-crema transition-transform group-hover:translate-x-1 group-hover:bg-crema group-hover:text-carbon">
              <Icon name="arrow" className="h-4 w-4" />
            </span>
          </button>
        ) : null}
      </div>

      <aside className="space-y-6 lg:col-span-4">
        <div className="rounded-3xl bg-crema p-5 ring-1 ring-tinta-line sm:p-6">
          <p className="font-display text-xl text-carbon first-letter:uppercase">
            {nombre(mes)} <span className="text-carbon-muted">{mes.slice(0, 4)}</span>
          </p>
          <Calendario mes={mes} hoy={hoy} eventos={delMes} onDia={irA} />
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-tinta-line pt-4 text-xs text-carbon-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-full bg-brasa" />
              Hay evento
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-carbon" />
              Hoy
            </span>
          </p>
        </div>

        {hayFuera ? (
          <div className="rounded-3xl bg-papel-2 p-5 ring-1 ring-tinta-line sm:p-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Próximas fechas</p>
            <ul className="mt-3 divide-y divide-tinta-line">
              {proximas.map((e) => {
                const f = fechaUTC(e.fecha!);
                const aqui = e.fecha!.startsWith(mes);
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => irA(e)} className="group flex w-full items-center gap-4 py-3 text-left">
                      <span className={`grid w-12 shrink-0 place-items-center rounded-xl py-1.5 leading-none ${aqui ? "bg-carbon text-crema" : "bg-crema text-carbon ring-1 ring-tinta-line"}`}>
                        <span className="font-display text-xl tabular-nums">{f.getUTCDate()}</span>
                        <span className={`mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${aqui ? "text-crema/70" : "text-brasa"}`}>{sinPunto(MES_CORTO.format(f))}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg leading-snug text-carbon group-hover:text-brasa">{e.titulo}</span>
                        <span className="block text-xs text-carbon-muted">
                          {e.tipo}
                          {aqui ? " · este mes" : ""}
                        </span>
                      </span>
                      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-carbon-muted transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {eventos.length > proximas.length ? <p className="mt-2 text-xs text-carbon-muted">y {cuantos(eventos.length - proximas.length)} más adelante</p> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

/** Flecha para pasar de mes; un punto si en esa dirección hay algún evento. */
function FlechaMes({
  direccion,
  destino,
  hayEventos,
  nombre,
  onClick,
}: {
  direccion: "anterior" | "siguiente";
  destino: string | undefined;
  hayEventos: boolean;
  nombre: (m: string) => string;
  onClick: (m: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => destino && onClick(destino)}
      disabled={!destino}
      aria-label={destino ? `Ver ${nombre(destino)}${hayEventos ? " (hay eventos)" : ""}` : `No hay mes ${direccion}`}
      className="relative grid h-12 w-12 place-items-center rounded-full text-carbon ring-1 ring-inset ring-tinta-line transition-colors hover:bg-carbon hover:text-crema disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={direccion === "anterior" ? "chevronLeft" : "chevronRight"} className="h-5 w-5" />
      {hayEventos ? <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-brasa ring-2 ring-crema" /> : null}
    </button>
  );
}

/** Calendario del mes, de lunes a domingo; los días con evento llevan a su fila. */
function Calendario({ mes, hoy, eventos, onDia }: { mes: string; hoy: string; eventos: EventoView[]; onDia: (e: EventoView) => void }) {
  const [y, m] = mes.split("-").map(Number) as [number, number];
  const hueco = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();

  return (
    <div className="mt-5">
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-carbon-muted">
        {SEMANA.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
        {Array.from({ length: hueco }, (_, k) => (
          <span key={`h${k}`} />
        ))}
        {Array.from({ length: dias }, (_, k) => {
          const iso = `${mes}-${String(k + 1).padStart(2, "0")}`;
          const evento = eventos.find((e) => e.fecha === iso);
          const esHoy = iso === hoy;
          const pasado = iso < hoy;
          const base = "mx-auto grid h-10 w-10 place-items-center rounded-full text-sm tabular-nums";
          if (evento) {
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onDia(evento)}
                title={evento.titulo}
                aria-label={`${k + 1}: ${evento.titulo}`}
                className={`${base} bg-brasa font-semibold text-crema shadow-card transition-transform hover:scale-110 hover:bg-brasa-700 ${esHoy ? "ring-2 ring-carbon ring-offset-2 ring-offset-crema" : ""}`}
              >
                {k + 1}
              </button>
            );
          }
          return (
            <span key={iso} className={`${base} ${esHoy ? "font-semibold text-carbon ring-1 ring-carbon" : pasado ? "text-carbon-muted/40" : "text-carbon"}`}>
              {k + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Un evento como fila de agenda: fecha grande, cartel pequeño, programa y precio. */
function FilaEvento({ evento, locale, resaltado }: { evento: EventoView; locale: Locale; resaltado: boolean }) {
  const f = evento.fecha ? fechaUTC(evento.fecha) : null;
  const detalle = evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;
  const programa = evento.programa ?? [];
  const hora = evento.hora?.slice(0, 5) ?? programa[0]?.hora?.slice(0, 5) ?? null;
  const precio = evento.precioCentimos === null ? null : evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos);
  const estado = evento.estado === "agotado" ? "Agotado" : evento.estado === "cancelado" ? "Cancelado" : null;

  return (
    <article
      className={`group relative grid grid-cols-[3.75rem_1fr] items-start gap-x-4 gap-y-3 py-5 transition-colors sm:grid-cols-[4.5rem_5.5rem_1fr_auto] sm:items-center sm:gap-x-6 ${
        resaltado ? "bg-brasa-soft/60" : "hover:bg-papel-3/40"
      } -mx-3 rounded-2xl px-3`}
    >
      {f ? (
        <p className="flex flex-col items-center leading-none text-carbon">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brasa">{sinPunto(DIA_CORTO.format(f))}</span>
          <span className="mt-1.5 font-display text-[2.6rem] tabular-nums">{f.getUTCDate()}</span>
          <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">{sinPunto(MES_CORTO.format(f))}</span>
        </p>
      ) : (
        <span />
      )}

      <div className="hidden overflow-hidden rounded-xl shadow-card sm:block">
        {evento.imagen ? (
          <CartelEvento src={evento.imagen.src} alt="" sizes="88px" className="aspect-[4/5]" />
        ) : (
          <div className="grid aspect-[4/5] place-items-center bg-papel-3">
            <Icon name="music" className="h-6 w-6 text-carbon-muted" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-carbon-muted">
          {evento.tipo}
          {evento.destacado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brasa-soft px-2 py-0.5 normal-case tracking-normal text-brasa">
              <Icon name="star" className="h-3 w-3" />
              Destacado
            </span>
          ) : null}
          {estado ? <span className="rounded-full bg-carbon px-2 py-0.5 normal-case tracking-normal text-crema">{estado}</span> : null}
        </p>
        <h3 className="mt-1.5 font-display text-2xl leading-snug text-carbon">
          {detalle ? (
            <Link href={detalle} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none">
              {evento.titulo}
            </Link>
          ) : (
            evento.titulo
          )}
        </h3>
        {programa.length > 0 ? (
          <p className="mt-1.5 truncate text-sm text-carbon-muted">
            {programa.slice(0, 3).map((p, k) => (
              <span key={`${p.titulo}-${k}`}>
                {k > 0 ? <span aria-hidden="true"> · </span> : null}
                {p.hora ? <span className="font-semibold tabular-nums text-brasa">{horario(p)} </span> : null}
                {p.titulo}
              </span>
            ))}
          </p>
        ) : evento.descripcion ? (
          <p className="mt-1.5 line-clamp-1 text-sm text-carbon-muted">{evento.descripcion}</p>
        ) : null}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-carbon sm:hidden">
          {hora ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-4 w-4 text-brasa" />
              {hora}
            </span>
          ) : null}
          {precio ? <span className="font-semibold">{precio}</span> : null}
        </p>
      </div>

      <div className="hidden flex-col items-end gap-1 text-right text-sm sm:flex">
        {hora ? (
          <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-carbon">
            <Icon name="clock" className="h-4 w-4 text-brasa" />
            {hora}
          </span>
        ) : null}
        {precio ? <span className="text-carbon-muted">{precio}</span> : null}
        {detalle ? (
          <span aria-hidden="true" className="mt-2 grid h-9 w-9 place-items-center rounded-full ring-1 ring-tinta-line transition-colors group-hover:bg-carbon group-hover:text-crema">
            <Icon name="arrow" className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
