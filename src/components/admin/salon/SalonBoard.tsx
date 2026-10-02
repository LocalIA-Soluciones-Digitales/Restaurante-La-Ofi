"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CobroModal } from "@/components/admin/CobroModal";
import { Plano2D } from "@/components/admin/salon/Plano2D";
import { Aviso, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, cobrar, rpcAdmin, salon } from "@/lib/admin/actions";
import { minutosDesde } from "@/lib/admin/plano";
import type { Rol } from "@/lib/admin/roles";
import { ESTADO_MESA, estadoMesa, type MesaSalon, type SalonData } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";
import { cuentaHTML, imprimirHTML, type DatosFiscales } from "@/lib/print/ticket";
import { escucharLaofi } from "@/lib/supabase/browser";

const Plano3D = dynamic(() => import("@/components/admin/salon/Plano3D"), {
  ssr: false,
  loading: () => <div className="grid h-[62vh] place-items-center rounded-[1.5rem] bg-noche text-crema/60">Cargando 3D…</div>,
});

interface CuentaMesa {
  mesa: { numero: string; nombre: string | null; comensales: number };
  pedido_ids: string[];
  lineas: { nombre: string; cantidad: number; precio_unitario_centimos: number; iva_pct: number; invitacion: boolean }[];
  descuento_centimos: number;
  total_centimos: number;
  pendiente_centimos: number;
  camarero: string | null;
}

/**
 * Salón (portado de SalonBoard de Palomita): plano 2D/3D con el estado de cada
 * mesa, panel de la mesa (sentar, comensales, notas, bloquear, unir/separar,
 * cambiar de mesa, cobrar, imprimir cuenta, liberar) y edición del plano
 * arrastrando mesas. Tiempo real con Supabase Realtime + sondeo de respaldo.
 */
