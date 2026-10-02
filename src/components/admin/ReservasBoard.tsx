"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { Aviso, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { rpcAdmin } from "@/lib/admin/actions";
import type { MesaSalon, Zona } from "@/lib/admin/types";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";

type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "SENTADA" | "CANCELADA" | "NO_SHOW";

export interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  personas: number;
  fecha: string;
  hora: string;
  duracion_min: number;
  espacio: "mesa" | "despacho" | "evento";
  evento_id: string | null;
  evento: string | null;
  estado: EstadoReserva;
  notas: string | null;
  origen: "web" | "telefono" | "admin";
  mesas: { id: string; numero: string }[];
}

export interface EventoLite {
  id: string;
  titulo: string;
  fecha: string;
}

const ESTADO: Record<EstadoReserva, { label: string; clase: string }> = {
  PENDIENTE: { label: "Pendiente", clase: "bg-ratan text-carbon" },
  CONFIRMADA: { label: "Confirmada", clase: "bg-marino text-crema" },
  SENTADA: { label: "Sentada", clase: "bg-oliva text-crema" },
  CANCELADA: { label: "Cancelada", clase: "bg-carbon-muted text-crema" },
  NO_SHOW: { label: "No vino", clase: "bg-terracota text-crema" },
};

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const desplazar = (f: string, n: number) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Mesas de esta reserva que se solapan con otra reserva activa del mismo día. */
export function solapes(r: Pick<Reserva, "id" | "hora" | "duracion_min">, mesas: string[], todas: Reserva[]): string[] {
  const a0 = aMin(r.hora);
  const a1 = a0 + r.duracion_min;
  const out = new Set<string>();
  for (const o of todas) {
    if (o.id === r.id || o.estado === "CANCELADA" || o.estado === "NO_SHOW") continue;
    const b0 = aMin(o.hora);
    const b1 = b0 + o.duracion_min;
    if (a0 < b1 && b0 < a1) for (const m of o.mesas) if (mesas.includes(m.id)) out.add(m.numero);
  }
  return [...out];
}

/**
 * Reservas (portado de ReservasBoard + ReservasTimeline + ReservaModal de
 * Palomita): lista por horas y línea de tiempo por mesa, alta y edición,
 * asignación de mesas con aviso de solapes, y confirmar / sentar / no-show /
 * cancelar. Sentar una reserva sienta sus mesas en el salón.
 */
