"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CobroModal } from "@/components/admin/CobroModal";
import { Modal } from "@/components/admin/Modal";
import { Plano2D } from "@/components/admin/salon/Plano2D";
import { Aviso, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, accionSalon, cobrar, rpcAdmin, salonYReservas } from "@/lib/admin/actions";
import { minutosDesde, posicionesPorDefecto } from "@/lib/admin/plano";
import type { Rol } from "@/lib/admin/roles";
import { ESTADO_MESA, estadoMesa, type EstadoMesa, type MesaSalon, type ReservaDia, type SalonData } from "@/lib/admin/types";
import { formatCentimos, hoyEnMadrid } from "@/lib/format";
import { cuentaHTML, imprimirHTML, type DatosFiscales } from "@/lib/print/ticket";
import { escucharLaofi } from "@/lib/supabase/browser";

const Plano3D = dynamic(() => import("@/components/admin/salon/Plano3D"), {
  ssr: false,
  loading: () => <div className="grid h-[62vh] place-items-center rounded-[1.25rem] lg:h-full bg-noche text-crema/60">Cargando 3D…</div>,
});

/** Preferencia del dispositivo: ver solo las mesas propias (y sus avisos en «Hoy»). */
export const CLAVE_MIS_MESAS = "laofi:admin:mis-mesas";

interface CuentaMesa {
  mesa: { numero: string; nombre: string | null; comensales: number };
  pedido_ids: string[];
  lineas: { nombre: string; cantidad: number; precio_unitario_centimos: number; iva_pct: number; invitacion: boolean }[];
  descuento_centimos: number;
  total_centimos: number;
  pendiente_centimos: number;
  camarero: string | null;
}

/** Cómo queda la mesa en pantalla nada más tocar cada acción (el servidor confirma después). */
const CAMBIO_OPTIMISTA: Record<string, (d: Record<string, unknown>) => Partial<MesaSalon>> = {
  sentar: (d) => ({ ocupada: true, por_limpiar: false, comensales: Number(d.comensales) || 1, entrada_at: new Date().toISOString() }),
  atender: () => ({ aviso_camarero: false }),
  limpia: () => ({ por_limpiar: false }),
  liberar: () => ({ ocupada: false, por_limpiar: true, comensales: 0, entrada_at: null, aviso_camarero: false, pide_cuenta: false, importe_centimos: 0, pendiente_centimos: 0 }),
  bloquear: () => ({ bloqueada: true }),
  desbloquear: () => ({ bloqueada: false, bloqueo_motivo: null }),
  nota: (d) => ({ nota: typeof d.nota === "string" && d.nota.trim() ? d.nota : null }),
};

