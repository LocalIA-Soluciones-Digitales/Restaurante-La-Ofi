"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/admin/Modal";
import { Aviso, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
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
  espacio: "mesa" | "despacho" | "evento" | "presupuesto" | "recogida";
  /** Lo que han dicho que van a comer desde la web (nombres copiados al reservar). */
  comida: { modo: "menu" | "carta"; lineas: { nombre: string; cantidad: number }[] } | null;
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
  PENDIENTE: { label: "Por confirmar", clase: "bg-ratan text-carbon" },
  CONFIRMADA: { label: "Confirmada", clase: "bg-marino/10 text-marino dark:bg-neon/15 dark:text-neon" },
  SENTADA: { label: "Sentada", clase: "bg-oliva-soft text-oliva dark:bg-oliva/30 dark:text-oliva-soft" },
  CANCELADA: { label: "Cancelada", clase: "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/60" },
  NO_SHOW: { label: "No vino", clase: "bg-terracota-soft text-terracota" },
};

type Filtro = "todo" | "comedor" | "despacho" | "recogida" | "otros";

/** Cada espacio con su color e icono: se distinguen de un vistazo (franja, icono y filtro). */
const ESPACIO: Record<Reserva["espacio"], { label: string; icon: IconName; franja: string; chip: string; filtro: Filtro }> = {
  mesa: { label: "Comedor", icon: "utensils", franja: "bg-marino dark:bg-neon", chip: "bg-marino/10 text-marino dark:bg-neon/15 dark:text-neon", filtro: "comedor" },
  despacho: { label: "El Despacho", icon: "briefcase", franja: "bg-terracota", chip: "bg-terracota-soft text-terracota", filtro: "despacho" },
  recogida: { label: "Para recoger", icon: "bag", franja: "bg-madera", chip: "bg-arena-2 text-madera-oscura dark:bg-madera/25 dark:text-ratan", filtro: "recogida" },
  evento: { label: "Evento", icon: "music", franja: "bg-neon-deep", chip: "bg-neon-soft text-neon-deep dark:bg-neon/20 dark:text-neon", filtro: "otros" },
  presupuesto: { label: "Presupuesto", icon: "gift", franja: "bg-oliva", chip: "bg-oliva-soft text-oliva", filtro: "otros" },
};

/** Aforo de El Despacho por turno (el mismo valor por defecto que laofi_crear_reserva). */
const AFORO_DESPACHO = 30;
/** Desde esta hora es turno de noche (igual que el aforo de El Despacho en la base de datos). */
const NOCHE = "17:00";

