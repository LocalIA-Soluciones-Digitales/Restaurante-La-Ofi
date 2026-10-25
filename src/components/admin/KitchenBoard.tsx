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

/** Carriles del tablero: color propio para no confundir columnas de un vistazo. */
const COLUMNAS = [
  { k: "nuevos", titulo: "Nuevos", vacio: "Sin comandas nuevas", carril: "bg-[#1a1636]/70", punto: "bg-neon", contador: "bg-neon text-noche", boton: "bg-neon text-noche" },
  { k: "preparando", titulo: "En preparación", vacio: "Nada en el fuego", carril: "bg-[#2a2013]/60", punto: "bg-ratan", contador: "bg-ratan text-noche", boton: "bg-ratan text-noche" },
  { k: "listos", titulo: "Listos para servir", vacio: "Nada esperando en el pase", carril: "bg-[#0f2a22]/70", punto: "bg-[#1F9D74]", contador: "bg-[#1F9D74] text-white", boton: "bg-[#1F9D74] text-white" },
] as const;

/** Color de la cabecera de cada comanda según lo que lleva esperando. */
const URGENCIA = {
  baja: { cabecera: "bg-[#22324f]", anillo: "ring-crema/10" },
  media: { cabecera: "bg-[#8a5a17] text-white", anillo: "ring-[#E0A458]/60" },
  alta: { cabecera: "bg-terracota text-white", anillo: "ring-2 ring-terracota motion-safe:animate-pulse" },
} as const;

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
    // Optimista: la comanda cambia de columna al tocar; el servidor confirma después.
    setPedidos((lista) =>
      lista
        .map((x) => (x.id === p.id ? { ...x, items: x.items.map((i) => (i.estado !== "CANCELLED" && (!estacion || i.estacion === estacion) ? { ...i, estado } : i)) } : x))
        // Entregado desde «Todos» quita la comanda; desde una estación, solo sus líneas (el resto sigue en la otra).
        .filter((x) => !(x.id === p.id && estado === "DELIVERED" && !estacion)),
    );
    const r = await avanzarPedido<PedidoKds>(p.id, estado, estacion);
    if (!r.ok) {
      setError(r.error);
      return void recargar();
    }
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

  const enCola = [...columnas.nuevos, ...columnas.preparando];
  const esperaMedia = enCola.length ? Math.round(enCola.reduce((a, x) => a + minutos(x.p.created_at, ahora), 0) / enCola.length) : 0;
  const retrasados = enCola.filter((x) => minutos(x.p.created_at, ahora) >= 20).length;

  return (
    // Pantalla de servicio a todo el alto: cada columna es un carril con su color
    // y su propio desplazamiento; las comandas se distinguen por su cabecera.
    <div data-theme="dark" className="-m-4 flex min-h-[calc(100dvh-4rem)] flex-col bg-[#070d18] p-3 text-crema sm:-m-6 sm:p-4 lg:h-[calc(100dvh-4rem)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Estación" className="flex rounded-2xl bg-noche-2 p-1 ring-1 ring-crema/10 max-sm:w-full">
          {(["todos", "cocina", "barra"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v && !historial}
              onClick={() => {
                setHistorial(null);
                cambiarVista(v);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold text-crema/65 transition-colors aria-selected:bg-neon aria-selected:text-noche max-sm:flex-1 max-sm:px-2"
            >
              <Icon name={v === "cocina" ? "flame" : v === "barra" ? "wine" : "grid"} className="h-4 w-4" />
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
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-crema/80 ring-1 ring-crema/15 aria-pressed:bg-crema aria-pressed:text-noche"
          aria-pressed={Boolean(historial)}
        >
          <Icon name="clock" className="h-4 w-4" />
          Historial de hoy
        </button>
        {/* Carga de trabajo de un vistazo */}
        <dl className="hidden items-center gap-4 px-3 text-sm md:flex">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-crema/50">En cola</dt>
            <dd className="text-lg font-bold tabular-nums">{columnas.nuevos.length + columnas.preparando.length}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-crema/50">Espera media</dt>
            <dd className="text-lg font-bold tabular-nums">{esperaMedia}′</dd>
          </div>
          {retrasados ? (
            <div className="flex items-baseline gap-1.5 rounded-full bg-terracota px-3 py-0.5">
              <dt>+20 min</dt>
              <dd className="font-bold tabular-nums">{retrasados}</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setSonido(activarSonido())}
            aria-pressed={sonido}
            className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ${sonido ? "bg-oliva/30 text-oliva-soft ring-1 ring-oliva" : "bg-terracota text-crema"}`}
          >
            <Icon name="sound" className="h-4 w-4" />
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
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-crema/80 ring-1 ring-crema/15 aria-pressed:text-neon aria-pressed:ring-neon"
          >
            <Icon name="print" className="h-4 w-4" />
            Imprimir al aceptar
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="mb-3 rounded-xl bg-terracota px-4 py-3 text-sm font-semibold">{error}</p> : null}

      {historial ? (
        <ul className="grid content-start gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          {historial.length === 0 ? <li className="text-crema/60">Todavía no hay pedidos terminados hoy.</li> : null}
          {historial.map((p) => (
            <li key={p.id} className="rounded-2xl bg-noche-2 p-4 ring-1 ring-crema/10">
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
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
          {COLUMNAS.map((c) => (
            <section key={c.k} aria-label={c.titulo} className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl ${c.carril} ring-1 ring-crema/[0.07]`}>
              <h2 className="flex items-center gap-3 border-b border-crema/[0.08] px-4 py-3">
                <span className={`h-3 w-3 rounded-full ${c.punto}`} aria-hidden="true" />
                <span className="font-display text-2xl">{c.titulo}</span>
                <span className={`ml-auto grid h-8 min-w-8 place-items-center rounded-full px-2 text-base font-bold tabular-nums ${columnas[c.k].length ? c.contador : "bg-crema/10 text-crema/50"}`}>
                  {columnas[c.k].length}
                </span>
              </h2>
              <ul className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
                {columnas[c.k].length === 0 ? <li className="grid place-items-center py-12 text-sm text-crema/35">{c.vacio}</li> : null}
                {columnas[c.k].map(({ p, items, prog }) => {
                  const min = minutos(p.created_at, ahora);
                  const sig = SIGUIENTE[prog];
                  const mixtoEnTodos = vista === "todos" && new Set(items.map((i) => i.estacion)).size > 1 && prog !== "READY";
                  const urg = min >= 20 ? URGENCIA.alta : min >= 10 ? URGENCIA.media : URGENCIA.baja;
                  const estaciones = vista === "todos" ? (["cocina", "barra"] as const).filter((e) => items.some((i) => i.estacion === e)) : [vista];
                  return (
                    <li key={p.id} className={`overflow-hidden rounded-2xl bg-[#16233b] shadow-[0_10px_30px_-12px_rgb(0_0_0/0.7)] ring-1 ${urg.anillo} motion-safe:animate-fade-up`}>
                      {/* Cabecera de la comanda: número, destino y tiempo (color según espera). */}
                      <div className={`flex items-center gap-3 px-4 py-2.5 ${urg.cabecera}`}>
                        <p className="font-display text-3xl leading-none tabular-nums">#{p.numero_dia}</p>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-bold leading-tight">{etiquetaPedido(p)}</p>
                          <p className="truncate text-xs opacity-75">
                            {[p.mesa?.zona, p.mesa?.comensales ? `${p.mesa.comensales} pax` : null, p.participante, p.camarero].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="grid justify-items-end gap-0.5">
                          <span className="rounded-full bg-black/25 px-2.5 py-0.5 font-mono text-lg font-bold tabular-nums">{min}′</span>
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider opacity-70">{p.origen === "web" ? "QR / web" : "TPV"}</span>
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-3">
                        {p.recogida_en ? (
                          <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-marino px-2.5 py-1 text-sm font-semibold">
                            <Icon name="bag" className="h-4 w-4" />
                            Recoger a las {HORA.format(new Date(p.recogida_en))}
                          </p>
                        ) : null}
                        {p.notas ? <p className="mb-2 rounded-lg border-l-4 border-neon bg-neon/10 px-3 py-2 text-sm font-semibold text-neon-soft">{p.notas}</p> : null}
                        {estaciones.map((e) => (
                          <div key={e} className="mt-1 first:mt-0">
                            {estaciones.length > 1 ? (
                              <p className="mb-1 mt-2 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-crema/45">
                                <Icon name={e === "cocina" ? "flame" : "wine"} className="h-3.5 w-3.5" />
                                {e === "cocina" ? "Cocina" : "Barra"}
                                <span className="h-px flex-1 bg-crema/10" />
                              </p>
                            ) : null}
                            <ul className="grid gap-1.5">
                              {items
                                .filter((i) => i.estacion === e)
                                .map((i) => (
                                  <li key={i.id} className={RANGO[i.estado] > RANGO[prog] ? "opacity-45" : ""}>
                                    <p className="flex items-start gap-2.5 text-lg font-semibold leading-snug">
                                      <span className="mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-lg bg-crema px-1 text-base font-bold tabular-nums text-noche">{i.cantidad}</span>
                                      <span className={RANGO[i.estado] > RANGO[prog] ? "line-through decoration-2" : ""}>{i.nombre}</span>
                                    </p>
                                    {i.modificadores.length > 0 ? (
                                      <p className="ml-[2.375rem] text-sm font-medium text-ratan">{i.modificadores.map((m) => `${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ")}`).join(" · ")}</p>
                                    ) : null}
                                    {i.notas ? <p className="ml-[2.375rem] text-sm font-semibold italic text-neon-soft">↳ {i.notas}</p> : null}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                        <div className="mt-4 flex gap-2">
                          {mixtoEnTodos ? (
                            <p className="flex-1 self-center text-sm text-crema/55">Pedido mixto: márcalo desde Cocina y desde Barra.</p>
                          ) : sig ? (
                            <button type="button" onClick={() => void avanzar(p, sig.estado)} className={`min-h-14 flex-1 rounded-xl px-4 text-lg font-bold transition-transform active:scale-[0.98] ${c.boton}`}>
                              {sig.label}
                            </button>
                          ) : null}
                          {/* Según las líneas de esta vista, no el pedido entero: barra entrega sus bebidas aunque cocina siga con los platos. */}
                          {prog === "READY" ? (
                            <button type="button" onClick={() => void avanzar(p, "DELIVERED")} className="min-h-14 flex-1 rounded-xl bg-[#1F9D74] px-4 text-lg font-bold text-white transition-transform active:scale-[0.98]">
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
                            className="grid min-h-14 w-14 place-items-center rounded-xl bg-crema/[0.06] ring-1 ring-crema/10"
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
                            className="grid min-h-14 w-14 place-items-center rounded-xl bg-crema/[0.06] text-terracota-soft ring-1 ring-crema/10"
                          >
                            <Icon name="close" />
                            <span className="sr-only">Cancelar pedido #{p.numero_dia}</span>
                          </button>
                        </div>
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
