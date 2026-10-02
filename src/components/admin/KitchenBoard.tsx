"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { avanzarPedido, cancelarPedido, colaCocina } from "@/lib/admin/actions";
import { etiquetaPedido, type ItemKds, type PedidoKds } from "@/lib/admin/types";
import { comandaHTML, imprimirHTML } from "@/lib/print/ticket";
import { activarSonido, sonarAviso } from "@/lib/notify-sound";
import type { EstadoPedido } from "@/lib/restaurant/types";
import { escucharLaofi } from "@/lib/supabase/browser";

type Vista = "todos" | "cocina" | "barra";
const RANGO: Record<EstadoPedido, number> = { RECEIVED: 0, ACCEPTED: 1, PREPARING: 2, READY: 3, DELIVERED: 4, CANCELLED: 9 };
const SIGUIENTE: Partial<Record<EstadoPedido, { estado: EstadoPedido; label: string }>> = {
  RECEIVED: { estado: "ACCEPTED", label: "Aceptar" },
  ACCEPTED: { estado: "PREPARING", label: "Empezar" },
  PREPARING: { estado: "READY", label: "Listo" },
};

function itemsDe(p: PedidoKds, vista: Vista): ItemKds[] {
  const activos = p.items.filter((i) => i.estado !== "CANCELLED");
  return vista === "todos" ? activos : activos.filter((i) => i.estacion === vista);
}

/** Progreso de la estación = el estado más atrasado de sus líneas. */
function progreso(items: ItemKds[]): EstadoPedido {
  return items.reduce<EstadoPedido>((min, i) => (RANGO[i.estado] < RANGO[min] ? i.estado : min), "DELIVERED");
}

function minutos(desde: string, ahora: number) {
  return Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60000));
}

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

function lineasComanda(items: ItemKds[]) {
  return items.map((i) => ({
    cantidad: i.cantidad,
    nombre: i.nombre,
    modificadores: i.modificadores.map((m) => `${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ").toLowerCase()}`).join(" · ") || null,
    notas: i.notas,
  }));
}

/**
 * Pantalla de cocina y barra (portada de KitchenBoard de Palomita §4.5/§18):
 * cada estación acepta, prepara y marca listo SOLO sus líneas; el pedido no está
 * listo hasta que ambas terminan. Tiempo real (Supabase Realtime) con sondeo de
 * respaldo, aviso sonoro de pedidos nuevos e impresión automática opcional.
 */