const etiquetaMesa = (m: Pick<MesaSalon, "nombre" | "numero">) => m.nombre ?? `Mesa ${m.numero}`;
const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const ahoraMinutos = () => {
  const [h, m] = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" }).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Motivos para dudar antes de asignar una reserva a una mesa (choques, sitio, estado). */
function conflictosReserva(r: ReservaDia, m: MesaSalon, mesas: MesaSalon[], reservas: ReservaDia[], anadir: boolean): string[] {
  const out: string[] = [];
  const otras = anadir ? r.mesas.map((x) => mesas.find((y) => y.id === x.id)?.capacidad ?? 0).reduce((a, b) => a + b, 0) : 0;
  if (otras + m.capacidad < r.personas) out.push(`${etiquetaMesa(m)} es para ${m.capacidad}${otras ? ` (${otras + m.capacidad} con las otras)` : ""} y la reserva es de ${r.personas}.`);
  if (m.bloqueada) out.push(`${etiquetaMesa(m)} está bloqueada${m.bloqueo_motivo ? `: ${m.bloqueo_motivo}` : ""}.`);
  const ini = aMinutos(r.hora);
  const fin = ini + (r.duracion_min || 90);
  for (const o of reservas) {
    if (o.id === r.id || !o.mesas.some((x) => x.id === m.id)) continue;
    const oi = aMinutos(o.hora);
    if (ini < oi + (o.duracion_min || 90) && oi < fin) out.push(`Choca con la reserva de ${o.nombre} a las ${o.hora} (${o.personas}p).`);
  }
  if (m.ocupada && ini - ahoraMinutos() < 60) {
    const min = minutosDesde(m.entrada_at);
    out.push(`${etiquetaMesa(m)} está ocupada ahora${min !== null ? ` (sentados hace ${min} min)` : ""}.`);
  }
  return out;
}

/**
 * Salón: plano 2D/3D con el estado de cada mesa, filtros por estado, «Mis mesas»,
 * reservas de hoy que se arrastran a su mesa, acciones rápidas sobre la mesa
 * tocada, panel completo (hoja inferior en móvil) y fin de servicio. Tiempo real
 * con Supabase Realtime + sondeo de respaldo.
 */
export function SalonBoard({
  inicial,
  rol,
  fiscal,
  yo,
  reservasIniciales,
  mesaInicial,
}: {
  inicial: SalonData;
  rol: Rol;
  fiscal: DatosFiscales;
  yo: string;
  reservasIniciales: ReservaDia[];
  /** Mesa a abrir al entrar (enlaces «Cobrar» desde Hoy: /admin/salon?mesa=…). */
  mesaInicial?: string;
}) {
  const [data, setData] = useState(inicial);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [vista, setVista] = useState<"2d" | "3d">("2d");
  const [editar, setEditar] = useState(false);
  const [filtro, setFiltro] = useState<EstadoMesa | null>(null);
  const [soloMias, setSoloMias] = useState(false);
  const [sel, setSel] = useState<string | null>(() => (mesaInicial && inicial.mesas.some((m) => m.id === mesaInicial) ? mesaInicial : null));
  const [rapido, setRapido] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [uniendo, setUniendo] = useState<string[] | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [asignando, setAsignando] = useState<ReservaDia | null>(null);
  const [arrastre, setArrastre] = useState<{ reserva: ReservaDia; x: number; y: number } | null>(null);
  const [finServicio, setFinServicio] = useState(false);
  const [cobro, setCobro] = useState<CuentaMesa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comensales, setComensales] = useState(2);
  const [nota, setNota] = useState("");
  const gestiona = rol === "admin" || rol === "encargado";
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      setSoloMias(localStorage.getItem(CLAVE_MIS_MESAS) === "1");
    } catch {
      // Sin almacenamiento local: se queda en «todas».
    }
  }, []);
  const cambiarSoloMias = (v: boolean) => {
    setSoloMias(v);
    try {
      localStorage.setItem(CLAVE_MIS_MESAS, v ? "1" : "0");
    } catch {
      // Preferencia solo de esta sesión.
    }
  };

  const recargar = useCallback(async () => {
    const r = await salonYReservas<SalonData, ReservaDia[]>(hoyEnMadrid());
    if (!r.ok) return;
    setData(r.data.salon);
    setReservas(r.data.reservas);
  }, []);

  /**
   * Ejecuta una RPC del salón y pinta el resultado en la misma petición. Con
   * `optimista`, la mesa cambia en pantalla al instante (antes de que responda el
   * servidor); si falla, se vuelve al estado real.
   */
  const ejecutar = useCallback(async (fn: `laofi_admin_${string}`, args: Record<string, unknown>, optimista?: { id: string; cambio: Partial<MesaSalon> }) => {
    setError(null);
    if (optimista) setData((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === optimista.id ? { ...m, ...optimista.cambio } : m)) }));
    const r = await accionSalon<SalonData, ReservaDia[]>(fn, args, hoyEnMadrid());
    if (!r.ok) {
      setError(r.error);
      if (optimista) void recargar();
      return false;
    }
    setData(r.data.salon);
    setReservas(r.data.reservas);
    return true;
  }, [recargar]);

  useEffect(() => {
    const baja = escucharLaofi(["mesas", "pedidos", "pedido_items", "avisos"], () => void recargar());
    const t = window.setInterval(() => void recargar(), 12_000);
    return () => {
      baja();
      window.clearInterval(t);
    };
  }, [recargar]);

  const mesa = useMemo(() => data.mesas.find((m) => m.id === sel) ?? null, [data, sel]);
  useEffect(() => {
    setNota(mesa?.nota ?? "");
    setComensales(Math.max(1, mesa?.comensales || Math.min(2, mesa?.capacidad ?? 2)));
  }, [mesa?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const misMesas = useMemo(() => new Set(data.mesas.filter((m) => m.camarero_id === yo).map((m) => m.id)), [data, yo]);
  const reservasHoy = useMemo(
    () => reservas.filter((r) => r.estado === "PENDIENTE" || r.estado === "CONFIRMADA").sort((a, b) => a.hora.localeCompare(b.hora)),
    [reservas],
  );

  const accion = async (a: string, datos: Record<string, unknown> = {}, id = mesa?.id) => {
    if (!id) return false;
    return ejecutar("laofi_admin_mesa", { p_mesa: id, p_accion: a, p_datos: datos }, { id, cambio: CAMBIO_OPTIMISTA[a]?.(datos) ?? {} });
  };

  const servir = async (id: string) => {
    await ejecutar("laofi_admin_servir_mesa", { p_mesa: id }, { id, cambio: { listos: 0 } });
  };

  const sentarReserva = async (r: ReservaDia) => {
    await ejecutar("laofi_admin_reserva_estado", { p_id: r.id, p_estado: "SENTADA" });
  };

  const asignarReserva = async (r: ReservaDia, mesaId: string) => {
    const m = data.mesas.find((x) => x.id === mesaId);
    if (!m) return;
    if (r.mesas.some((x) => x.id === mesaId)) return;
    // Si las mesas que ya tiene no bastan para el grupo, la nueva se añade; si bastan, la sustituye.
    const capActual = r.mesas.map((x) => data.mesas.find((y) => y.id === x.id)?.capacidad ?? 0).reduce((a, b) => a + b, 0);
    const anadir = r.mesas.length > 0 && capActual < r.personas;
    const dudas = conflictosReserva(r, m, data.mesas, reservas, anadir);
    if (dudas.length && !window.confirm(`${dudas.join("\n")}\n\n¿Asignar igualmente?`)) return;
    const mesas = anadir ? [...r.mesas.map((x) => x.id), mesaId] : [mesaId];
    await ejecutar("laofi_admin_guardar_reserva", { p: { id: r.id, mesas } });
  };

  // Arrastrar una reserva hasta su mesa (ratón o dedo): al soltar se busca la mesa bajo el puntero.
  const empezarArrastre = (r: ReservaDia, e: React.PointerEvent) => {
    if (vista !== "2d" || editar) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let movido = false;
    const mover = (ev: PointerEvent) => {
      if (!movido && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      movido = true;
      setAsignando(r);
      setArrastre({ reserva: r, x: ev.clientX, y: ev.clientY });
    };
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      setArrastre(null);
      if (!movido) {
        // Toque: modo «toca la mesa».
        setAsignando((a) => (a?.id === r.id ? null : r));
        return;
      }
      setAsignando(null);
      const id = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-mesa-id]")?.getAttribute("data-mesa-id");
      if (id) void asignarReserva(r, id);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  const seleccionar = async (id: string) => {
    if (asignando) {
      const r = asignando;
      setAsignando(null);
      await asignarReserva(r, id);
      return;
    }
    if (uniendo) {
      setUniendo((u) => (u!.includes(id) ? u!.filter((x) => x !== id) : [...u!, id]));
      return;
    }
    if (cambiando && mesa) {
      setCambiando(false);
      await accion("cambiar", { destino: id });
      setSel(id);
      return;
    }
    setSel(id);
    setRapido(true);
  };

  const cuenta = async (id = mesa?.id) => {
    if (!id) return null;
    const r = await rpcAdmin<CuentaMesa>("laofi_admin_cuenta_mesa", { p_mesa: id });
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    return r.data;
  };

  const imprimirCuenta = async (c: CuentaMesa) => {
    // TicketBAI (si está activo): emite o recupera la factura y añade su QR al ticket.
    const tbai = c.pedido_ids.length
      ? ((await fetch("/api/ticketbai/emitir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedidoIds: c.pedido_ids, mesaId: mesa?.id }),
        })
          .then((r) => r.json())
          .catch(() => null)) as { habilitado: boolean; identificativo: string | null; qrDataUrl: string | null; duplicado: boolean; error: string | null } | null)
      : null;
    if (tbai?.habilitado && tbai.error) setError(`TicketBAI: ${tbai.error}`);
    imprimirHTML(
      cuentaHTML({
        ticketBai: tbai?.identificativo && tbai.qrDataUrl ? { identificativo: tbai.identificativo, qrDataUrl: tbai.qrDataUrl, duplicado: tbai.duplicado } : null,
        etiqueta: c.mesa.nombre ?? `Mesa ${c.mesa.numero}`,
        camarero: c.camarero,
        fiscal,
        descuentoCentimos: c.descuento_centimos,
        pagadoCentimos: c.total_centimos - c.pendiente_centimos,
        lineas: c.lineas.map((l) => ({ cantidad: l.cantidad, nombre: l.nombre, precioUnitarioCentimos: l.precio_unitario_centimos, ivaPct: Number(l.iva_pct), invitacion: l.invitacion })),
      }),
    );
  };

  const abrirCobro = async () => {
    const c = await cuenta();
    if (c) setCobro(c);
  };

  // Contadores por estado (sirven de leyenda y de filtro). «Avisos» reúne a las
  // mesas que piden la cuenta y a las que llaman al camarero.
  const conteo = useMemo(() => {
    const c = Object.fromEntries(Object.keys(ESTADO_MESA).map((e) => [e, 0])) as Record<EstadoMesa, number>;
    for (const m of data.mesas) {
      if (m.aviso_camarero && !m.pide_cuenta) c.cuenta++;
      c[estadoMesa(m)]++;
    }
    return c;
  }, [data]);
  const comensalesSentados = useMemo(() => data.mesas.reduce((s, m) => s + (m.ocupada ? m.comensales : 0), 0), [data]);
  const platosListos = useMemo(() => data.mesas.reduce((s, m) => s + (m.listos ?? 0), 0), [data]);
  const reservaDeMesa = (m: MesaSalon) => reservasHoy.find((r) => r.mesas.some((x) => x.id === m.id) && (!m.reserva || r.hora === m.reserva.hora)) ?? null;

  const pos = useMemo(() => posicionesPorDefecto(data.zonas, data.mesas), [data]);
  const posSel = mesa ? pos.get(mesa.id) : undefined;
  const verRapido = vista === "2d" && !editar && rapido && mesa && posSel && !uniendo && !cambiando && !asignando;

  const panel = mesa ? (
    <PanelMesa
      mesa={mesa}
      yo={yo}
      comensales={comensales}
      setComensales={setComensales}
      nota={nota}
      setNota={setNota}
      uniendo={uniendo}
      error={error}
      reserva={reservaDeMesa(mesa)}
      onAccion={async (a, d) => {
        await accion(a, d);
      }}
      onServir={() => servir(mesa.id)}
      onSentarReserva={sentarReserva}
      onUnir={() => setUniendo(uniendo ? null : [])}
      onConfirmarUnion={async () => {
        await accion("unir", { mesas: uniendo });
        setUniendo(null);
      }}
      onCambiar={() => {
        setCambiando(true);
        setHoja(false);
      }}
      onCobrar={abrirCobro}
      onImprimir={async () => {
        const c = await cuenta();
        if (c) await imprimirCuenta(c);
      }}
    />
  ) : null;

  const importeEnSala = data.mesas.reduce((s, m) => s + (m.ocupada ? m.importe_centimos : 0), 0);
  const pendienteSala = data.mesas.reduce((s, m) => s + (m.ocupada ? m.pendiente_centimos : 0), 0);
  const activas = data.mesas.filter((m) => !m.bloqueada);
  const ocupacion = activas.length ? Math.round((activas.filter((m) => m.ocupada).length / activas.length) * 100) : 0;
  const plazas = activas.reduce((s, m) => s + m.capacidad, 0);
  const largas = data.mesas.filter((m) => m.ocupada && (minutosDesde(m.entrada_at) ?? 0) >= 90).length;
  const porZona = data.zonas
    .map((z) => {
      const ms = data.mesas.filter((m) => m.zona_id === z.id);
      return { id: z.id, nombre: z.nombre, total: ms.length, ocupadas: ms.filter((m) => m.ocupada).length };
    })
    .filter((z) => z.total > 0);

  const chip = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold transition-colors disabled:opacity-35";
  const herramienta =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold text-carbon/80 transition-colors hover:bg-carbon/[0.06] aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema dark:text-crema/80 dark:hover:bg-crema/10 dark:aria-pressed:bg-neon dark:aria-pressed:text-noche";

  return (
    // En escritorio/tablet horizontal todo el salón cabe en la pantalla: el plano
    // se escala al hueco que queda y el panel lateral desplaza solo su contenido.
    <div className="grid gap-3 lg:h-[calc(100dvh-7rem)] lg:min-h-[34rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
        {/* Barra de herramientas: vista, acciones y cifras en vivo, en una fila. */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-carbon/10 bg-white/80 p-1.5 shadow-card backdrop-blur dark:border-crema/10 dark:bg-noche-2/80">
          <div role="tablist" aria-label="Vista" className="flex rounded-lg bg-carbon/[0.05] p-0.5 dark:bg-crema/10">
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className="h-8 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-carbon/60 transition aria-selected:bg-white aria-selected:text-carbon aria-selected:shadow-sm dark:text-crema/60 dark:aria-selected:bg-noche dark:aria-selected:text-crema"
              >
                {v}
              </button>
            ))}
          </div>
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-carbon/10 dark:bg-crema/10" />
          <button
            type="button"
            aria-pressed={soloMias}
            title="Las mesas que has abierto tú (o en las que tomaste la primera comanda)"
            onClick={() => cambiarSoloMias(!soloMias)}
            className={herramienta}
          >
            <Icon name="users" className="h-4 w-4" />
            Mis mesas{misMesas.size ? ` · ${misMesas.size}` : ""}
          </button>
          {gestiona && vista === "2d" ? (
            <button type="button" aria-pressed={editar} onClick={() => setEditar((e) => !e)} className={herramienta}>
              <Icon name="move" className="h-4 w-4" />
              {editar ? "Terminar" : "Mover mesas"}
            </button>
          ) : null}
          <button type="button" onClick={() => setFinServicio(true)} className={herramienta}>
            <Icon name="check" className="h-4 w-4" />
            Fin de servicio
          </button>
          <dl className="ml-auto flex items-center gap-1 text-[0.8125rem]">
            <div className="flex items-baseline gap-1 rounded-lg px-2.5 py-1">
              <dt className="text-carbon-muted dark:text-crema/55">Ocupación</dt>
              <dd className="font-bold tabular-nums">{ocupacion}%</dd>
            </div>
            <div className="flex items-baseline gap-1 rounded-lg px-2.5 py-1">
              <dt className="text-carbon-muted dark:text-crema/55">Comensales</dt>
              <dd className="font-bold tabular-nums">{comensalesSentados}</dd>
            </div>
            {platosListos ? (
              <div className="flex items-baseline gap-1 rounded-lg bg-[#1F9D74] px-2.5 py-1 text-white">
                <dt>Listos</dt>
                <dd className="font-bold tabular-nums">{platosListos}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {/* Estados con contador: pulsar uno resalta esas mesas en el plano. Las reservas de hoy, en la misma fila. */}
        <div role="group" aria-label="Filtrar mesas por estado" className="no-scrollbar fade-x flex gap-1.5 overflow-x-auto">
          {(Object.entries(ESTADO_MESA) as [EstadoMesa, (typeof ESTADO_MESA)[EstadoMesa]][]).map(([clave, e]) => {
            const n = conteo[clave];
            const activo = filtro === clave;
            const urgente = clave === "cuenta" && n > 0;
            return (
              <button
                key={clave}
                type="button"
                aria-pressed={activo}
                disabled={n === 0 && !activo}
                onClick={() => setFiltro(activo ? null : clave)}
                className={`${chip} ${
                  activo ? "border-transparent text-crema shadow-card" : "border-carbon/10 bg-white text-carbon hover:border-carbon/25 dark:border-crema/10 dark:bg-noche-2 dark:text-crema"
                } ${urgente && !activo ? "border-neon-deep ring-2 ring-neon/50 motion-safe:animate-pulse" : ""}`}
                style={activo ? { background: e.color, color: clave === "limpiar" ? "#2B2722" : undefined } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: activo ? "#fff" : e.color }} />
                {clave === "cuenta" ? "Avisos" : e.label}
                <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
          {/* Reservas de hoy: arrastrar (o tocar y luego tocar la mesa) para asignarlas. */}
          {vista === "2d" && !editar && reservasHoy.length > 0 ? (
            <>
              <span aria-hidden="true" className="mx-1 h-9 w-px shrink-0 bg-carbon/10 dark:bg-crema/10" />
              <ul aria-label="Reservas de hoy: arrastra una a su mesa, o tócala y toca la mesa" className="flex gap-1.5">
                {reservasHoy.map((r) => {
                  const activa = asignando?.id === r.id;
                  return (
                    <li key={r.id} className="shrink-0">
                      <button
                        type="button"
                        aria-pressed={activa}
                        title="Arrastra a su mesa, o tócala y toca la mesa"
                        onPointerDown={(e) => empezarArrastre(r, e)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAsignando(activa ? null : r)}
                        className={`group flex h-9 touch-none items-center gap-2 rounded-full border border-dashed px-3 text-[0.8125rem] aria-pressed:border-solid aria-pressed:border-transparent aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema ${
                          r.mesas.length ? "border-carbon/25 bg-white dark:border-crema/20 dark:bg-noche-3" : "border-terracota/60 bg-terracota-soft/60 dark:bg-terracota/20"
                        }`}
                      >
                        <Icon name="calendar" className="h-3.5 w-3.5 opacity-60" />
                        <span className="font-bold tabular-nums">{r.hora}</span>
                        <span className="font-semibold">
                          {r.nombre} · {r.personas}p
                        </span>
                        <span className={`text-xs ${r.mesas.length ? "opacity-60" : "font-bold text-terracota group-aria-pressed:text-[#FFC9B5]"}`}>
                          {r.mesas.length ? `M${r.mesas.map((x) => x.numero).join("+")}` : "sin mesa"}
                          {r.estado === "PENDIENTE" ? " · por confirmar" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>

        {uniendo ? <Aviso tono="info">Toca las mesas que quieres unir a {mesa ? etiquetaMesa(mesa) : "la mesa"} y pulsa «Unir».</Aviso> : null}
        {cambiando ? <Aviso tono="info">Toca la mesa libre a la que pasa la cuenta.</Aviso> : null}
        {asignando && !arrastre ? (
          <Aviso tono="info">
            Toca la mesa para la reserva de {asignando.nombre} ({asignando.personas}p a las {asignando.hora}). Las resaltadas tienen sitio.{" "}
            <button type="button" className="underline" onClick={() => setAsignando(null)}>
              Cancelar
            </button>
          </Aviso>
        ) : null}
        {soloMias && !misMesas.size ? (
          <p className="text-xs font-semibold text-carbon-muted dark:text-crema/60">
            Aún no tienes mesas: serán tuyas las que abras al sentar a los clientes o al tomar su primera comanda.
          </p>
        ) : null}
        {error && !mesa ? <Aviso>{error}</Aviso> : null}

        {/* Hueco del plano: el lienzo (proporción fija 1000×620) se ajusta al alto y al ancho que quedan.
            En el móvil, a ancho de pantalla cada mesa medía ~14 px: el plano mantiene un ancho tocable y se desliza. */}
        <p className="-mb-1 text-xs text-carbon-muted dark:text-crema/55 sm:hidden">Desliza el plano para ver todo el salón.</p>
        <div className="grid min-h-0 flex-1 place-items-center max-sm:-mx-4 max-sm:block max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2 lg:[container-type:size]">
          <div className="relative aspect-[1000/620] w-full max-sm:w-[50rem] lg:w-[min(100cqw,calc(100cqh*1000/620))]">
            {vista === "2d" ? (
              <Plano2D
                zonas={data.zonas}
                mesas={data.mesas}
                seleccion={sel}
                multiSeleccion={uniendo ?? []}
                editar={editar}
                filtro={filtro}
                mias={soloMias ? misMesas : null}
                reservaPersonas={asignando?.personas ?? null}
                onSelect={(id) => void seleccionar(id)}
                onMover={async (id, p) => {
                  setData((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === id ? { ...m, pos_x: p.x, pos_y: p.y } : m)) }));
                  const r = await accionMesa(id, "mover", { pos_x: Math.round(p.x * 100) / 100, pos_y: Math.round(p.y * 100) / 100 });
                  if (!r.ok) setError(r.error);
                }}
              />
            ) : (
              <Plano3D zonas={data.zonas} mesas={data.mesas} seleccion={sel} onSelect={(id) => void seleccionar(id)} />
            )}

            {verRapido ? (
              <AccionesRapidas
                mesa={mesa}
                x={posSel.x}
                y={posSel.y}
                reserva={reservaDeMesa(mesa)}
                onCerrar={() => setRapido(false)}
                onMas={() => {
                  setRapido(false);
                  setHoja(true);
                  panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                onSentar={(n) => void accion("sentar", { comensales: n })}
                onSentarReserva={(r) => void sentarReserva(r)}
                onServir={() => void servir(mesa.id)}
                onCobrar={() => void abrirCobro()}
                onAtender={() => void accion("atender")}
                onLiberar={() => {
                  if (mesa.pendiente_centimos > 0 && !window.confirm(`Queda ${formatCentimos(mesa.pendiente_centimos)} pendiente. ¿Liberar igualmente?`)) return;
                  void accion("liberar", { forzar: mesa.pendiente_centimos > 0 });
                }}
                onLimpia={() => void accion("limpia")}
                onDesbloquear={() => void accion("desbloquear")}
              />
            ) : null}
          </div>
        </div>

        {data.mesas.length === 0 ? (
          <Aviso tono="info">
            Todavía no hay mesas. {gestiona ? <Link href="/admin/mesas" className="underline">Créalas en «Mesas y QR»</Link> : "Pide a un encargado que las cree."}
          </Aviso>
        ) : null}
      </div>

      {/* Panel de la mesa: lateral en pantallas grandes (resumen del servicio si no hay mesa tocada), hoja inferior en tablet y móvil. */}
      <aside ref={panelRef} className={`${card} hidden min-h-0 overflow-y-auto p-5 xl:block`} aria-live="polite">
        {panel ?? (
          <ResumenServicio
            ocupacion={ocupacion}
            plazas={plazas}
            comensales={comensalesSentados}
            enSala={importeEnSala}
            pendiente={pendienteSala}
            largas={largas}
            zonas={porZona}
            reservas={reservasHoy.slice(0, 4)}
          />
        )}
      </aside>
      {hoja && panel ? (
        <div className="xl:hidden">
          <Modal titulo={etiquetaMesa(mesa!)} onClose={() => setHoja(false)}>
            {/* El título ya lo pone la hoja: el panel no lo repite. */}
            {panel}
          </Modal>
        </div>
      ) : null}

      {arrastre ? (
        <div
          className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-[130%] rounded-xl bg-[theme(colors.marino.DEFAULT)] px-3 py-2 text-sm font-semibold text-crema shadow-lift"
          style={{ left: arrastre.x, top: arrastre.y }}
        >
          {arrastre.reserva.hora} · {arrastre.reserva.nombre} · {arrastre.reserva.personas}p
        </div>
      ) : null}

      {finServicio ? (
        <FinServicio
          data={data}
          reservas={reservasHoy}
          gestiona={gestiona}
          onClose={() => setFinServicio(false)}
          onIr={(id) => {
            setFinServicio(false);
            setSel(id);
            setRapido(true);
          }}
          onLimpiarTodas={async () => {
            const ok = await ejecutar("laofi_admin_limpiar_todas", {});
            return ok ? null : "No se han podido marcar las mesas como limpias.";
          }}
        />
      ) : null}

      {cobro && mesa ? (
        <CobroModal
          titulo={`Cobrar ${mesa.nombre ?? `mesa ${mesa.numero}`}`}
          pendiente={cobro.pendiente_centimos}
          onImprimir={() => void imprimirCuenta(cobro)}
          onClose={() => {
            setCobro(null);
            void recargar();
          }}
          onCobrar={async (metodo, importe) => {
            const r = await cobrar({ mesa_id: mesa.id, metodo, importe_centimos: importe });
            return r.ok ? { ok: true, pendiente: r.data.pendiente_centimos } : { ok: false, error: r.error };
          }}
        />
      ) : null}
    </div>
  );
}

/** Resumen del servicio en vivo (panel lateral sin mesa tocada): lo que un encargado mira de un vistazo. */
function ResumenServicio({
  ocupacion,
  plazas,
  comensales,
  enSala,
  pendiente,
  largas,
  zonas,
  reservas,
}: {
  ocupacion: number;
  plazas: number;
  comensales: number;
  enSala: number;
  pendiente: number;
  largas: number;
  zonas: { id: string; nombre: string; total: number; ocupadas: number }[];
  reservas: ReservaDia[];
}) {
  const kpi = "rounded-2xl bg-arena/60 p-3 dark:bg-noche-3";
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-carbon-muted dark:text-crema/55">Servicio en vivo</p>
        <div className="mt-2 flex items-end gap-3">
          <p className="font-display text-5xl leading-none tabular-nums">{ocupacion}%</p>
          <p className="pb-1 text-sm text-carbon-muted dark:text-crema/60">de mesas ocupadas</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-carbon/10 dark:bg-crema/10" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-oliva to-terracota transition-[width] duration-700 ease-out-expo" style={{ width: `${ocupacion}%` }} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className={kpi}>
          <dt className="text-xs text-carbon-muted dark:text-crema/60">Comensales</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">
            {comensales}
            <span className="text-sm font-medium opacity-50"> / {plazas}</span>
          </dd>
        </div>
        <div className={kpi}>
          <dt className="text-xs text-carbon-muted dark:text-crema/60">En mesa</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{formatCentimos(enSala)}</dd>
        </div>
        <div className={kpi}>
          <dt className="text-xs text-carbon-muted dark:text-crema/60">Por cobrar</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{formatCentimos(pendiente)}</dd>
        </div>
        <div className={`${kpi} ${largas ? "bg-[#E0A458]/25 dark:bg-[#E0A458]/20" : ""}`}>
          <dt className="text-xs text-carbon-muted dark:text-crema/60">+90 min</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{largas}</dd>
        </div>
      </dl>
      {zonas.length ? (
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-carbon-muted dark:text-crema/55">Por zona</p>
          <ul className="mt-2 grid gap-2.5">
            {zonas.map((z) => (
              <li key={z.id} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{z.nombre}</span>
                  <span className="tabular-nums text-carbon-muted dark:text-crema/60">
                    {z.ocupadas}/{z.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-carbon/10 dark:bg-crema/10" aria-hidden="true">
                  <div className="h-full rounded-full bg-terracota transition-[width] duration-700 ease-out-expo" style={{ width: `${(z.ocupadas / z.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {reservas.length ? (
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-carbon-muted dark:text-crema/55">Próximas reservas</p>
          <ul className="mt-2 grid gap-1.5">
            {reservas.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-carbon/10 px-3 py-2 text-sm dark:border-crema/10">
                <span className="font-display text-lg tabular-nums">{r.hora}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.nombre}</span>
                <span className="tabular-nums opacity-70">{r.personas}p</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-2xl border border-dashed border-carbon/15 p-3 text-xs leading-relaxed text-carbon-muted dark:border-crema/15 dark:text-crema/60">
        <p className="mb-1 font-semibold text-carbon dark:text-crema">Toca una mesa para ver sus acciones.</p>
        <span className="font-bold text-[#1F9D74]">●</span> platos listos · <b>€</b> pide la cuenta · <b>!</b> llama al camarero · <b>i</b> nota · borde naranja: +90 min · bajo la mesa,
        lo pendiente de cobro o la reserva próxima.
      </div>
    </div>
  );
}

/** Acciones rápidas junto a la mesa tocada: lo más habitual de cada estado, sin ir al panel. */
function AccionesRapidas({
  mesa,
  x,
  y,
  reserva,
  onCerrar,
  onMas,
  onSentar,
  onSentarReserva,
  onServir,
  onCobrar,
  onAtender,
  onLiberar,
  onLimpia,
  onDesbloquear,
}: {
  mesa: MesaSalon;
  x: number;
  y: number;
  reserva: ReservaDia | null;
  onCerrar: () => void;
  onMas: () => void;
  onSentar: (n: number) => void;
  onSentarReserva: (r: ReservaDia) => void;
  onServir: () => void;
  onCobrar: () => void;
  onAtender: () => void;
  onLiberar: () => void;
  onLimpia: () => void;
  onDesbloquear: () => void;
}) {
  const est = ESTADO_MESA[estadoMesa(mesa)];
  const min = minutosDesde(mesa.entrada_at);
  const arriba = y > 55;
  const btn = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold";
  const prim = `${btn} bg-[theme(colors.marino.DEFAULT)] text-crema`;
  const sec = `${btn} border border-carbon/15 bg-white text-carbon dark:border-crema/15 dark:bg-noche-3 dark:text-crema`;
  const tallas = [...new Set([2, 4, mesa.capacidad].filter((n) => n <= mesa.capacidad))];
  return (
    <div
      role="dialog"
      aria-label={`Acciones rápidas de ${etiquetaMesa(mesa)}`}
      // En móvil, barra fija abajo (junto al pulgar); desde sm, globo junto a la mesa.
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-crema p-3 text-carbon shadow-lift ring-1 ring-carbon/10 dark:bg-noche-2 dark:text-crema dark:ring-crema/10 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-[var(--x)] sm:top-[var(--y)] sm:z-30 sm:w-[20rem] sm:[transform:var(--t)]"
      style={
        {
          "--x": `${Math.min(Math.max(x, 18), 82)}%`,
          "--y": `${y}%`,
          "--t": arriba ? "translate(-50%, calc(-100% - 2.6rem))" : "translate(-50%, 2.6rem)",
        } as React.CSSProperties
      }
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl leading-none">{etiquetaMesa(mesa)}</p>
          <p className="mt-1 text-xs font-semibold opacity-70">
            {est.label}
            {mesa.ocupada ? ` · ${mesa.comensales}p${min !== null ? ` · ${min} min` : ""}` : ` · para ${mesa.capacidad}`}
            {mesa.camarero ? ` · ${mesa.camarero}` : ""}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="grid h-9 w-9 place-items-center rounded-full border border-carbon/15 dark:border-crema/15">
          <Icon name="close" className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mesa.aviso_camarero || mesa.pide_cuenta ? (
          <button type="button" onClick={onAtender} className={`${btn} col-span-2 bg-neon-deep text-crema`}>
            <Icon name="bell" className="h-4 w-4" />
            {mesa.pide_cuenta ? "Pide la cuenta" : "Llama"} · atendido
          </button>
        ) : null}
        {(mesa.listos ?? 0) > 0 ? (
          <button type="button" onClick={onServir} className={`${btn} col-span-2 bg-[#1F9D74] text-crema`}>
            <Icon name="check" className="h-4 w-4" />
            Servir {mesa.listos} {mesa.listos === 1 ? "plato listo" : "platos listos"}
          </button>
        ) : null}
        {mesa.bloqueada ? (
          <button type="button" onClick={onDesbloquear} className={`${sec} col-span-2`}>
            <Icon name="lock" className="h-4 w-4" />
            Desbloquear
          </button>
        ) : !mesa.ocupada ? (
          <>
            {reserva ? (
              <button type="button" onClick={() => onSentarReserva(reserva)} className={`${prim} col-span-2`}>
                <Icon name="calendar" className="h-4 w-4" />
                Sentar reserva · {reserva.nombre} ({reserva.personas}p)
              </button>
            ) : null}
            {tallas.map((n) => (
              <button key={n} type="button" onClick={() => onSentar(n)} className={reserva ? sec : prim}>
                <Icon name="users" className="h-4 w-4" />
                Sentar {n}
              </button>
            ))}
            {mesa.por_limpiar ? (
              <button type="button" onClick={onLimpia} className={sec}>
                <Icon name="check" className="h-4 w-4" />
                Limpia
              </button>
            ) : null}
          </>
        ) : (
          <>
            <Link href={`/admin/tpv?mesa=${mesa.id}`} className={prim}>
              <Icon name="plus" className="h-4 w-4" />
              Comanda
            </Link>
            <button type="button" onClick={onCobrar} disabled={mesa.pendiente_centimos <= 0} className={`${prim} disabled:opacity-40`}>
              <Icon name="cash" className="h-4 w-4" />
              Cobrar{mesa.pendiente_centimos > 0 ? ` ${formatCentimos(mesa.pendiente_centimos)}` : ""}
            </button>
            <button type="button" onClick={onLiberar} className={sec}>
              <Icon name="check" className="h-4 w-4" />
              Liberar
            </button>
          </>
        )}
        <button type="button" onClick={onMas} className={sec}>
          Más opciones
        </button>
      </div>
    </div>
  );
}

/** Fin de servicio: lo que queda abierto antes de cerrar caja, y limpieza en bloque. */
function FinServicio({
  data,
  reservas,
  gestiona,
  onClose,
  onIr,
  onLimpiarTodas,
}: {
  data: SalonData;
  reservas: ReservaDia[];
  gestiona: boolean;
  onClose: () => void;
  onIr: (id: string) => void;
  onLimpiarTodas: () => Promise<string | null>;
}) {
  const [msg, setMsg] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const abiertas = data.mesas.filter((m) => m.ocupada).sort((a, b) => b.pendiente_centimos - a.pendiente_centimos);
  const pendiente = abiertas.reduce((s, m) => s + m.pendiente_centimos, 0);
  const porLimpiar = data.mesas.filter((m) => m.por_limpiar && !m.ocupada);
  const conAviso = data.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta);
  const conListos = data.mesas.filter((m) => (m.listos ?? 0) > 0);
  const fila = "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-arena px-3 text-left text-sm dark:bg-noche-3";
  return (
    <Modal titulo="Fin de servicio" onClose={onClose} ancho="max-w-xl">
      <div className="grid gap-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-arena p-3 dark:bg-noche-3">
            <p className="font-display text-3xl">{abiertas.length}</p>
            <p className="text-xs opacity-70">mesas abiertas</p>
          </div>
          <div className="rounded-2xl bg-arena p-3 dark:bg-noche-3">
            <p className="font-display text-3xl">{formatCentimos(pendiente)}</p>
            <p className="text-xs opacity-70">pendiente de cobro</p>
          </div>
          <div className="rounded-2xl bg-arena p-3 dark:bg-noche-3">
            <p className="font-display text-3xl">{porLimpiar.length}</p>
            <p className="text-xs opacity-70">por limpiar</p>
          </div>
        </div>

        {abiertas.length ? (
          <section>
            <h3 className="mb-2 font-semibold">Mesas abiertas</h3>
            <ul className="grid gap-2">
              {abiertas.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onIr(m.id)} className={fila}>
                    <span className="font-semibold">
                      {etiquetaMesa(m)} · {m.comensales}p{minutosDesde(m.entrada_at) !== null ? ` · ${minutosDesde(m.entrada_at)} min` : ""}
                    </span>
                    <span className={`tabular-nums ${m.pendiente_centimos > 0 ? "font-bold text-terracota" : "opacity-70"}`}>
                      {m.pendiente_centimos > 0 ? `${formatCentimos(m.pendiente_centimos)} pendiente` : "cobrada"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Aviso tono="ok">No queda ninguna mesa abierta.</Aviso>
        )}

        {conAviso.length || conListos.length ? (
          <section>
            <h3 className="mb-2 font-semibold">Sin atender</h3>
            <ul className="grid gap-2">
              {conAviso.map((m) => (
                <li key={`a-${m.id}`}>
                  <button type="button" onClick={() => onIr(m.id)} className={fila}>
                    <span className="font-semibold">{etiquetaMesa(m)}</span>
                    <span>{m.pide_cuenta ? "pide la cuenta" : "llama al camarero"}</span>
                  </button>
                </li>
              ))}
              {conListos.map((m) => (
                <li key={`l-${m.id}`}>
                  <button type="button" onClick={() => onIr(m.id)} className={fila}>
                    <span className="font-semibold">{etiquetaMesa(m)}</span>
                    <span>{m.listos} platos listos sin servir</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {reservas.length ? (
          <section>
            <h3 className="mb-2 font-semibold">Reservas de hoy sin sentar</h3>
            <ul className="grid gap-1 text-sm">
              {reservas.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span>
                    {r.hora} · {r.nombre} · {r.personas}p
                  </span>
                  <span className="opacity-70">{r.mesas.length ? `Mesa ${r.mesas.map((x) => x.numero).join(" + ")}` : "sin mesa"}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={porLimpiar.length === 0}
            onClick={async () => {
              const e = await onLimpiarTodas();
              setMsg(e ? { tono: "error", texto: e } : { tono: "ok", texto: `${porLimpiar.length} mesas marcadas como limpias.` });
            }}
            className={botonPrimario}
          >
            <Icon name="check" className="h-4 w-4" />
            Marcar todas como limpias ({porLimpiar.length})
          </button>
          {gestiona ? (
            <Link href="/admin/caja" className={botonSecundario}>
              <Icon name="cash" className="h-4 w-4" />
              Ir a cierre de caja
            </Link>
          ) : null}
        </div>
        {msg ? <Aviso tono={msg.tono}>{msg.texto}</Aviso> : null}
      </div>
    </Modal>
  );
}

function PanelMesa({
  mesa,
  yo,
  comensales,
  setComensales,
  nota,
  setNota,
  uniendo,
  error,
  reserva,
  onAccion,
  onServir,
  onSentarReserva,
  onUnir,
  onConfirmarUnion,
  onCambiar,
  onCobrar,
  onImprimir,
}: {
  mesa: MesaSalon;
  yo: string;
  comensales: number;
  setComensales: (n: number) => void;
  nota: string;
  setNota: (s: string) => void;
  uniendo: string[] | null;
  error: string | null;
  reserva: ReservaDia | null;
  onAccion: (a: string, d?: Record<string, unknown>) => Promise<void>;
  onServir: () => Promise<void>;
  onSentarReserva: (r: ReservaDia) => Promise<void>;
  onUnir: () => void;
  onConfirmarUnion: () => Promise<void>;
  onCambiar: () => void;
  onCobrar: () => Promise<void>;
  onImprimir: () => Promise<void>;
}) {
  const est = ESTADO_MESA[estadoMesa(mesa)];
  const min = minutosDesde(mesa.entrada_at);
  const listos = mesa.listos ?? 0;
  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center justify-between gap-2 [[role=dialog]_&>h2]:sr-only">
          <h2 className="font-display text-3xl">{etiquetaMesa(mesa)}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${est.clase}`}>{est.label}</span>
        </div>
        <p className="mt-1 text-sm text-carbon-muted dark:text-crema/60">
          Capacidad {mesa.capacidad}
          {mesa.ocupada ? ` · ${mesa.comensales} comensales${min !== null ? ` · sentados hace ${min} min` : ""}` : ""}
          {mesa.sesion ? ` · QR: ${mesa.sesion.modo === "SEPARADO" ? `cada uno lo suyo (${mesa.sesion.participantes})` : "juntos"}` : ""}
        </p>
        <p className="mt-1 text-sm">
          <span className="text-carbon-muted dark:text-crema/60">Atiende:</span>{" "}
          <span className="font-semibold">{mesa.camarero_id === yo ? "tú" : (mesa.camarero ?? (mesa.ocupada && mesa.camarero_id ? "otro compañero" : "nadie todavía"))}</span>
        </p>
        {mesa.bloqueada && mesa.bloqueo_motivo ? <p className="mt-1 text-sm">Bloqueada: {mesa.bloqueo_motivo}</p> : null}
      </div>

      {mesa.ocupada ? (
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-arena p-3 text-sm dark:bg-noche-3">
          <div>
            <dt className="text-carbon-muted dark:text-crema/60">Consumido</dt>
            <dd className="font-display text-2xl">{formatCentimos(mesa.importe_centimos)}</dd>
          </div>
          <div>
            <dt className="text-carbon-muted dark:text-crema/60">Pendiente</dt>
            <dd className="font-display text-2xl">{formatCentimos(mesa.pendiente_centimos)}</dd>
          </div>
        </dl>
      ) : null}

      {mesa.aviso_camarero || mesa.pide_cuenta ? (
        <button type="button" onClick={() => void onAccion("atender")} className={`${botonPrimario} bg-neon-deep`}>
          <Icon name="bell" className="h-4 w-4" />
          {mesa.pide_cuenta ? "Pide la cuenta" : "Llama al camarero"} · marcar atendido
        </button>
      ) : null}

      {listos > 0 ? (
        <button type="button" onClick={() => void onServir()} className={`${botonPrimario} bg-[#1F9D74] hover:bg-[#1a8a66]`}>
          <Icon name="check" className="h-4 w-4" />
          Servir {listos} {listos === 1 ? "plato listo" : "platos listos"}
        </button>
      ) : null}

      {!mesa.ocupada && !mesa.bloqueada && reserva ? (
        <button type="button" onClick={() => void onSentarReserva(reserva)} className={botonPrimario}>
          <Icon name="calendar" className="h-4 w-4" />
          Sentar reserva · {reserva.hora} · {reserva.nombre} ({reserva.personas}p)
        </button>
      ) : null}

      {!mesa.ocupada && !mesa.bloqueada ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-carbon/15 dark:border-crema/15">
            <button type="button" onClick={() => setComensales(Math.max(1, comensales - 1))} className="grid h-11 w-11 place-items-center">
              <Icon name="minus" className="h-4 w-4" />
              <span className="sr-only">Menos comensales</span>
            </button>
            <span className="min-w-8 text-center font-semibold tabular-nums">{comensales}</span>
            <button type="button" onClick={() => setComensales(comensales + 1)} className="grid h-11 w-11 place-items-center">
              <Icon name="plus" className="h-4 w-4" />
              <span className="sr-only">Más comensales</span>
            </button>
          </div>
          <button type="button" onClick={() => void onAccion("sentar", { comensales })} className={`${reserva ? botonSecundario : botonPrimario} flex-1`}>
            <Icon name="users" className="h-4 w-4" />
            Sentar
          </button>
        </div>
      ) : null}

      {mesa.ocupada ? (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/tpv?mesa=${mesa.id}`} className={`${botonPrimario} col-span-2`}>
            <Icon name="plus" className="h-4 w-4" />
            Nueva comanda
          </Link>
          <button type="button" onClick={() => void onCobrar()} disabled={mesa.pendiente_centimos <= 0} className={botonPrimario}>
            <Icon name="cash" className="h-4 w-4" />
            Cobrar
          </button>
          <button type="button" onClick={() => void onImprimir()} className={botonSecundario}>
            <Icon name="print" className="h-4 w-4" />
            Cuenta
          </button>
          <button type="button" onClick={onCambiar} className={botonSecundario}>
            <Icon name="move" className="h-4 w-4" />
            Cambiar mesa
          </button>
          <button
            type="button"
            onClick={() => {
              if (mesa.pendiente_centimos > 0 && !window.confirm(`Queda ${formatCentimos(mesa.pendiente_centimos)} pendiente. ¿Liberar igualmente?`)) return;
              void onAccion("liberar", { forzar: mesa.pendiente_centimos > 0 });
            }}
            className={botonSecundario}
          >
            <Icon name="check" className="h-4 w-4" />
            Liberar
          </button>
        </div>
      ) : null}

      {mesa.por_limpiar ? (
        <button type="button" onClick={() => void onAccion("limpia")} className={botonSecundario}>
          <Icon name="check" className="h-4 w-4" />
          Mesa limpia
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onUnir} className={botonSecundario} aria-pressed={Boolean(uniendo)}>
          <Icon name="link" className="h-4 w-4" />
          {uniendo ? "Cancelar" : "Unir mesas"}
        </button>
        {uniendo ? (
          <button type="button" disabled={uniendo.length === 0} onClick={() => void onConfirmarUnion()} className={botonPrimario}>
            Unir ({uniendo.length})
          </button>
        ) : mesa.union_grupo_id ? (
          <button type="button" onClick={() => void onAccion("separar")} className={botonSecundario}>
            Separar
          </button>
        ) : null}
        {mesa.bloqueada ? (
          <button type="button" onClick={() => void onAccion("desbloquear")} className={botonSecundario}>
            <Icon name="lock" className="h-4 w-4" />
            Desbloquear
          </button>
        ) : !mesa.ocupada ? (
          <button
            type="button"
            onClick={() => {
              const motivo = window.prompt("Motivo del bloqueo (opcional)") ?? "";
              void onAccion("bloquear", { motivo });
            }}
            className={botonPeligro}
          >
            <Icon name="lock" className="h-4 w-4" />
            Bloquear
          </button>
        ) : null}
      </div>


      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold">Nota de la mesa</span>
        <div className="flex gap-2">
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 120))} className={input} placeholder="Trona, alergia, cumpleaños…" />
          <button type="button" onClick={() => void onAccion("nota", { nota })} className={botonSecundario}>
            Guardar
          </button>
        </div>
      </label>

      {error ? <Aviso>{error}</Aviso> : null}
    </div>
  );
}