export function ReservasBoard({ mesas, zonas, eventos }: { mesas: MesaSalon[]; zonas: Zona[]; eventos: EventoLite[] }) {
  const [fecha, setFecha] = useState(hoyEnMadrid());
  const [vista, setVista] = useState<"lista" | "linea">("lista");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [editando, setEditando] = useState<Reserva | "nueva" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await rpcAdmin<Reserva[]>("laofi_admin_reservas", { p_desde: fecha, p_hasta: fecha });
    if (r.ok) setReservas(r.data);
    else setError(r.error);
  }, [fecha]);

  useEffect(() => {
    void cargar();
    const t = window.setInterval(() => void cargar(), 30_000);
    return () => window.clearInterval(t);
  }, [cargar]);

  const estado = async (r: Reserva, e: EstadoReserva) => {
    const res = await rpcAdmin<Reserva>("laofi_admin_reserva_estado", { p_id: r.id, p_estado: e });
    if (!res.ok) return setError(res.error);
    setReservas((l) => l.map((x) => (x.id === r.id ? res.data : x)));
  };

  const activas = reservas.filter((r) => r.estado !== "CANCELADA" && r.estado !== "NO_SHOW");
  const comensales = activas.reduce((a, r) => a + r.personas, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFecha(desplazar(fecha, -1))} className={botonSecundario}>
          <Icon name="chevronLeft" className="h-4 w-4" />
          <span className="sr-only">Día anterior</span>
        </button>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${input} w-44`} aria-label="Día" />
        <button type="button" onClick={() => setFecha(desplazar(fecha, 1))} className={botonSecundario}>
          <Icon name="chevronRight" className="h-4 w-4" />
          <span className="sr-only">Día siguiente</span>
        </button>
        <button type="button" onClick={() => setFecha(hoyEnMadrid())} className={botonSecundario}>
          Hoy
        </button>
        <div role="tablist" className="flex rounded-xl bg-arena p-1 dark:bg-noche-2">
          {(["lista", "linea"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className="min-h-9 rounded-lg px-3 text-sm font-semibold aria-selected:bg-marino aria-selected:text-crema dark:aria-selected:bg-neon dark:aria-selected:text-noche">
              {v === "lista" ? "Lista" : "Línea de tiempo"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setEditando("nueva")} className={`${botonPrimario} ml-auto`}>
          <Icon name="plus" className="h-4 w-4" />
          Nueva reserva
        </button>
      </div>
      <p className="text-sm opacity-70 first-letter:uppercase">
        {formatearFechaLarga(fecha)} · {activas.length} reservas · {comensales} comensales
        {reservas.some((r) => r.estado === "PENDIENTE") ? ` · ${reservas.filter((r) => r.estado === "PENDIENTE").length} pendientes de confirmar` : ""}
      </p>
      {error ? <Aviso>{error}</Aviso> : null}

      {vista === "lista" ? (
        <ul className="grid gap-2">
          {reservas.length === 0 ? <li className={`${card} p-6 text-center opacity-60`}>Sin reservas este día.</li> : null}
          {reservas.map((r) => (
            <li key={r.id} className={`${card} flex flex-wrap items-center gap-3 p-4 ${r.estado === "CANCELADA" || r.estado === "NO_SHOW" ? "opacity-60" : ""}`}>
              <span className="font-display text-3xl tabular-nums">{r.hora}</span>
              <button type="button" onClick={() => setEditando(r)} className="min-w-0 flex-1 text-left">
                <span className="block font-semibold">
                  {r.nombre} · {r.personas} p
                  {r.espacio === "despacho" ? <span className="ml-2 rounded-full bg-terracota-soft px-2 py-0.5 text-xs text-terracota">El Despacho</span> : null}
                  {r.evento ? <span className="ml-2 rounded-full bg-neon/30 px-2 py-0.5 text-xs">{r.evento}</span> : null}
                </span>
                <span className="text-sm opacity-70">
                  {r.mesas.length ? `Mesa ${r.mesas.map((m) => m.numero).join(" + ")}` : "Sin mesa asignada"} · {r.origen === "web" ? "web" : r.origen === "telefono" ? "teléfono" : "panel"}
                  {r.notas ? ` · ${r.notas}` : ""}
                </span>
              </button>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO[r.estado].clase}`}>{ESTADO[r.estado].label}</span>
              <div className="flex flex-wrap gap-1.5">
                {r.estado === "PENDIENTE" ? (
                  <button type="button" onClick={() => void estado(r, "CONFIRMADA")} className={botonSecundario}>
                    Confirmar
                  </button>
                ) : null}
                {r.estado === "PENDIENTE" || r.estado === "CONFIRMADA" ? (
                  <>
                    <button type="button" onClick={() => void estado(r, "SENTADA")} className={botonPrimario}>
                      Sentar
                    </button>
                    <button type="button" onClick={() => void estado(r, "NO_SHOW")} className={botonSecundario}>
                      No vino
                    </button>
                    <button type="button" onClick={() => window.confirm(`¿Cancelar la reserva de ${r.nombre}?`) && void estado(r, "CANCELADA")} className={botonSecundario}>
                      Cancelar
                    </button>
                  </>
                ) : null}
                <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className={botonSecundario}>
                  <Icon name="phone" className="h-4 w-4" />
                  <span className="sr-only">Llamar a {r.nombre}</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <LineaTiempo reservas={activas} mesas={mesas} zonas={zonas} onAbrir={setEditando} />
      )}

      {editando ? (
        <ReservaForm
          reserva={editando === "nueva" ? null : editando}
          fecha={fecha}
          mesas={mesas}
          eventos={eventos}
          todas={reservas}
          onClose={() => setEditando(null)}
          onGuardada={() => {
            setEditando(null);
            void cargar();
          }}
        />
      ) : null}
    </div>
  );
}

