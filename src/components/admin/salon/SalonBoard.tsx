"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CobroModal } from "@/components/admin/CobroModal";
import { Modal } from "@/components/admin/Modal";
import { Plano2D } from "@/components/admin/salon/Plano2D";
import { Aviso, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, cobrar, rpcAdmin, salon } from "@/lib/admin/actions";
import { minutosDesde, posicionesPorDefecto } from "@/lib/admin/plano";
import type { Rol } from "@/lib/admin/roles";
import { ESTADO_MESA, estadoMesa, type EstadoMesa, type MesaSalon, type ReservaDia, type SalonData } from "@/lib/admin/types";
import { formatCentimos, hoyEnMadrid } from "@/lib/format";
import { cuentaHTML, imprimirHTML, type DatosFiscales } from "@/lib/print/ticket";
import { escucharLaofi } from "@/lib/supabase/browser";

const Plano3D = dynamic(() => import("@/components/admin/salon/Plano3D"), {
  ssr: false,
  loading: () => <div className="grid h-[62vh] place-items-center rounded-[1.5rem] bg-noche text-crema/60">Cargando 3D…</div>,
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
}: {
  inicial: SalonData;
  rol: Rol;
  fiscal: DatosFiscales;
  yo: string;
  reservasIniciales: ReservaDia[];
}) {
  const [data, setData] = useState(inicial);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [vista, setVista] = useState<"2d" | "3d">("2d");
  const [editar, setEditar] = useState(false);
  const [filtro, setFiltro] = useState<EstadoMesa | null>(null);
  const [soloMias, setSoloMias] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
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
    const [r, rs] = await Promise.all([salon<SalonData>(), rpcAdmin<ReservaDia[]>("laofi_admin_reservas", { p_desde: hoyEnMadrid(), p_hasta: hoyEnMadrid() })]);
    if (r.ok) setData(r.data);
    if (rs.ok) setReservas(rs.data);
  }, []);

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
    setError(null);
    const r = await accionMesa(id, a, datos);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    await recargar();
    return true;
  };

  const servir = async (id: string) => {
    setError(null);
    const r = await rpcAdmin<number>("laofi_admin_servir_mesa", { p_mesa: id });
    if (!r.ok) return setError(r.error);
    await recargar();
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
    const res = await rpcAdmin<ReservaDia>("laofi_admin_guardar_reserva", { p: { id: r.id, mesas } });
    if (!res.ok) return setError(res.error);
    setError(null);
    await recargar();
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
      onSentarReserva={async (r) => {
        const res = await rpcAdmin("laofi_admin_reserva_estado", { p_id: r.id, p_estado: "SENTADA" });
        if (!res.ok) return setError(res.error);
        await recargar();
      }}
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Vista" className="flex rounded-xl bg-arena p-1 dark:bg-noche-2">
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className="min-h-10 rounded-lg px-4 text-sm font-semibold uppercase aria-selected:bg-[theme(colors.marino.DEFAULT)] aria-selected:text-crema dark:aria-selected:bg-neon dark:aria-selected:text-noche"
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={soloMias}
            title="Las mesas que has abierto tú (o en las que tomaste la primera comanda)"
            onClick={() => cambiarSoloMias(!soloMias)}
            className={`${botonSecundario} aria-pressed:border-transparent aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema`}
          >
            <Icon name="users" className="h-4 w-4" />
            Mis mesas{misMesas.size ? ` (${misMesas.size})` : ""}
          </button>
          {gestiona && vista === "2d" ? (
            <button type="button" aria-pressed={editar} onClick={() => setEditar((e) => !e)} className={`${botonSecundario} aria-pressed:border-terracota aria-pressed:text-terracota`}>
              <Icon name="move" className="h-4 w-4" />
              {editar ? "Terminar de mover" : "Mover mesas"}
            </button>
          ) : null}
          <button type="button" onClick={() => setFinServicio(true)} className={botonSecundario}>
            <Icon name="check" className="h-4 w-4" />
            Fin de servicio
          </button>
          <p className="ml-auto text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/60">
            {comensalesSentados} comensales{platosListos ? <span className="ml-2 rounded-full bg-[#1F9D74] px-2 py-0.5 text-crema">{platosListos} platos listos</span> : null}
          </p>
        </div>

        {/* Estados con contador: pulsar uno resalta esas mesas en el plano. */}
        <div role="group" aria-label="Filtrar mesas por estado" className="mb-3 flex flex-wrap gap-2">
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
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition disabled:opacity-40 ${
                  activo ? "border-transparent text-crema shadow-card" : "border-carbon/15 bg-white text-carbon dark:border-crema/15 dark:bg-noche-2 dark:text-crema"
                } ${urgente && !activo ? "border-neon-deep motion-safe:animate-pulse" : ""}`}
                style={activo ? { background: e.color, color: clave === "limpiar" ? "#2B2722" : undefined } : undefined}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: activo ? "#fff" : e.color }} />
                {clave === "cuenta" ? "Avisos" : e.label}
                <span className="tabular-nums opacity-80">{n}</span>
              </button>
            );
          })}
        </div>

        {/* Reservas de hoy: arrastrar (o tocar y luego tocar la mesa) para asignarlas. */}
        {vista === "2d" && !editar && reservasHoy.length > 0 ? (
          <section aria-label="Reservas de hoy" className="mb-3 rounded-2xl bg-arena/70 p-2.5 dark:bg-noche-2">
            <p className="mb-2 px-1 text-xs font-semibold text-carbon-muted dark:text-crema/60">
              Reservas de hoy · arrastra una a su mesa, o tócala y toca la mesa
            </p>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {reservasHoy.map((r) => {
                const activa = asignando?.id === r.id;
                return (
                  <li key={r.id} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={activa}
                      onPointerDown={(e) => empezarArrastre(r, e)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAsignando(activa ? null : r)}
                      className="group flex min-h-12 touch-none items-center gap-2 rounded-xl border border-carbon/15 bg-white px-3 text-left text-sm shadow-card aria-pressed:border-transparent aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema dark:border-crema/15 dark:bg-noche-3"
                    >
                      <span className="font-display text-lg tabular-nums">{r.hora}</span>
                      <span className="grid leading-tight">
                        <span className="font-semibold">
                          {r.nombre} · {r.personas}p
                        </span>
                        <span className={`text-xs ${r.mesas.length ? "opacity-70" : "font-semibold text-terracota group-aria-pressed:text-[#FFC9B5]"}`}>
                          {r.mesas.length ? `Mesa ${r.mesas.map((x) => x.numero).join(" + ")}` : "Sin mesa"}
                          {r.estado === "PENDIENTE" ? " · por confirmar" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

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
        {soloMias ? (
          <p className="mb-2 text-xs font-semibold text-carbon-muted dark:text-crema/60">
            {misMesas.size
              ? `Mostrando ${misMesas.size === 1 ? "tu mesa" : `tus ${misMesas.size} mesas`} (las que has abierto); el resto se ve atenuado.`
              : "Aún no tienes mesas: serán tuyas las que abras al sentar a los clientes o al tomar su primera comanda."}
          </p>
        ) : null}

        <div className="relative mt-2">
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
              onSentarReserva={async (r) => {
                const res = await rpcAdmin("laofi_admin_reserva_estado", { p_id: r.id, p_estado: "SENTADA" });
                if (!res.ok) return setError(res.error);
                await recargar();
              }}
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

        {vista === "2d" && !editar ? (
          <p className="mt-2 text-xs text-carbon-muted dark:text-crema/60">
            <span className="font-semibold text-[#1F9D74]">●</span> platos listos para servir · <span className="font-semibold">€</span> pide la cuenta · <span className="font-semibold">!</span> llama al
            camarero · <span className="font-semibold">i</span> nota · borde naranja: más de 90 min · debajo de la mesa, lo pendiente de cobro o la reserva próxima.
          </p>
        ) : null}
        {data.mesas.length === 0 ? (
          <Aviso tono="info">
            Todavía no hay mesas. {gestiona ? <Link href="/admin/mesas" className="underline">Créalas en «Mesas y QR»</Link> : "Pide a un encargado que las cree."}
          </Aviso>
        ) : null}
        {error && !mesa ? <Aviso>{error}</Aviso> : null}
      </div>

      {/* Panel de la mesa: lateral en pantallas grandes, hoja inferior en tablet y móvil. */}
      <aside ref={panelRef} className={`${card} hidden h-fit p-5 xl:sticky xl:top-20 xl:block`} aria-live="polite">
        {panel ?? <p className="text-sm text-carbon-muted dark:text-crema/60">Toca una mesa del plano para ver su estado y acciones.</p>}
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
            const r = await rpcAdmin<number>("laofi_admin_limpiar_todas");
            if (!r.ok) return r.error;
            await recargar();
            return null;
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