export function SalonBoard({ inicial, rol, fiscal }: { inicial: SalonData; rol: Rol; fiscal: DatosFiscales }) {
  const [data, setData] = useState(inicial);
  const [vista, setVista] = useState<"2d" | "3d">("2d");
  const [editar, setEditar] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [uniendo, setUniendo] = useState<string[] | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [cobro, setCobro] = useState<CuentaMesa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comensales, setComensales] = useState(2);
  const [nota, setNota] = useState("");
  const gestiona = rol === "admin" || rol === "encargado";

  const recargar = useCallback(async () => {
    const r = await salon<SalonData>();
    if (r.ok) setData(r.data);
  }, []);

  useEffect(() => {
    const baja = escucharLaofi(["mesas", "pedidos", "avisos"], () => void recargar());
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

  const accion = async (a: string, datos: Record<string, unknown> = {}) => {
    if (!mesa) return;
    setError(null);
    const r = await accionMesa(mesa.id, a, datos);
    if (!r.ok) return setError(r.error);
    await recargar();
  };

  const seleccionar = async (id: string) => {
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
  };

  const cuenta = async () => {
    if (!mesa) return null;
    const r = await rpcAdmin<CuentaMesa>("laofi_admin_cuenta_mesa", { p_mesa: mesa.id });
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

  const resumen = useMemo(() => {
    const cuenta = (e: string) => data.mesas.filter((m) => estadoMesa(m) === e).length;
    return { libres: cuenta("libre"), ocupadas: data.mesas.filter((m) => m.ocupada).length, avisos: data.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta).length };
  }, [data]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Vista" className="flex rounded-xl bg-arena p-1 dark:bg-noche-2">
            {(["2d", "3d"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className="min-h-10 rounded-lg px-4 text-sm font-semibold uppercase aria-selected:bg-marino aria-selected:text-crema dark:aria-selected:bg-neon dark:aria-selected:text-noche">
                {v}
              </button>
            ))}
          </div>
          {gestiona && vista === "2d" ? (
            <button type="button" aria-pressed={editar} onClick={() => setEditar((e) => !e)} className={`${botonSecundario} aria-pressed:border-terracota aria-pressed:text-terracota`}>
              <Icon name="move" className="h-4 w-4" />
              {editar ? "Terminar de mover" : "Mover mesas"}
            </button>
          ) : null}
          <p className="ml-auto text-sm text-carbon-muted dark:text-crema/60">
            {resumen.libres} libres · {resumen.ocupadas} ocupadas{resumen.avisos ? ` · ${resumen.avisos} avisos` : ""}
          </p>
        </div>

        {uniendo ? <Aviso tono="info">Toca las mesas que quieres unir a {mesa?.nombre ?? `la mesa ${mesa?.numero}`} y pulsa «Unir».</Aviso> : null}
        {cambiando ? <Aviso tono="info">Toca la mesa libre a la que pasa la cuenta.</Aviso> : null}

        <div className="mt-2">
          {vista === "2d" ? (
            <Plano2D
              zonas={data.zonas}
              mesas={data.mesas}
              seleccion={sel}
              multiSeleccion={uniendo ?? []}
              editar={editar}
              onSelect={(id) => void seleccionar(id)}
              onMover={async (id, pos) => {
                setData((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === id ? { ...m, pos_x: pos.x, pos_y: pos.y } : m)) }));
                const r = await accionMesa(id, "mover", { pos_x: Math.round(pos.x * 100) / 100, pos_y: Math.round(pos.y * 100) / 100 });
                if (!r.ok) setError(r.error);
              }}
            />
          ) : (
            <Plano3D zonas={data.zonas} mesas={data.mesas} seleccion={sel} onSelect={(id) => void seleccionar(id)} />
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-3 text-xs" aria-label="Leyenda">
          {Object.values(ESTADO_MESA).map((e) => (
            <li key={e.label} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
              {e.label}
            </li>
          ))}
        </ul>
        {data.mesas.length === 0 ? (
          <Aviso tono="info">
            Todavía no hay mesas. {gestiona ? <Link href="/admin/mesas" className="underline">Créalas en «Mesas y QR»</Link> : "Pide a un encargado que las cree."}
          </Aviso>
        ) : null}
      </div>

      <aside className={`${card} h-fit p-5 xl:sticky xl:top-20`} aria-live="polite">
        {!mesa ? (
          <p className="text-sm text-carbon-muted dark:text-crema/60">Toca una mesa del plano para ver su estado y acciones.</p>
        ) : (
          <PanelMesa
            mesa={mesa}
            comensales={comensales}
            setComensales={setComensales}
            nota={nota}
            setNota={setNota}
            uniendo={uniendo}
            error={error}
            onAccion={accion}
            onUnir={() => setUniendo(uniendo ? null : [])}
            onConfirmarUnion={async () => {
              await accion("unir", { mesas: uniendo });
              setUniendo(null);
            }}
            onCambiar={() => setCambiando(true)}
            onCobrar={async () => {
              const c = await cuenta();
              if (c) setCobro(c);
            }}
            onImprimir={async () => {
              const c = await cuenta();
              if (c) await imprimirCuenta(c);
            }}
          />
        )}
      </aside>

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

function PanelMesa({
  mesa,
  comensales,
  setComensales,
  nota,
  setNota,
  uniendo,
  error,
  onAccion,
  onUnir,
  onConfirmarUnion,
  onCambiar,
  onCobrar,
  onImprimir,
}: {
  mesa: MesaSalon;
  comensales: number;
  setComensales: (n: number) => void;
  nota: string;
  setNota: (s: string) => void;
  uniendo: string[] | null;
  error: string | null;
  onAccion: (a: string, d?: Record<string, unknown>) => Promise<void>;
  onUnir: () => void;
  onConfirmarUnion: () => Promise<void>;
  onCambiar: () => void;
  onCobrar: () => Promise<void>;
  onImprimir: () => Promise<void>;
}) {
  const est = ESTADO_MESA[estadoMesa(mesa)];
  const min = minutosDesde(mesa.entrada_at);
  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-3xl">{mesa.nombre ?? `Mesa ${mesa.numero}`}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${est.clase}`}>{est.label}</span>
        </div>
        <p className="mt-1 text-sm text-carbon-muted dark:text-crema/60">
          Capacidad {mesa.capacidad}
          {mesa.ocupada ? ` · ${mesa.comensales} comensales${min !== null ? ` · sentados hace ${min} min` : ""}` : ""}
          {mesa.sesion ? ` · QR: ${mesa.sesion.modo === "SEPARADO" ? `cada uno lo suyo (${mesa.sesion.participantes})` : "juntos"}` : ""}
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
          <button type="button" onClick={() => void onAccion("sentar", { comensales })} className={`${botonPrimario} flex-1`}>
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