function LineaTiempo({ reservas, mesas, zonas, onAbrir }: { reservas: Reserva[]; mesas: MesaSalon[]; zonas: Zona[]; onAbrir: (r: Reserva) => void }) {
  const desde = 7 * 60;
  const hasta = 24 * 60;
  const pct = (m: number) => `${((m - desde) / (hasta - desde)) * 100}%`;
  const sinMesa = reservas.filter((r) => r.mesas.length === 0);
  const filas = useMemo(
    () =>
      [...mesas].sort((a, b) => {
        const za = zonas.findIndex((z) => z.id === a.zona_id);
        const zb = zonas.findIndex((z) => z.id === b.zona_id);
        return za - zb || a.numero.localeCompare(b.numero, "es", { numeric: true });
      }),
    [mesas, zonas],
  );
  const horas = Array.from({ length: 17 }, (_, i) => 7 + i);

  return (
    <div className={`${card} overflow-x-auto p-4`}>
      <div className="min-w-[760px]">
        <div className="relative ml-20 h-6 text-xs opacity-60">
          {horas.map((h) => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>
              {h}h
            </span>
          ))}
        </div>
        {sinMesa.length ? (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="w-20 shrink-0 font-semibold text-terracota">Sin mesa</span>
            <div className="flex flex-wrap gap-1">
              {sinMesa.map((r) => (
                <button key={r.id} type="button" onClick={() => onAbrir(r)} className="rounded-lg bg-ratan px-2 py-1 text-xs font-semibold text-carbon">
                  {r.hora} {r.nombre} ({r.personas})
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {filas.map((m) => (
          <div key={m.id} className="flex items-center border-t border-carbon/5 py-1 dark:border-crema/5">
            <span className="w-20 shrink-0 text-sm font-semibold">
              {m.numero} <span className="text-xs font-normal opacity-60">({m.capacidad})</span>
            </span>
            <div className="relative h-9 flex-1 rounded-lg bg-arena/60 dark:bg-noche-3">
              {reservas
                .filter((r) => r.mesas.some((x) => x.id === m.id))
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onAbrir(r)}
                    title={`${r.hora} · ${r.nombre} · ${r.personas} p`}
                    className={`absolute inset-y-1 truncate rounded-md px-2 text-left text-xs font-semibold ${ESTADO[r.estado].clase}`}
                    style={{ left: pct(aMin(r.hora)), width: `calc(${pct(aMin(r.hora) + r.duracion_min)} - ${pct(aMin(r.hora))})` }}
                  >
                    {r.nombre} · {r.personas}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservaForm({
  reserva,
  fecha,
  mesas,
  eventos,
  todas,
  onClose,
  onGuardada,
}: {
  reserva: Reserva | null;
  fecha: string;
  mesas: MesaSalon[];
  eventos: EventoLite[];
  todas: Reserva[];
  onClose: () => void;
  onGuardada: () => void;
}) {
  const r = reserva;
  const [f, setF] = useState({
    nombre: r?.nombre ?? "",
    telefono: r?.telefono ?? "",
    email: r?.email ?? "",
    personas: r?.personas ?? 2,
    fecha: r?.fecha ?? fecha,
    hora: r?.hora ?? "14:00",
    duracion_min: r?.duracion_min ?? 90,
    espacio: r?.espacio ?? ("mesa" as Reserva["espacio"]),
    evento_id: r?.evento_id ?? "",
    notas: r?.notas ?? "",
    mesas: r?.mesas.map((m) => m.id) ?? ([] as string[]),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const choques = solapes({ id: r?.id ?? "", hora: f.hora, duracion_min: f.duracion_min }, f.mesas, todas);
  const plazas = mesas.filter((m) => f.mesas.includes(m.id)).reduce((a, m) => a + m.capacidad, 0);

  const enviar = async () => {
    setError(null);
    const res = await rpcAdmin<Reserva>("laofi_admin_guardar_reserva", {
      p: { ...(r ? { id: r.id } : { origen: "telefono", estado: "CONFIRMADA" }), ...f, evento_id: f.evento_id || null },
    });
    if (!res.ok) return setError(res.error);
    onGuardada();
  };

  return (
    <Modal titulo={r ? `Reserva de ${r.nombre}` : "Nueva reserva"} onClose={onClose} ancho="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Nombre</span>
          <input value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Teléfono</span>
          <input value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} inputMode="tel" className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Fecha</span>
          <input type="date" value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} className={input} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Hora</span>
            <input type="time" value={f.hora} onChange={(e) => set({ hora: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Pers.</span>
            <input type="number" min={1} max={220} value={f.personas} onChange={(e) => set({ personas: Number(e.target.value) })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Min.</span>
            <input type="number" min={15} step={15} value={f.duracion_min} onChange={(e) => set({ duracion_min: Number(e.target.value) })} className={input} />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Espacio</span>
          <select value={f.espacio} onChange={(e) => set({ espacio: e.target.value as Reserva["espacio"] })} className={input}>
            <option value="mesa">Mesa</option>
            <option value="despacho">El Despacho</option>
            <option value="evento">Evento</option>
          </select>
        </label>
        {f.espacio === "evento" ? (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Evento</span>
            <select value={f.evento_id} onChange={(e) => set({ evento_id: e.target.value })} className={input}>
              <option value="">—</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} ({ev.fecha})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Email (opcional)</span>
            <input value={f.email} onChange={(e) => set({ email: e.target.value })} inputMode="email" className={input} />
          </label>
        )}
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold">
            Mesas {f.mesas.length ? `· ${plazas} plazas para ${f.personas} personas` : ""}
          </legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mesas.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={f.mesas.includes(m.id)}
                onClick={() => set({ mesas: f.mesas.includes(m.id) ? f.mesas.filter((x) => x !== m.id) : [...f.mesas, m.id] })}
                className="min-h-10 rounded-xl border border-carbon/15 px-3 text-sm aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-crema dark:border-crema/15 dark:aria-pressed:bg-neon dark:aria-pressed:text-noche"
              >
                {m.numero} <span className="opacity-60">({m.capacidad})</span>
              </button>
            ))}
          </div>
          {choques.length ? <p className="mt-2 text-sm font-semibold text-terracota">Ojo: la mesa {choques.join(", ")} ya está reservada a esa hora.</p> : null}
          {f.mesas.length && plazas < f.personas ? <p className="mt-1 text-sm text-terracota">Las mesas elegidas no llegan a {f.personas} plazas.</p> : null}
        </fieldset>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Notas</span>
          <input value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Trona, celíaco, cumpleaños…" className={input} />
        </label>
        {error ? (
          <div className="sm:col-span-2">
            <Aviso>{error}</Aviso>
          </div>
        ) : null}
        <button type="button" onClick={() => void enviar()} disabled={!f.nombre.trim() || f.telefono.replace(/\D/g, "").length < 9} className={`${botonPrimario} sm:col-span-2`}>
          Guardar reserva
        </button>
      </div>
    </Modal>
  );
}
