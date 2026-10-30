"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { botonPrimario, botonSecundario, card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { avanzarPedido, cancelarPedido, cobrar, colaCocina } from "@/lib/admin/actions";
import type { PedidoKds } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";
import { activarSonido, sonarAviso } from "@/lib/notify-sound";
import { escucharLaofi } from "@/lib/supabase/browser";

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Tres pasos, cada uno con su color: así se ve de lejos en qué está cada pedido. */
const PASOS = [
  { k: "nuevos", titulo: "Nuevos", vacio: "Ningún pedido nuevo", punto: "bg-terracota", banda: "bg-terracota", contador: "bg-terracota text-crema" },
  { k: "preparando", titulo: "Preparando", vacio: "Nada en marcha", punto: "bg-ratan", banda: "bg-ratan", contador: "bg-ratan text-noche" },
  { k: "listos", titulo: "Listos para recoger", vacio: "Nada esperando al cliente", punto: "bg-oliva", banda: "bg-oliva", contador: "bg-oliva text-crema" },
] as const;

type Paso = (typeof PASOS)[number]["k"];

function pasoDe(p: PedidoKds): Paso {
  if (p.estado === "RECEIVED") return "nuevos";
  if (p.estado === "READY") return "listos";
  return "preparando";
}

/** «en 25 min», «ahora», «hace 10 min» respecto a la hora de recogida. */
function cuando(recogida: string | null, ahora: number): { texto: string; tarde: boolean } {
  if (!recogida) return { texto: "", tarde: false };
  const min = Math.round((new Date(recogida).getTime() - ahora) / 60000);
  if (min > 0) return { texto: `en ${duracion(min)}`, tarde: false };
  if (min === 0) return { texto: "ahora", tarde: false };
  return { texto: `hace ${duracion(-min)}`, tarde: true };
}