export function KitchenBoard({ inicial }: { inicial: PedidoKds[] }) {
  const [pedidos, setPedidos] = useState(inicial);
  const [vista, setVista] = useState<Vista>("todos");
  const [historial, setHistorial] = useState<PedidoKds[] | null>(null);
  const [sonido, setSonido] = useState(false);
  const [autoImprimir, setAutoImprimir] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const conocidos = useRef(new Set(inicial.map((p) => p.id)));

  useEffect(() => {
    try {
      setAutoImprimir(window.localStorage.getItem("laofi:kds:imprimir") === "1");
      const v = window.localStorage.getItem("laofi:kds:vista") as Vista | null;
      if (v) setVista(v);
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const recargar = useCallback(async () => {
    const r = await colaCocina<PedidoKds>();
    if (!r.ok) return setError(r.error);
    setError(null);
    const nuevos = r.data.filter((p) => !conocidos.current.has(p.id));
    if (nuevos.length > 0) sonarAviso("nuevo");
    for (const p of r.data) conocidos.current.add(p.id);
    setPedidos(r.data);
  }, []);

  useEffect(() => {
    const baja = escucharLaofi(["pedidos", "pedido_items"], () => void recargar());
    const t = window.setInterval(() => void recargar(), 10_000);
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => {
      baja();
      window.clearInterval(t);
      window.clearInterval(reloj);
    };
  }, [recargar]);

  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      window.localStorage.setItem("laofi:kds:vista", v);
    } catch {
      /* sin almacenamiento */
    }
  };

  const imprimir = (p: PedidoKds, items: ItemKds[], estacion: "cocina" | "barra") =>
    imprimirHTML(
      comandaHTML({
        destino: estacion === "cocina" ? "COCINA" : "BARRA",
        numero: p.numero_dia,
        etiqueta: etiquetaPedido(p),
        zona: p.mesa?.zona,
        pax: p.mesa?.comensales,
        camarero: p.camarero ?? p.participante,
        recogidaEn: p.recogida_en ? HORA.format(new Date(p.recogida_en)) : null,
        notas: p.notas,
        lineas: lineasComanda(items),
      }),
    );

  const avanzar = async (p: PedidoKds, estado: EstadoPedido) => {
    const estacion = vista === "todos" ? null : vista;
    const r = await avanzarPedido<PedidoKds>(p.id, estado, estacion);
    if (!r.ok) return setError(r.error);
    if (estado === "ACCEPTED" && autoImprimir) {
      for (const e of estacion ? [estacion] : (["cocina", "barra"] as const)) {
        const its = itemsDe(p, e);
        if (its.length > 0) imprimir(p, its, e);
      }
    }
    if (estado === "READY") sonarAviso("listo");
    setPedidos((lista) => lista.map((x) => (x.id === p.id ? r.data : x)).filter((x) => x.estado !== "DELIVERED" && x.estado !== "CANCELLED"));
  };

  const columnas = useMemo(() => {
    const conItems = pedidos
      .map((p) => ({ p, items: itemsDe(p, vista) }))
      .filter((x) => x.items.length > 0)
      .map((x) => ({ ...x, prog: progreso(x.items) }));
    return {
      nuevos: conItems.filter((x) => x.prog === "RECEIVED"),
      preparando: conItems.filter((x) => x.prog === "ACCEPTED" || x.prog === "PREPARING"),
      listos: conItems.filter((x) => x.prog === "READY" || (x.prog === "DELIVERED" && x.p.estado === "READY")),
    };
  }, [pedidos, vista]);

  return (
    <div data-theme="dark" className="-m-4 min-h-[calc(100vh-4rem)] bg-noche p-4 text-crema sm:-m-6 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Estación" className="flex rounded-2xl bg-noche-2 p-1">
          {(["todos", "cocina", "barra"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v && !historial}
              onClick={() => {
                setHistorial(null);
                cambiarVista(v);
              }}
              className="min-h-12 rounded-xl px-5 text-base font-semibold capitalize text-crema/70 aria-selected:bg-neon aria-selected:text-noche"
            >
              {v === "todos" ? "Todos" : v === "cocina" ? "Cocina" : "Barra"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (historial) return setHistorial(null);
            const r = await colaCocina<PedidoKds>(true);
            if (r.ok) setHistorial(r.data);
          }}
          className="min-h-12 rounded-2xl border border-crema/15 px-4 text-sm font-semibold"
          aria-pressed={Boolean(historial)}
        >
          <Icon name="clock" className="mr-1 inline h-4 w-4" />
          Historial de hoy
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSonido(activarSonido())}
            aria-pressed={sonido}
            className={`min-h-12 rounded-2xl px-4 text-sm font-semibold ${sonido ? "bg-oliva text-crema" : "bg-terracota text-crema"}`}
          >
            <Icon name="sound" className="mr-1 inline h-4 w-4" />
            {sonido ? "Sonido activo" : "Activar sonido"}
          </button>
          <button
            type="button"
            aria-pressed={autoImprimir}
            onClick={() => {
              const n = !autoImprimir;
              setAutoImprimir(n);
              try {
                window.localStorage.setItem("laofi:kds:imprimir", n ? "1" : "0");
              } catch {
                /* sin almacenamiento */
              }
            }}
            className="min-h-12 rounded-2xl border border-crema/15 px-4 text-sm font-semibold aria-pressed:border-neon aria-pressed:text-neon"
          >
            <Icon name="print" className="mr-1 inline h-4 w-4" />
            Imprimir al aceptar
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mb-4 rounded-xl bg-terracota px-4 py-3 text-sm font-semibold">{error}</p> : null}

      {historial ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {historial.length === 0 ? <li className="text-crema/60">Todavía no hay pedidos terminados hoy.</li> : null}
          {historial.map((p) => (
            <li key={p.id} className="rounded-2xl bg-noche-2 p-4">
              <p className="flex justify-between font-semibold">
                <span>
                  #{p.numero_dia} · {etiquetaPedido(p)}
                </span>
                <span className={p.estado === "CANCELLED" ? "text-terracota-soft" : "text-oliva-soft"}>{p.estado === "CANCELLED" ? "Cancelado" : "Entregado"}</span>
              </p>
              <p className="mt-1 text-sm text-crema/60">
                {HORA.format(new Date(p.created_at))} → {HORA.format(new Date(p.updated_at))} · {p.items.reduce((a, i) => a + i.cantidad, 0)} productos
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["nuevos", "Nuevos", "text-neon"],
              ["preparando", "En preparación", "text-ratan"],
              ["listos", "Listos", "text-oliva-soft"],
            ] as const
          ).map(([k, titulo, color]) => (
            <section key={k} aria-label={titulo} className="min-w-0">
              <h2 className={`mb-3 flex items-center gap-2 font-display text-2xl ${color}`}>
                {titulo}
                <span className="rounded-full bg-noche-2 px-2.5 py-0.5 font-sans text-sm text-crema">{columnas[k].length}</span>
              </h2>
              <ul className="grid gap-3">
                {columnas[k].map(({ p, items, prog }) => {
                  const min = minutos(p.created_at, ahora);
                  const sig = SIGUIENTE[prog];
                  const mixtoEnTodos = vista === "todos" && new Set(items.map((i) => i.estacion)).size > 1 && prog !== "READY";
                  return (
                    <li key={p.id} className={`rounded-2xl border-l-8 bg-noche-2 p-4 ${min >= 20 ? "border-terracota" : min >= 10 ? "border-ratan" : "border-neon/70"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-3xl leading-none">#{p.numero_dia}</p>
                          <p className="mt-1 font-semibold">{etiquetaPedido(p)}</p>
                          <p className="text-sm text-crema/60">
                            {[p.mesa?.zona, p.participante, p.camarero, p.origen === "web" ? "QR/web" : "TPV"].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-lg tabular-nums ${min >= 20 ? "text-terracota-soft" : ""}`}>{min}′</p>
                          {p.recogida_en ? <p className="rounded-lg bg-marino px-2 py-0.5 text-sm font-semibold">Recoger {HORA.format(new Date(p.recogida_en))}</p> : null}
                        </div>
                      </div>
                      {p.notas ? <p className="mt-2 rounded-lg bg-noche-3 px-3 py-2 text-sm">Notas: {p.notas}</p> : null}
                      <ul className="mt-3 grid gap-1.5">
                        {items.map((i) => (
                          <li key={i.id} className={RANGO[i.estado] > RANGO[prog] ? "opacity-50" : ""}>
                            <p className="text-lg font-semibold">
                              <span className="mr-2 inline-grid h-7 min-w-7 place-items-center rounded-md bg-crema px-1 text-noche">{i.cantidad}</span>
                              {i.nombre}
                              {vista === "todos" ? <span className="ml-2 text-xs uppercase text-crema/50">{i.estacion}</span> : null}
                            </p>
                            {i.modificadores.length > 0 ? (
                              <p className="ml-9 text-sm text-ratan">{i.modificadores.map((m) => `${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ")}`).join(" · ")}</p>
                            ) : null}
                            {i.notas ? <p className="ml-9 text-sm italic text-neon-soft">↳ {i.notas}</p> : null}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {mixtoEnTodos ? (
                          <p className="text-sm text-crema/60">Pedido mixto: gestiónalo desde Cocina y Barra.</p>
                        ) : sig ? (
                          <button type="button" onClick={() => void avanzar(p, sig.estado)} className="min-h-14 flex-1 rounded-xl bg-neon px-4 text-lg font-bold text-noche active:scale-[0.98]">
                            {sig.label}
                          </button>
                        ) : null}
                        {p.estado === "READY" ? (
                          <button type="button" onClick={() => void avanzar(p, "DELIVERED")} className="min-h-14 flex-1 rounded-xl bg-oliva px-4 text-lg font-bold text-crema active:scale-[0.98]">
                            Entregado
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            for (const e of vista === "todos" ? (["cocina", "barra"] as const) : [vista]) {
                              const its = itemsDe(p, e);
                              if (its.length > 0) imprimir(p, its, e);
                            }
                          }}
                          className="grid min-h-14 w-14 place-items-center rounded-xl border border-crema/15"
                        >
                          <Icon name="print" />
                          <span className="sr-only">Imprimir comanda #{p.numero_dia}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`¿Cancelar el pedido #${p.numero_dia}?`)) return;
                            const r = await cancelarPedido(p.id);
                            if (!r.ok) return setError(r.error);
                            setPedidos((l) => l.filter((x) => x.id !== p.id));
                          }}
                          className="grid min-h-14 w-14 place-items-center rounded-xl border border-crema/15 text-terracota-soft"
                        >
                          <Icon name="close" />
                          <span className="sr-only">Cancelar pedido #{p.numero_dia}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