/** «Menú del día: 2× Lentejas, 1× Merluza» · «Carta» · null si solo reservan mesa. */
export function resumenComida(c: Reserva["comida"]): string | null {
  if (!c) return null;
  const tipo = c.modo === "menu" ? "Menú del día" : "Carta";
  return c.lineas.length ? `${tipo}: ${c.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}` : `${tipo} (eligen en la mesa)`;
}

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const desplazar = (f: string, n: number) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const DIA_SEMANA = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
/** Lunes de la semana de `f` (las semanas van de lunes a domingo). */
const lunesDe = (f: string) => desplazar(f, -((new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7));
const diaMes = (f: string) => DIA_MES.format(new Date(`${f}T12:00:00Z`)).replace(".", "");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const activa = (r: Reserva) => r.estado !== "CANCELADA" && r.estado !== "NO_SHOW";
const cuantos = (r: Reserva) =>
  r.espacio !== "recogida" ? `${r.personas}` : r.comida?.modo === "carta" ? "1" : `${r.personas}`;
const unidad = (r: Reserva) =>
  r.espacio !== "recogida" ? (r.personas === 1 ? "persona" : "personas") : r.comida?.modo === "carta" ? "pedido" : r.personas === 1 ? "menú" : "menús";

/** Mesas de esta reserva que se solapan con otra reserva activa del mismo día. */
export function solapes(r: Pick<Reserva, "id" | "hora" | "duracion_min">, mesas: string[], todas: Reserva[]): string[] {
  const a0 = aMin(r.hora);
  const a1 = a0 + r.duracion_min;
  const out = new Set<string>();
  for (const o of todas) {
    if (o.id === r.id || !activa(o)) continue;
    const b0 = aMin(o.hora);
    const b1 = b0 + o.duracion_min;
    if (a0 < b1 && b0 < a1) for (const m of o.mesas) if (mesas.includes(m.id)) out.add(m.numero);
  }
  return [...out];
}

/**
 * Reservas pensadas para gestionarlas desde el móvil: la semana de lunes a domingo
 * (con flechas para cambiar de semana) y cuántas reservas hay cada día,
 * resumen por espacio (comedor, El Despacho con su aforo, para
 * recoger, eventos) que sirve de filtro, y la lista por turnos con un color por
 * espacio y el siguiente paso en un solo botón (confirmar → sentar). Tocar una
 * reserva la abre para editarla, asignar mesas, marcar «no vino» o cancelarla.
 * La vista «Por mesas» (línea de tiempo) sigue para quien trabaja con el salón.
 */
export function ReservasBoard({ mesas, zonas, eventos }: { mesas: MesaSalon[]; zonas: Zona[]; eventos: EventoLite[] }) {
  const hoy = hoyEnMadrid();
  const [fecha, setFecha] = useState(hoy);
  const [vista, setVista] = useState<"lista" | "linea">("lista");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [editando, setEditando] = useState<Reserva | "nueva" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La semana (lunes a domingo) del día elegido: se carga entera para ver cuántas hay cada día.
  const desde = lunesDe(fecha);
  const hasta = desplazar(desde, 6);
  const estaSemana = desde === lunesDe(hoy);
  const cargar = useCallback(async () => {
    const r = await rpcAdmin<Reserva[]>("laofi_admin_reservas", { p_desde: desde, p_hasta: hasta });
    if (r.ok) {
      setReservas(r.data);
      setError(null);
    } else setError(r.error);
  }, [desde, hasta]);

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

  const delDia = reservas.filter((r) => r.fecha === fecha);
  const activasDia = delDia.filter(activa);
  const pendientes = delDia.filter((r) => r.estado === "PENDIENTE");
  const visibles = delDia.filter((r) => filtro === "todo" || ESPACIO[r.espacio].filtro === filtro);
  const turnos = [
    { titulo: "Mediodía", lista: visibles.filter((r) => r.hora < NOCHE) },
    { titulo: "Noche", lista: visibles.filter((r) => r.hora >= NOCHE) },
  ].filter((t) => t.lista.length);

  const suma = (f: (r: Reserva) => boolean) => activasDia.filter(f).reduce((a, r) => a + r.personas, 0);
  const n = (f: (r: Reserva) => boolean) => activasDia.filter(f).length;
  const dias = Array.from({ length: 7 }, (_, i) => desplazar(desde, i));

  return (
    <div className="grid gap-4">
      {/* La semana entera de un vistazo (lunes a domingo, sin scroll) y flechas para cambiar de semana. */}
      <div className={`${card} p-2.5 sm:p-3`}>
        <div className="mb-2 flex items-center gap-1">
          <button type="button" onClick={() => setFecha(desplazar(fecha, -7))} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronLeft" className="h-5 w-5" />
            <span className="sr-only">Semana anterior</span>
          </button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold">
            {estaSemana ? "Esta semana" : `${diaMes(desde)} – ${diaMes(hasta)}`}
            {estaSemana ? <span className="ml-1.5 font-normal opacity-60">{`${diaMes(desde)} – ${diaMes(hasta)}`}</span> : null}
          </p>
          {!estaSemana ? (
            <button type="button" onClick={() => setFecha(hoy)} className="min-h-10 shrink-0 rounded-xl px-2.5 text-sm font-semibold text-marino hover:bg-arena dark:text-neon dark:hover:bg-noche-3">
              Hoy
            </button>
          ) : null}
          <button type="button" onClick={() => setFecha(desplazar(fecha, 7))} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronRight" className="h-5 w-5" />
            <span className="sr-only">Semana siguiente</span>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {dias.map((d) => {
            const total = reservas.filter((r) => r.fecha === d && activa(r)).length;
            const porConfirmar = reservas.some((r) => r.fecha === d && r.estado === "PENDIENTE");
            const sel = d === fecha;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setFecha(d)}
                aria-pressed={sel}
                aria-label={`${formatearFechaLarga(d)}: ${total} reservas${porConfirmar ? ", alguna por confirmar" : ""}`}
                className={`relative flex min-w-0 flex-col items-center rounded-xl py-1.5 transition-colors sm:py-2 ${
                  sel
                    ? "bg-marino text-crema dark:bg-neon dark:text-noche"
                    : d === hoy
                      ? "bg-marino/[0.08] dark:bg-neon/10"
                      : d < hoy
                        ? "opacity-50 hover:bg-arena dark:hover:bg-noche-3"
                        : "hover:bg-arena dark:hover:bg-noche-3"
                }`}
              >
                <span className="text-[0.6rem] font-semibold uppercase tracking-wide opacity-70 sm:text-[0.65rem]">
                  {d === hoy ? "Hoy" : DIA_SEMANA.format(new Date(`${d}T12:00:00Z`)).replace(".", "")}
                </span>
                <span className="font-display text-xl leading-tight tabular-nums sm:text-2xl">{Number(d.slice(8))}</span>
                <span className={`text-[0.68rem] font-semibold tabular-nums ${total ? "" : "opacity-35"}`}>{total || "–"}</span>
                {porConfirmar ? <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-terracota sm:h-2 sm:w-2" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display text-2xl first-letter:uppercase">{fecha === hoy ? "Hoy" : formatearFechaLarga(fecha)}</h2>
        <label className={`${botonSecundario} relative px-3`}>
          <Icon name="calendar" className="h-4 w-4" />
          <span className="text-sm">Otro día</span>
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir día" />
        </label>
        <button type="button" onClick={() => setEditando("nueva")} className={botonPrimario}>
          <Icon name="plus" className="h-4 w-4" />
          Nueva
        </button>
      </div>

      {/* Resumen por espacio; cada tarjeta filtra la lista. */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Resumen
          activo={filtro === "comedor"}
          onClick={() => setFiltro(filtro === "comedor" ? "todo" : "comedor")}
          espacio="mesa"
          cifra={suma((r) => r.espacio === "mesa")}
          unidad="comensales"
          detalle={plural(n((r) => r.espacio === "mesa"), "reserva", "reservas")}
        />
        <Resumen
          activo={filtro === "despacho"}
          onClick={() => setFiltro(filtro === "despacho" ? "todo" : "despacho")}
          espacio="despacho"
          cifra={suma((r) => r.espacio === "despacho")}
          unidad="personas"
        >
          {[false, true].map((noche) => {
            const ocupadas = suma((r) => r.espacio === "despacho" && r.hora >= NOCHE === noche);
            const lleno = ocupadas >= AFORO_DESPACHO;
            return (
              <span key={String(noche)} className="mt-1.5 block">
                <span className="flex justify-between text-[0.7rem] font-semibold opacity-75">
                  <span>{noche ? "Noche" : "Mediodía"}</span>
                  <span className="tabular-nums">
                    {ocupadas}/{AFORO_DESPACHO}
                  </span>
                </span>
                <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-terracota/15">
                  <span className={`block h-full rounded-full ${lleno ? "bg-terracota" : "bg-terracota/70"}`} style={{ width: `${Math.min(100, (ocupadas / AFORO_DESPACHO) * 100)}%` }} />
                </span>
              </span>
            );
          })}
        </Resumen>
        <Resumen
          activo={filtro === "recogida"}
          onClick={() => setFiltro(filtro === "recogida" ? "todo" : "recogida")}
          espacio="recogida"
          cifra={activasDia.filter((r) => r.espacio === "recogida").reduce((a, r) => a + (r.comida?.modo === "carta" ? 0 : r.personas), 0)}
          unidad="menús"
          detalle={plural(n((r) => r.espacio === "recogida"), "encargo", "encargos")}
        />
        <Resumen
          activo={filtro === "otros"}
          onClick={() => setFiltro(filtro === "otros" ? "todo" : "otros")}
          espacio="evento"
          titulo="Eventos y grupos"
          cifra={suma((r) => r.espacio === "evento" || r.espacio === "presupuesto")}
          unidad="personas"
          detalle={`${n((r) => r.espacio === "evento")} a eventos · ${n((r) => r.espacio === "presupuesto")} presup.`}
        />
      </div>

      {pendientes.length ? (
        <p className="flex items-center gap-2 rounded-2xl bg-ratan/40 px-4 py-3 text-sm font-semibold text-carbon dark:bg-ratan/20 dark:text-crema">
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-terracota px-1.5 text-xs text-crema">{pendientes.length}</span>
          {pendientes.length === 1 ? "reserva por confirmar" : "reservas por confirmar"}: llama o confírmalas con un toque.
        </p>
      ) : null}
      {error ? <Aviso>{error}</Aviso> : null}

      <div className="flex items-center gap-2">
        {filtro !== "todo" ? (
          <button type="button" onClick={() => setFiltro("todo")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-carbon px-3 text-sm font-semibold text-crema dark:bg-crema dark:text-noche">
            Solo {filtro === "otros" ? "eventos y grupos" : ESPACIO[filtro === "comedor" ? "mesa" : filtro].label.toLowerCase()}
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div role="tablist" aria-label="Vista" className="ml-auto flex rounded-xl bg-arena p-1 dark:bg-noche-2">
          {(["lista", "linea"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className="min-h-9 rounded-lg px-3 text-sm font-semibold aria-selected:bg-white aria-selected:shadow-card dark:aria-selected:bg-noche-3"
            >
              {v === "lista" ? "Lista" : "Por mesas"}
            </button>
          ))}
        </div>
      </div>

      {vista === "lista" ? (
        visibles.length === 0 ? (
          <div className={`${card} grid place-items-center gap-2 p-10 text-center`}>
            <Icon name="calendar" className="h-8 w-8 opacity-30" />
            <p className="font-semibold">{delDia.length ? "Nada de este tipo este día." : "Sin reservas este día."}</p>
          </div>
        ) : (
          turnos.map((t) => (
            <section key={t.titulo} aria-label={t.titulo}>
              <h3 className="mb-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-carbon-muted dark:text-crema/60">
                {t.titulo}
                <span className="h-px flex-1 bg-carbon/10 dark:bg-crema/10" />
                <span className="normal-case tracking-normal">{t.lista.filter(activa).reduce((a, r) => a + (r.espacio === "recogida" ? 0 : r.personas), 0)} pers.</span>
              </h3>
              <ul className="grid gap-2 lg:grid-cols-2">
                {t.lista.map((r) => (
                  <li key={r.id}>
                    <TarjetaReserva r={r} onAbrir={() => setEditando(r)} onEstado={(e) => void estado(r, e)} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      ) : (
        <LineaTiempo reservas={activasDia} mesas={mesas} zonas={zonas} onAbrir={setEditando} />
      )}

      {editando ? (
        <ReservaForm
          reserva={editando === "nueva" ? null : editando}
          fecha={fecha}
          mesas={mesas}
          eventos={eventos}
          todas={delDia}
          onClose={() => setEditando(null)}
          onEstado={async (e) => {
            if (editando === "nueva") return;
            await estado(editando, e);
            setEditando(null);
          }}
          onGuardada={() => {
            setEditando(null);
            void cargar();
          }}
        />
      ) : null}
    </div>
  );
}

function Resumen({
  espacio,
  titulo,
  cifra,
  unidad,
  detalle,
  activo,
  onClick,
  children,
}: {
  espacio: Reserva["espacio"];
  titulo?: string;
  cifra: number;
  unidad: string;
  detalle?: string;
  activo: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  const e = ESPACIO[espacio];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`${card} relative overflow-hidden p-3.5 text-left transition-shadow aria-pressed:ring-2 aria-pressed:ring-carbon dark:aria-pressed:ring-crema`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${e.franja}`} />
      <span className="flex items-center gap-2 pl-1">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${e.chip}`}>
          <Icon name={e.icon} className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-semibold">{titulo ?? e.label}</span>
      </span>
      <span className="mt-2 block pl-1">
        <span className="font-display text-3xl tabular-nums leading-none">{cifra}</span>
        <span className="ml-1.5 text-sm opacity-70">{unidad}</span>
      </span>
      <span className="block pl-1">{children ?? (detalle ? <span className="mt-1 block text-xs opacity-65">{detalle}</span> : null)}</span>
    </button>
  );
}

/** Una reserva: franja de color del espacio, hora grande, quién y cuántos, y el siguiente paso. */
function TarjetaReserva({ r, onAbrir, onEstado }: { r: Reserva; onAbrir: () => void; onEstado: (e: EstadoReserva) => void }) {
  const e = ESPACIO[r.espacio];
  const comida = resumenComida(r.comida);
  const cerrada = !activa(r);
  const siguiente: { label: string; estado: EstadoReserva } | null =
    r.estado === "PENDIENTE"
      ? { label: "Confirmar", estado: "CONFIRMADA" }
      : r.estado === "CONFIRMADA"
        ? { label: r.espacio === "recogida" ? "Recogido" : "Han llegado", estado: "SENTADA" }
        : null;

  return (
    <article className={`${card} relative flex overflow-hidden ${cerrada ? "opacity-55" : ""}`}>
      <span aria-hidden="true" className={`w-1.5 shrink-0 ${e.franja}`} />
      <div className="min-w-0 flex-1 p-3.5">
        <button type="button" onClick={onAbrir} className="flex w-full items-start gap-3 text-left">
          <span className="w-[4.6rem] shrink-0">
            <span className="block font-display text-[1.65rem] leading-none tabular-nums">{r.hora}</span>
            <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${e.chip}`}>
              <Icon name={e.icon} className="h-3 w-3" />
              {r.espacio === "mesa" ? "Comedor" : r.espacio === "despacho" ? "Despacho" : r.espacio === "recogida" ? "Recoger" : e.label}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="truncate text-[1.05rem] font-semibold">{r.nombre}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${ESTADO[r.estado].clase}`}>{ESTADO[r.estado].label}</span>
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Icon name={r.espacio === "recogida" ? "bag" : "users"} className="h-4 w-4 opacity-60" />
                {cuantos(r)} {unidad(r)}
              </span>
              {r.mesas.length ? <span className="opacity-70">Mesa {r.mesas.map((m) => m.numero).join(" + ")}</span> : null}
              {r.origen === "web" ? <span className="opacity-50">web</span> : null}
            </span>
            {r.evento ? <span className="mt-1 block truncate text-sm font-semibold text-neon-deep dark:text-neon">{r.evento}</span> : null}
            {comida ? <span className="mt-1 block text-sm text-oliva dark:text-oliva-soft">{comida}</span> : null}
            {r.notas ? <span className="mt-1 block text-sm italic opacity-75">«{r.notas}»</span> : null}
          </span>
        </button>
        {siguiente ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onEstado(siguiente.estado)}
              className={`${siguiente.estado === "CONFIRMADA" ? botonPrimario : botonSecundario} flex-1`}
            >
              <Icon name="check" className="h-4 w-4" />
              {siguiente.label}
            </button>
            <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className={`${botonSecundario} px-4`}>
              <Icon name="phone" className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Llamar</span>
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LineaTiempo({ reservas, mesas, zonas, onAbrir }: { reservas: Reserva[]; mesas: MesaSalon[]; zonas: Zona[]; onAbrir: (r: Reserva) => void }) {
  const desde = 7 * 60;
  const hasta = 24 * 60;
  const pct = (m: number) => `${((m - desde) / (hasta - desde)) * 100}%`;
  const sinMesa = reservas.filter((r) => r.mesas.length === 0 && r.espacio !== "recogida");
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
  onEstado,
  onGuardada,
}: {
  reserva: Reserva | null;
  fecha: string;
  mesas: MesaSalon[];
  eventos: EventoLite[];
  todas: Reserva[];
  onClose: () => void;
  onEstado: (e: EstadoReserva) => void | Promise<void>;
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
            <option value="mesa">Comedor</option>
            <option value="despacho">El Despacho</option>
            <option value="recogida">Recogida de menú</option>
            <option value="evento">Evento</option>
            <option value="presupuesto">Presupuesto de grupo</option>
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
            {[...mesas].sort((a, b) => a.numero.localeCompare(b.numero, "es", { numeric: true })).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={f.mesas.includes(m.id)}
                onClick={() => set({ mesas: f.mesas.includes(m.id) ? f.mesas.filter((x) => x !== m.id) : [...f.mesas, m.id] })}
                className="min-h-10 rounded-xl border border-carbon/15 px-3 text-sm aria-pressed:border-marino aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema dark:border-crema/15 dark:aria-pressed:bg-neon dark:aria-pressed:text-noche"
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
        {r && (r.estado === "PENDIENTE" || r.estado === "CONFIRMADA") ? (
          <div className="grid grid-cols-2 gap-2 border-t border-carbon/10 pt-3 sm:col-span-2 dark:border-crema/10">
            <button type="button" onClick={() => void onEstado("NO_SHOW")} className={botonSecundario}>
              No vino
            </button>
            <button type="button" onClick={() => window.confirm(`¿Cancelar la reserva de ${r.nombre}?`) && void onEstado("CANCELADA")} className={`${botonSecundario} text-terracota`}>
              Cancelar reserva
            </button>
          </div>
        ) : r ? (
          <button type="button" onClick={() => void onEstado("CONFIRMADA")} className={`${botonSecundario} sm:col-span-2`}>
            Volver a activarla
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