function duracion(min: number): string {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

/**
 * «Pedidos»: los pedidos para recoger del día, pensados para el encargado desde el
 * móvil (no para la pantalla de cocina). Un botón por paso: Aceptar → Está listo →
 * Cobrar y entregar. Tiempo real con sondeo de respaldo y aviso sonoro al entrar uno.
 */
export function PedidosRecogida({ inicial }: { inicial: PedidoKds[] }) {
  const [pedidos, setPedidos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [sonido, setSonido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const conocidos = useRef(new Set(inicial.map((p) => p.id)));

  const recargar = useCallback(async () => {
    const r = await colaCocina<PedidoKds>();
    if (!r.ok) return setError(r.error);
    const lista = r.data.filter((p) => p.tipo === "RECOGIDA");
    if (lista.some((p) => !conocidos.current.has(p.id))) sonarAviso("nuevo");
    for (const p of lista) conocidos.current.add(p.id);
    setError(null);
    setPedidos(lista);
  }, []);

  useEffect(() => {
    const baja = escucharLaofi(["pedidos", "pedido_items"], () => void recargar());
    const t = window.setInterval(() => void recargar(), 15_000);
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => {
      baja();
      window.clearInterval(t);
      window.clearInterval(reloj);
    };
  }, [recargar]);

  const grupos = useMemo(() => {
    const g: Record<Paso, PedidoKds[]> = { nuevos: [], preparando: [], listos: [] };
    for (const p of pedidos) g[pasoDe(p)].push(p);
    return g;
  }, [pedidos]);

  const hacer = async (p: PedidoKds, accion: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setOcupado(p.id);
    setError(null);
    const r = await accion();
    setOcupado(null);
    if (!r.ok) setError(r.error);
    void recargar();
  };

  const avanzar = (p: PedidoKds, estado: "ACCEPTED" | "READY" | "DELIVERED") =>
    hacer(p, async () => {
      const r = await avanzarPedido<PedidoKds>(p.id, estado, null);
      if (r.ok && estado === "READY") sonarAviso("listo");
      return r;
    });

  const cobrarYEntregar = (p: PedidoKds, metodo: "EFECTIVO" | "TARJETA") =>
    hacer(p, async () => {
      const c = await cobrar({ pedido_id: p.id, metodo, importe_centimos: p.total_centimos });
      if (!c.ok) return c;
      return avanzarPedido<PedidoKds>(p.id, "DELIVERED", null);
    });

  const cancelar = (p: PedidoKds) => {
    if (!window.confirm(`¿Cancelar el pedido #${p.numero_dia} de ${p.nombre_cliente ?? "este cliente"}?`)) return;
    void hacer(p, () => cancelarPedido(p.id));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PASOS.map((s) => (
          <a key={s.k} href={`#${s.k}`} className={`${card} flex min-h-11 items-center gap-2 px-4 text-sm font-semibold`}>
            <span className={`h-2.5 w-2.5 rounded-full ${s.punto}`} aria-hidden="true" />
            {s.titulo}
            <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${grupos[s.k].length ? s.contador : "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/50"}`}>
              {grupos[s.k].length}
            </span>
          </a>
        ))}
        <button
          type="button"
          onClick={() => setSonido(activarSonido())}
          aria-pressed={sonido}
          className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}
        >
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {pedidos.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted lg:hidden dark:text-crema/60`}>
          <Icon name="bag" className="h-8 w-8 opacity-50" />
          No hay pedidos para recoger ahora mismo.
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {PASOS.map((s) => (
          // En el móvil las secciones vacías no ocupan sitio: lo que hay que hacer queda arriba.
          <section key={s.k} id={s.k} aria-label={s.titulo} className={`grid scroll-mt-20 gap-3 ${grupos[s.k].length ? "" : "max-lg:hidden"}`}>
            <h2 className="flex items-center gap-2 px-1 font-display text-xl">
              <span className={`h-3 w-3 rounded-full ${s.punto}`} aria-hidden="true" />
              {s.titulo}
            </h2>
            {grupos[s.k].length === 0 ? (
              <p className="rounded-[1.25rem] border border-dashed border-carbon/15 px-4 py-8 text-center text-sm text-carbon-muted dark:border-crema/15 dark:text-crema/50">{s.vacio}</p>
            ) : null}
            {grupos[s.k].map((p) => {
              const c = cuando(p.recogida_en, ahora);
              const pagado = p.payment_status === "PAID";
              const productos = p.items.filter((i) => i.estado !== "CANCELLED");
              const esperando = ocupado === p.id;
              return (
                <article key={p.id} className={`${card} overflow-hidden motion-safe:animate-fade-up`}>
                  <div className={`h-1.5 ${s.banda}`} aria-hidden="true" />
                  <div className="p-4">
                    {/* Hora de recogida bien grande: es lo que manda. */}
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-4xl leading-none tabular-nums">{p.recogida_en ? HORA.format(new Date(p.recogida_en)) : "—"}</p>
                        <p className={`mt-1 text-sm font-semibold ${c.tarde && s.k !== "listos" ? "text-terracota" : "text-carbon-muted dark:text-crema/60"}`}>
                          {c.texto ? `Recoge ${c.texto}` : "Sin hora"} · #{p.numero_dia}
                        </p>
                      </div>
                      {p.telefono ? (
                        <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className={`${botonSecundario} h-12 w-12 shrink-0 !px-0`} aria-label={`Llamar a ${p.nombre_cliente ?? "cliente"}`}>
                          <Icon name="phone" className="h-5 w-5" />
                        </a>
                      ) : null}
                    </div>

                    <p className="mt-3 truncate text-lg font-semibold">
                      {p.nombre_cliente ?? "Sin nombre"}
                      {p.grupo ? <span className="font-normal text-carbon-muted dark:text-crema/60"> · {p.grupo}</span> : null}
                    </p>

                    <ul className="mt-2 grid gap-1.5 border-t border-carbon/[0.08] pt-3 dark:border-crema/10">
                      {productos.map((i) => (
                        <li key={i.id} className="text-[0.95rem] leading-snug">
                          <span className="font-semibold tabular-nums">{i.cantidad}×</span> {i.nombre}
                          {i.modificadores.length > 0 ? (
                            <span className="block pl-6 text-sm text-carbon-muted dark:text-crema/60">
                              {i.modificadores.map((m) => m.opciones.map((o) => o.nombre).join(", ")).join(" · ")}
                            </span>
                          ) : null}
                          {i.notas ? <span className="block pl-6 text-sm italic text-terracota">↳ {i.notas}</span> : null}
                        </li>
                      ))}
                    </ul>
                    {p.notas ? <p className="mt-3 rounded-lg bg-ratan/15 px-3 py-2 text-sm font-semibold">{p.notas}</p> : null}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xl font-bold tabular-nums">{formatCentimos(p.total_centimos)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${pagado ? "bg-oliva text-crema" : "bg-ratan/25 text-carbon dark:text-crema"}`}>
                        {pagado ? "Pagado" : "Paga al recoger"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {s.k === "nuevos" ? (
                        <button type="button" disabled={esperando} onClick={() => void avanzar(p, "ACCEPTED")} className={`${botonPrimario} min-h-14 text-base`}>
                          <Icon name="check" className="h-5 w-5" />
                          Aceptar pedido
                        </button>
                      ) : s.k === "preparando" ? (
                        <button type="button" disabled={esperando} onClick={() => void avanzar(p, "READY")} className={`${botonPrimario} min-h-14 text-base`}>
                          <Icon name="bag" className="h-5 w-5" />
                          Está listo
                        </button>
                      ) : pagado ? (
                        <button type="button" disabled={esperando} onClick={() => void avanzar(p, "DELIVERED")} className={`${botonPrimario} min-h-14 text-base`}>
                          <Icon name="check" className="h-5 w-5" />
                          Entregado
                        </button>
                      ) : (
                        <>
                          <p className="text-center text-sm font-semibold">Cobrar {formatCentimos(p.total_centimos)} y entregar</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" disabled={esperando} onClick={() => void cobrarYEntregar(p, "EFECTIVO")} className={`${botonPrimario} min-h-14 text-base`}>
                              <Icon name="cash" className="h-5 w-5" />
                              Efectivo
                            </button>
                            <button type="button" disabled={esperando} onClick={() => void cobrarYEntregar(p, "TARJETA")} className={`${botonPrimario} min-h-14 text-base`}>
                              <Icon name="card" className="h-5 w-5" />
                              Tarjeta
                            </button>
                          </div>
                        </>
                      )}
                      <button type="button" disabled={esperando} onClick={() => cancelar(p)} className="min-h-10 text-sm font-semibold text-terracota underline-offset-4 hover:underline">
                        Cancelar pedido
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
