"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AvisarCliente, BotonWhatsApp, avisoSegunEstado } from "@/components/admin/AvisarCliente";
import { Modal } from "@/components/admin/Modal";
import { Aviso, boton, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colaCocina, estadoReserva, guardarReserva, rpcAdmin } from "@/lib/admin/actions";
import type { MesaSalon, PedidoKds, Zona } from "@/lib/admin/types";
import { formatCentimos, formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { asunto, textoAviso, type AvisoReserva } from "@/lib/reservas/mensajes";
import { SITE } from "@/lib/site";

export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "SENTADA" | "CANCELADA" | "NO_SHOW";

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

export const ESTADO: Record<EstadoReserva, { label: string; clase: string }> = {
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
/** Antes de esta hora, desayunos: van en su propio grupo («Mañana»), no en el mediodía. */
const MEDIODIA = "12:00";

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
 * La vista «Por mesas» (línea de tiempo) sigue para quien trabaja con el salón
 * (con `conMesas`; el encargado no usa mesas y no la ve).
 */
export function ReservasBoard({ mesas, zonas, eventos, conMesas = true }: { mesas: MesaSalon[]; zonas: Zona[]; eventos: EventoLite[]; conMesas?: boolean }) {
  const hoy = hoyEnMadrid();
  const router = useRouter();
  const [fecha, setFecha] = useState(hoy);
  // Pedidos de «Pedir para llevar» de hoy (los pedidos son siempre del mismo día):
  // cuentan en «Para recoger» y salen en la agenda en su hora de recogida.
  const [pedidosHoy, setPedidosHoy] = useState<PedidoKds[]>([]);
  const [vista, setVista] = useState<"lista" | "linea">("lista");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [editando, setEditando] = useState<Reserva | "nueva" | null>(null);
  const [presupuestos, setPresupuestos] = useState<Reserva[]>([]);
  /** Recién confirmada o cancelada: falta que el cliente se entere. */
  const [avisar, setAvisar] = useState<{ tipo: AvisoReserva; reserva: Reserva; email: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La semana (lunes a domingo) del día elegido: se carga entera para ver cuántas hay cada día.
  const desde = lunesDe(fecha);
  const hasta = desplazar(desde, 6);
  const estaSemana = desde === lunesDe(hoy);
  const cargar = useCallback(async () => {
    const [r, enMarcha, hechos, futuras] = await Promise.all([
      rpcAdmin<Reserva[]>("laofi_admin_reservas", { p_desde: desde, p_hasta: hasta }),
      colaCocina<PedidoKds>(),
      colaCocina<PedidoKds>(true),
      // Presupuestos por responder del próximo año, estén en la semana que estén.
      rpcAdmin<Reserva[]>("laofi_admin_reservas", { p_desde: hoy, p_hasta: desplazar(hoy, 365) }),
    ]);
    if (r.ok) {
      setReservas(r.data);
      setError(null);
    } else setError(r.error);
    if (futuras.ok) setPresupuestos(futuras.data.filter((x) => x.espacio === "presupuesto" && x.estado === "PENDIENTE"));
    const recoger = (l: typeof enMarcha) => (l.ok ? l.data.filter((p) => p.tipo === "RECOGIDA" && p.estado !== "CANCELLED") : []);
    setPedidosHoy([...recoger(enMarcha), ...recoger(hechos)]);
  }, [desde, hasta, hoy]);

  useEffect(() => {
    void cargar();
    const t = window.setInterval(() => void cargar(), 30_000);
    return () => window.clearInterval(t);
  }, [cargar]);

  const estado = async (r: Reserva, e: EstadoReserva) => {
    const res = await estadoReserva<Reserva>(r.id, e, r.estado);
    if (!res.ok) return setError(res.error);
    const { reserva, aviso, email } = res.data;
    setReservas((l) => l.map((x) => (x.id === r.id ? reserva : x)));
    setPresupuestos((l) => l.filter((x) => x.id !== r.id || reserva.estado === "PENDIENTE"));
    setAvisar(aviso ? { tipo: aviso, reserva, email } : null);
  };

  const delDia = reservas.filter((r) => r.fecha === fecha);
  const activasDia = delDia.filter(activa);
  const pendientes = delDia.filter((r) => r.estado === "PENDIENTE");
  const visibles = delDia.filter((r) => filtro === "todo" || ESPACIO[r.espacio].filtro === filtro);

  const suma = (f: (r: Reserva) => boolean) => activasDia.filter(f).reduce((a, r) => a + r.personas, 0);
  const n = (f: (r: Reserva) => boolean) => activasDia.filter(f).length;
  const pedidosDia = fecha === hoy ? pedidosHoy.length : 0;
  const pedidosVisibles = fecha === hoy && (filtro === "todo" || filtro === "recogida") ? pedidosHoy : [];
  // La agenda del día: reservas y pedidos para recoger juntos, por turno y por hora.
  const agenda = turnosDeAgenda(visibles, pedidosVisibles);
  const encargosDia = n((r) => r.espacio === "recogida");
  const vistaEfectiva = conMesas ? vista : "lista";
  const dias = Array.from({ length: 7 }, (_, i) => desplazar(desde, i));

  return (
    <div className="grid gap-4">
      {presupuestos.length ? <BandejaPresupuestos lista={presupuestos} onAbrir={setEditando} onIrDia={setFecha} /> : null}

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
                {/* El punto de «por confirmar», pegado al número del día (en escritorio la casilla es ancha). */}
                <span className="relative font-display text-xl leading-tight tabular-nums sm:text-2xl">
                  {Number(d.slice(8))}
                  {porConfirmar ? <span aria-hidden="true" className="absolute -right-2 top-0.5 h-1.5 w-1.5 rounded-full bg-terracota sm:-right-2.5 sm:h-2 sm:w-2" /> : null}
                </span>
                <span className={`text-[0.68rem] font-semibold tabular-nums ${total ? "" : "opacity-35"}`}>{total || "–"}</span>
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
        {/* Los pedidos de «Pedir para llevar» se gestionan en Pedidos: si solo hay de esos, la tarjeta lleva allí. */}
        <Resumen
          activo={filtro === "recogida"}
          onClick={() => (pedidosDia && !encargosDia ? router.push("/admin/pedidos") : setFiltro(filtro === "recogida" ? "todo" : "recogida"))}
          espacio="recogida"
          cifra={pedidosDia + encargosDia}
          unidad={pedidosDia + encargosDia === 1 ? "pedido" : "pedidos"}
          detalle={pedidosDia ? `${plural(pedidosDia, "para llevar", "para llevar")}${encargosDia ? ` · ${plural(encargosDia, "encargo", "encargos")}` : ""} · ver en Pedidos →` : plural(encargosDia, "encargo", "encargos")}
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
        {conMesas ? (
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
        ) : null}
      </div>

      {vistaEfectiva === "lista" ? (
        agenda.length === 0 ? (
          <div className={`${card} grid place-items-center gap-2 p-10 text-center`}>
            <Icon name="calendar" className="h-8 w-8 opacity-30" />
            <p className="font-semibold">{delDia.length ? "Nada de este tipo este día." : "Sin reservas este día."}</p>
          </div>
        ) : (
          agenda.map((t) => (
            <section key={t.titulo} aria-label={t.titulo} className="grid gap-2">
              <h3 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-carbon-muted dark:text-crema/60">
                {t.titulo}
                <span className="h-px flex-1 bg-carbon/10 dark:bg-crema/10" />
                <span className="normal-case tracking-normal">{resumenHueco(t.horas.flatMap((h) => h.reservas), t.horas.flatMap((h) => h.pedidos))}</span>
              </h3>
              {t.horas.map((h) => (
                // Cada hora en una fila de la agenda: la hora a la izquierda y todo lo de esa hora alineado a su lado.
                <div key={h.hora} className="grid grid-cols-[3.4rem_minmax(0,1fr)] gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-3">
                  <div className="pt-2.5 text-right">
                    <p className="font-display text-xl leading-none tabular-nums sm:text-2xl">{h.hora}</p>
                    <p className="mt-1 text-[0.65rem] leading-tight text-carbon-muted dark:text-crema/55">{resumenHueco(h.reservas, h.pedidos, true)}</p>
                  </div>
                  <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
                    {h.reservas.map((r) => (
                      <li key={r.id}>
                        <FilaReserva r={r} onAbrir={() => setEditando(r)} onEstado={(e) => void estado(r, e)} />
                      </li>
                    ))}
                    {h.pedidos.map((p) => (
                      <li key={p.id}>
                        <FilaPedido p={p} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
          zonas={zonas}
          eventos={eventos}
          todas={reservas}
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

      {/* Con una reserva abierta se esconde (tapaba sus botones): ahí está el WhatsApp de la barra de contacto. */}
      {avisar && !editando ? <AvisarCliente key={`${avisar.reserva.id}-${avisar.tipo}`} {...avisar} onCerrar={() => setAvisar(null)} /> : null}
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

/** Hora «HH:MM» en Madrid de un pedido para recoger. */
const HORA_MADRID = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const horaPedido = (p: PedidoKds) => (p.recogida_en ? HORA_MADRID.format(new Date(p.recogida_en)) : "00:00");

interface HuecoAgenda {
  hora: string;
  reservas: Reserva[];
  pedidos: PedidoKds[];
}

/** Turnos (mañana, mediodía, noche) con sus horas; en cada hora, sus reservas y sus pedidos. */
function turnosDeAgenda(reservas: Reserva[], pedidos: PedidoKds[]): { titulo: string; horas: HuecoAgenda[] }[] {
  const huecos = new Map<string, HuecoAgenda>();
  const hueco = (hora: string) => {
    const h = huecos.get(hora) ?? { hora, reservas: [], pedidos: [] };
    huecos.set(hora, h);
    return h;
  };
  for (const r of reservas) hueco(r.hora.slice(0, 5)).reservas.push(r);
  for (const p of pedidos) hueco(horaPedido(p)).pedidos.push(p);
  const horas = [...huecos.values()].sort((a, b) => a.hora.localeCompare(b.hora));
  return [
    { titulo: "Mañana", horas: horas.filter((h) => h.hora < MEDIODIA) },
    { titulo: "Mediodía", horas: horas.filter((h) => h.hora >= MEDIODIA && h.hora < NOCHE) },
    { titulo: "Noche", horas: horas.filter((h) => h.hora >= NOCHE) },
  ].filter((t) => t.horas.length);
}

/** «13 pers. · 2 recoger» (corto, debajo de la hora) o «13 personas · 2 para recoger». */
function resumenHueco(reservas: Reserva[], pedidos: PedidoKds[], corto = false): string {
  const personas = reservas.filter((r) => activa(r) && r.espacio !== "recogida").reduce((a, r) => a + r.personas, 0);
  return [
    personas ? (corto ? `${personas} pers.` : plural(personas, "persona", "personas")) : null,
    pedidos.length ? (corto ? `${pedidos.length} recoger` : `${pedidos.length} para recoger`) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Una reserva en una línea: el espacio (color e icono), quién, cuántos, en qué
 * estado y si traen comida o notas; a la derecha, el siguiente paso. Tocarla abre
 * todo el detalle.
 */
function FilaReserva({ r, onAbrir, onEstado }: { r: Reserva; onAbrir: () => void; onEstado: (e: EstadoReserva) => void }) {
  const e = ESPACIO[r.espacio];
  const cerrada = !activa(r);
  const siguiente: { label: string; estado: EstadoReserva } | null =
    r.estado === "PENDIENTE"
      ? { label: "Confirmar", estado: "CONFIRMADA" }
      : r.estado === "CONFIRMADA"
        ? { label: r.espacio === "recogida" ? "Recogido" : "Llegaron", estado: "SENTADA" }
        : null;
  const platos = r.comida?.lineas.reduce((a, l) => a + l.cantidad, 0) ?? 0;
  const extras = [
    r.comida ? `${r.comida.modo === "menu" ? "Menú del día" : "Carta"}${platos ? ` (${platos})` : ""}` : null,
    r.evento,
    r.mesas.length ? `Mesa ${r.mesas.map((m) => m.numero).join("+")}` : null,
  ].filter(Boolean);

  return (
    <div className={`relative flex items-center gap-2.5 py-2.5 pl-3.5 pr-2.5 ${cerrada ? "opacity-50" : ""}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${e.franja}`} />
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${e.chip}`} title={e.label}>
          <Icon name={e.icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{r.nombre}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">
              {cuantos(r)} {r.espacio === "recogida" ? unidad(r) : "p."}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-carbon-muted dark:text-crema/60">
            <span className={`shrink-0 font-semibold ${r.estado === "PENDIENTE" ? "text-terracota" : r.estado === "SENTADA" ? "text-oliva dark:text-oliva-soft" : ""}`}>
              {ESTADO[r.estado].label}
            </span>
            {extras.length ? <span className="truncate">· {extras.join(" · ")}</span> : null}
            {r.notas ? (
              <span className="inline-flex shrink-0 items-center gap-0.5" title={r.notas}>
                · <Icon name="edit" className="h-3 w-3" />
                <span className="sr-only">Tiene notas: {r.notas}</span>
              </span>
            ) : null}
          </span>
        </span>
      </button>
      {siguiente ? (
        <button
          type="button"
          onClick={() => onEstado(siguiente.estado)}
          className={`min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold ${siguiente.estado === "CONFIRMADA" ? "bg-marino text-crema dark:bg-neon dark:text-noche" : "ring-1 ring-carbon/15 dark:ring-crema/20"}`}
        >
          {siguiente.label}
        </button>
      ) : null}
      {/* En el móvil, sin el botón de llamar: el nombre necesita el sitio y el teléfono está al abrir la reserva. */}
      <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-carbon/10 sm:grid dark:ring-crema/15" aria-label={`Llamar a ${r.nombre}`}>
        <Icon name="phone" className="h-4 w-4" />
      </a>
    </div>
  );
}

const PASO_PEDIDO: Record<string, { label: string; clase: string }> = {
  RECEIVED: { label: "Nuevo", clase: "bg-terracota text-crema" },
  ACCEPTED: { label: "Preparando", clase: "bg-ratan text-carbon" },
  PREPARING: { label: "Preparando", clase: "bg-ratan text-carbon" },
  READY: { label: "Listo", clase: "bg-oliva text-crema" },
  DELIVERED: { label: "Entregado", clase: "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/60" },
};

/** Un pedido para recoger en la agenda: quién, qué y en qué paso va. Se gestiona en Pedidos. */
function FilaPedido({ p }: { p: PedidoKds }) {
  const e = ESPACIO.recogida;
  const paso = PASO_PEDIDO[p.estado] ?? PASO_PEDIDO.RECEIVED!;
  const productos = p.items.filter((i) => i.estado !== "CANCELLED");
  const menus = productos.filter((i) => i.nombre === "Menú del día").reduce((a, i) => a + i.cantidad, 0);
  const resto = productos.filter((i) => i.nombre !== "Menú del día").map((i) => (i.cantidad > 1 ? `${i.cantidad}× ${i.nombre}` : i.nombre));
  const que = [menus ? plural(menus, "menú", "menús") : null, ...resto].filter(Boolean).join(", ");
  return (
    <Link href="/admin/pedidos" className={`relative flex items-center gap-2.5 py-2.5 pl-3.5 pr-2.5 hover:bg-arena/50 dark:hover:bg-noche-3 ${p.estado === "DELIVERED" ? "opacity-50" : ""}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${e.franja}`} />
      <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${e.chip}`} title={e.label}>
        <Icon name="bag" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-semibold">{p.nombre_cliente ?? "Sin nombre"}</span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">{formatCentimos(p.total_centimos)}</span>
        </span>
        <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">Para recoger · {que}</span>
      </span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${paso.clase}`}>{paso.label}</span>
    </Link>
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

/** Los tipos de reserva en el orden del formulario, con lo que pide cada uno. */
const TIPOS: { espacio: Reserva["espacio"]; label: string; ayuda: string }[] = [
  { espacio: "mesa", label: "Comedor", ayuda: "Mesa en el comedor, la barra o la terraza." },
  { espacio: "despacho", label: "El Despacho", ayuda: "Sala aparte, con su propio aforo por turno." },
  { espacio: "recogida", label: "Recoger", ayuda: "Menús del día para llevar: sin mesa." },
  { espacio: "evento", label: "Evento", ayuda: "Se apuntan a un evento de la agenda." },
  { espacio: "presupuesto", label: "Presupuesto", ayuda: "Grupo o empresa que pide precio: sin mesa hasta cerrarlo." },
];

/** Solo comedor y El Despacho ocupan mesas (y duran un tiempo). */
const conMesa = (e: Reserva["espacio"]) => e === "mesa" || e === "despacho";

/** Las notas que deja la web en un presupuesto, sin el «Presupuesto ·» del principio. */
const detallePresupuesto = (notas: string | null) => (notas ?? "").replace(/^Presupuesto\s*·\s*/, "");

/**
 * Peticiones de presupuesto aún sin responder, sea cual sea su fecha: la agenda
 * va por días y un grupo para dentro de un mes no saldría hasta llegar a esa semana.
 */
function BandejaPresupuestos({ lista, onAbrir, onIrDia }: { lista: Reserva[]; onAbrir: (r: Reserva) => void; onIrDia: (f: string) => void }) {
  const e = ESPACIO.presupuesto;
  return (
    <section aria-label="Presupuestos por responder" className={`${card} relative overflow-hidden`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${e.franja}`} />
      <div className="flex items-center gap-2 border-b border-carbon/[0.07] py-3 pl-5 pr-4 dark:border-crema/10">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${e.chip}`}>
          <Icon name={e.icon} className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold">Presupuestos por responder</h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-terracota px-1.5 text-xs font-semibold text-crema">{lista.length}</span>
        <span className="ml-auto hidden text-xs text-carbon-muted sm:block dark:text-crema/60">Llama o escribe con el precio y confírmalo cuando lo acepten.</span>
      </div>
      <ul className="divide-y divide-carbon/[0.07] dark:divide-crema/10">
        {lista.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3 pl-5 pr-3">
            <button type="button" onClick={() => onAbrir(r)} className="min-w-0 flex-1 text-left">
              <span className="flex items-baseline gap-2">
                <span className="truncate font-semibold">{r.nombre}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">{r.personas} p.</span>
              </span>
              <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">{detallePresupuesto(r.notas) || "Sin detalles"}</span>
            </button>
            <button
              type="button"
              onClick={() => onIrDia(r.fecha)}
              className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-right text-xs font-semibold leading-tight hover:bg-arena sm:block dark:hover:bg-noche-3"
              title="Ver ese día en la agenda"
            >
              <span className="block first-letter:uppercase">{DIA_SEMANA.format(new Date(`${r.fecha}T12:00:00Z`)).replace(".", "")} {diaMes(r.fecha)}</span>
              <span className="font-normal opacity-60">{r.hora.slice(0, 5)}</span>
            </button>
            <BotonWhatsApp tipo="presupuesto" reserva={r} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#1F7A4D] ring-1 ring-carbon/10 dark:text-[#4CC38A] dark:ring-crema/15">
              <span className="sr-only">WhatsApp a {r.nombre}</span>
            </BotonWhatsApp>
            {r.email ? (
              <a href={mailPresupuesto(r)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-carbon/10 dark:ring-crema/15" aria-label={`Escribir a ${r.nombre}`}>
                <Icon name="mail" className="h-4 w-4" />
              </a>
            ) : null}
            <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-carbon/10 dark:ring-crema/15" aria-label={`Llamar a ${r.nombre}`}>
              <Icon name="phone" className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El mismo texto que el WhatsApp del presupuesto, en un email que se termina y se envía desde el correo del local. */
const mailPresupuesto = (r: Reserva) =>
  `mailto:${r.email}?subject=${encodeURIComponent(asunto("presupuesto", r))}&body=${encodeURIComponent(textoAviso("presupuesto", r, "", SITE.phone.display))}`;

/**
 * Mesas en un desplegable: solo las del espacio elegido, agrupadas por zona, con
 * sus plazas y avisando de las que ya están reservadas a esa hora.
 */
function SelectorMesas({
  mesas,
  zonas,
  elegidas,
  ocupadas,
  onChange,
}: {
  mesas: MesaSalon[];
  zonas: Zona[];
  elegidas: string[];
  ocupadas: Set<string>;
  onChange: (ids: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!abierto || !el) return;
    const fuera = (e: PointerEvent) => !el.contains(e.target as Node) && setAbierto(false);
    // Escape cierra el desplegable, no el modal entero.
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    el.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      el.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const porNumero = (a: MesaSalon, b: MesaSalon) => a.numero.localeCompare(b.numero, "es", { numeric: true });
  const grupos = [
    ...zonas.map((z) => ({ id: z.id, nombre: z.nombre, mesas: mesas.filter((m) => m.zona_id === z.id).sort(porNumero) })),
    { id: "sin-zona", nombre: "Sin zona", mesas: mesas.filter((m) => !zonas.some((z) => z.id === m.zona_id)).sort(porNumero) },
  ].filter((g) => g.mesas.length);
  const nombres = mesas.filter((m) => elegidas.includes(m.id)).sort(porNumero).map((m) => m.numero);
  const alternar = (id: string) => onChange(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className={`${input} flex items-center gap-2 text-left`}
      >
        <span className={`min-w-0 flex-1 truncate ${nombres.length ? "" : "text-carbon-muted dark:text-crema/50"}`}>
          {nombres.length ? `${nombres.length === 1 ? "Mesa" : "Mesas"} ${nombres.join(" + ")}` : "Sin asignar"}
        </span>
        <Icon name="chevronDown" className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Mesas"
          className="absolute inset-x-0 top-full z-10 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-carbon/10 bg-white p-1.5 shadow-lift dark:border-crema/15 dark:bg-noche-3"
        >
          {grupos.map((g) => (
            <div key={g.id} role="group" aria-label={g.nombre}>
              {grupos.length > 1 ? (
                <p className="px-2.5 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-carbon-muted dark:text-crema/55">{g.nombre}</p>
              ) : null}
              {g.mesas.map((m) => {
                const sel = elegidas.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    onClick={() => alternar(m.id)}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-arena aria-selected:bg-marino/[0.07] dark:hover:bg-noche-2 dark:aria-selected:bg-neon/10"
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        sel ? "border-marino bg-marino text-crema dark:border-neon dark:bg-neon dark:text-noche" : "border-carbon/25 dark:border-crema/25"
                      }`}
                    >
                      {sel ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="font-semibold">Mesa {m.numero}</span>
                    {ocupadas.has(m.id) ? <span className="rounded-full bg-terracota-soft px-2 py-0.5 text-[0.68rem] font-semibold text-terracota">Reservada a esa hora</span> : null}
                    <span className="ml-auto text-xs tabular-nums text-carbon-muted dark:text-crema/55">{plural(m.capacidad, "plaza", "plazas")}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {elegidas.length ? (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-terracota hover:bg-arena dark:hover:bg-noche-2">
              Quitar todas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReservaForm({
  reserva,
  fecha,
  mesas,
  zonas,
  eventos,
  todas,
  onClose,
  onEstado,
  onGuardada,
}: {
  reserva: Reserva | null;
  fecha: string;
  mesas: MesaSalon[];
  zonas: Zona[];
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
    hora: r?.hora.slice(0, 5) ?? "14:00",
    duracion_min: r?.duracion_min ?? 90,
    espacio: r?.espacio ?? ("mesa" as Reserva["espacio"]),
    evento_id: r?.evento_id ?? "",
    notas: r?.notas ?? "",
    mesas: r?.mesas.map((m) => m.id) ?? ([] as string[]),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  // Las mesas de El Despacho son las de su zona; el comedor, todas las demás (barra y terraza incluidas).
  const despacho = new Set(zonas.filter((z) => z.tipo === "despacho").map((z) => z.id));
  const mesasDe = (e: Reserva["espacio"]) =>
    e === "despacho" ? mesas.filter((m) => m.zona_id && despacho.has(m.zona_id)) : e === "mesa" ? mesas.filter((m) => !m.zona_id || !despacho.has(m.zona_id)) : [];
  const delEspacio = mesasDe(f.espacio);
  const delDia = todas.filter((x) => x.fecha === f.fecha);
  const hueco = { id: r?.id ?? "", hora: f.hora, duracion_min: f.duracion_min };
  const choques = solapes(hueco, f.mesas, delDia);
  const ocupadas = new Set(delEspacio.filter((m) => solapes(hueco, [m.id], delDia).length).map((m) => m.id));
  const plazas = mesas.filter((m) => f.mesas.includes(m.id)).reduce((a, m) => a + m.capacidad, 0);
  const tipo = TIPOS.find((t) => t.espacio === f.espacio) ?? TIPOS[0]!;

  // Al cambiar de tipo se quedan solo las mesas que siguen valiendo (ninguna si no lleva mesa).
  const cambiarTipo = (espacio: Reserva["espacio"]) => {
    const validas = new Set(mesasDe(espacio).map((m) => m.id));
    set({ espacio, mesas: f.mesas.filter((id) => validas.has(id)), evento_id: espacio === "evento" ? f.evento_id : "" });
  };

  const enviar = async () => {
    setError(null);
    // Nueva y con email: le llega la confirmación (guardarReserva).
    const res = await guardarReserva<Reserva>({ ...(r ? { id: r.id } : { origen: "telefono", estado: f.espacio === "presupuesto" ? "PENDIENTE" : "CONFIRMADA" }), ...f, evento_id: f.evento_id || null });
    if (!res.ok) return setError(res.error);
    onGuardada();
  };

  const etiqueta = "text-xs font-semibold uppercase tracking-[0.14em] text-carbon-muted dark:text-crema/60";

  return (
    <Modal titulo={r ? `${r.espacio === "presupuesto" ? "Presupuesto" : "Reserva"} de ${r.nombre}` : "Nueva reserva"} onClose={onClose} ancho="max-w-2xl">
      {/* La fila de la agenda va resumida: aquí, lo que han pedido y llamar o escribir con un toque. */}
      {r ? (
        <div className="mb-5 grid gap-2 rounded-2xl bg-arena/60 p-3 dark:bg-noche-3">
          <div className="flex flex-wrap gap-2">
            {/* Presupuesto sin cerrar: lo primero, mandarle la propuesta por WhatsApp (el teléfono siempre lo dejan). */}
            {r.espacio === "presupuesto" && r.estado === "PENDIENTE" ? (
              <BotonWhatsApp tipo="presupuesto" reserva={r} className={`${boton} bg-[#1F7A4D] text-white hover:brightness-110`}>
                Enviar presupuesto
              </BotonWhatsApp>
            ) : null}
            <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className={botonSecundario}>
              <Icon name="phone" className="h-4 w-4" />
              Llamar · {r.telefono}
            </a>
            {r.email ? (
              <a href={r.espacio === "presupuesto" ? mailPresupuesto(r) : `mailto:${r.email}`} className={botonSecundario}>
                <Icon name="mail" className="h-4 w-4" />
                {r.espacio === "presupuesto" ? "Por email" : "Escribir"}
              </a>
            ) : null}
            {r.espacio !== "presupuesto" || r.estado !== "PENDIENTE" ? <BotonWhatsApp tipo={avisoSegunEstado(r.estado)} reserva={r} /> : null}
          </div>
          {resumenComida(r.comida) ? <p className="text-sm text-oliva dark:text-oliva-soft">{resumenComida(r.comida)}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-5">
        {/* Primero qué es: de eso depende el resto del formulario. */}
        <fieldset>
          <legend className={etiqueta}>Tipo de reserva</legend>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {TIPOS.map((t) => {
              const e = ESPACIO[t.espacio];
              return (
                <button
                  key={t.espacio}
                  type="button"
                  aria-pressed={f.espacio === t.espacio}
                  onClick={() => cambiarTipo(t.espacio)}
                  className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-carbon/15 bg-white px-1 text-xs font-semibold transition-colors hover:bg-arena aria-pressed:border-carbon aria-pressed:ring-1 aria-pressed:ring-carbon dark:border-crema/15 dark:bg-noche-3 dark:hover:bg-noche-2 dark:aria-pressed:border-crema dark:aria-pressed:ring-crema"
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${e.chip}`}>
                    <Icon name={e.icon} className="h-4 w-4" />
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-carbon-muted dark:text-crema/60">{tipo.ayuda}</p>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className={`${etiqueta} mb-2`}>{f.espacio === "presupuesto" ? "Quién lo pide" : "Cliente"}</legend>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Nombre</span>
            <input value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Teléfono</span>
            <input value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} inputMode="tel" className={input} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-semibold">
              Email <span className="font-normal text-carbon-muted dark:text-crema/55">{f.espacio === "presupuesto" ? "(para enviar el presupuesto)" : "(opcional)"}</span>
            </span>
            <input value={f.email} onChange={(e) => set({ email: e.target.value })} inputMode="email" className={input} />
          </label>
        </fieldset>

        <fieldset className={`grid gap-3 ${conMesa(f.espacio) ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          <legend className={`${etiqueta} mb-2`}>{f.espacio === "recogida" ? "Cuándo lo recogen" : f.espacio === "presupuesto" ? "Para cuándo" : "Cuándo"}</legend>
          <label className="col-span-2 grid gap-1 text-sm sm:col-span-1">
            <span className="font-semibold">Fecha</span>
            <input type="date" value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Hora</span>
            <input type="time" value={f.hora} onChange={(e) => set({ hora: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{f.espacio === "recogida" ? "Menús" : "Personas"}</span>
            <input type="number" min={1} max={220} value={f.personas} onChange={(e) => set({ personas: Number(e.target.value) })} className={input} />
          </label>
          {conMesa(f.espacio) ? (
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Duración</span>
              <select value={f.duracion_min} onChange={(e) => set({ duracion_min: Number(e.target.value) })} className={input}>
                {[...new Set([60, 90, 120, 150, 180, 240, f.duracion_min])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </fieldset>

        {f.espacio === "evento" ? (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Evento</span>
            <select value={f.evento_id} onChange={(e) => set({ evento_id: e.target.value })} className={input}>
              <option value="">Elige el evento…</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} · {diaMes(ev.fecha)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {conMesa(f.espacio) && delEspacio.length ? (
          <div className="grid gap-1 text-sm">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">Mesas {f.espacio === "despacho" ? "de El Despacho" : ""}</span>
              {f.mesas.length ? (
                <span className={`text-xs font-semibold tabular-nums ${plazas < f.personas ? "text-terracota" : "text-oliva dark:text-oliva-soft"}`}>
                  {plazas} plazas para {f.personas}
                </span>
              ) : (
                <span className="text-xs text-carbon-muted dark:text-crema/55">Se puede asignar luego</span>
              )}
            </span>
            <SelectorMesas mesas={delEspacio} zonas={zonas} elegidas={f.mesas} ocupadas={ocupadas} onChange={(ids) => set({ mesas: ids })} />
            {choques.length ? <p className="mt-1 text-sm font-semibold text-terracota">Ojo: la mesa {choques.join(", ")} ya está reservada a esa hora.</p> : null}
            {f.mesas.length && plazas < f.personas ? <p className="mt-1 text-sm text-terracota">Las mesas elegidas no llegan a {f.personas} plazas.</p> : null}
          </div>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{f.espacio === "presupuesto" ? "Qué piden" : "Notas"}</span>
          {f.espacio === "presupuesto" ? (
            <textarea
              value={f.notas}
              onChange={(e) => set({ notas: e.target.value })}
              rows={3}
              placeholder="Comida de empresa, necesitan factura, 3 vegetarianos…"
              className={`${input} h-auto py-2.5`}
            />
          ) : (
            <input value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Trona, celíaco, cumpleaños…" className={input} />
          )}
        </label>

        {error ? <Aviso>{error}</Aviso> : null}
        <div className="grid gap-2">
          <button type="button" onClick={() => void enviar()} disabled={!f.nombre.trim() || f.telefono.replace(/\D/g, "").length < 9} className={botonPrimario}>
            {r ? "Guardar cambios" : f.espacio === "presupuesto" ? "Guardar petición" : "Guardar reserva"}
          </button>
          {r && r.estado === "PENDIENTE" && r.espacio === "presupuesto" ? (
            // Aún sin cerrar: o lo aceptan (pasa a confirmada) o se descarta.
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void onEstado("CONFIRMADA")} className={botonSecundario}>
                <Icon name="check" className="h-4 w-4" />
                Lo han aceptado
              </button>
              <button type="button" onClick={() => window.confirm(`¿Descartar el presupuesto de ${r.nombre}?`) && void onEstado("CANCELADA")} className={`${botonSecundario} text-terracota`}>
                Descartar
              </button>
            </div>
          ) : r && (r.estado === "PENDIENTE" || r.estado === "CONFIRMADA") ? (
            <div className="grid grid-cols-2 gap-2 border-t border-carbon/10 pt-3 dark:border-crema/10">
              <button type="button" onClick={() => void onEstado("NO_SHOW")} className={botonSecundario}>
                No vino
              </button>
              <button type="button" onClick={() => window.confirm(`¿Cancelar la reserva de ${r.nombre}?`) && void onEstado("CANCELADA")} className={`${botonSecundario} text-terracota`}>
                Cancelar reserva
              </button>
            </div>
          ) : r ? (
            <button type="button" onClick={() => void onEstado("CONFIRMADA")} className={botonSecundario}>
              Volver a activarla
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
