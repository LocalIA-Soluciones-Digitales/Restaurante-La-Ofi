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

/** Pedidos de un paso agrupados por hora de recogida (ya vienen ordenados por ella). */
function porHora(lista: PedidoKds[]): { hora: string; recogida: string | null; pedidos: PedidoKds[] }[] {
  const out: { hora: string; recogida: string | null; pedidos: PedidoKds[] }[] = [];
  for (const p of lista) {
    const hora = p.recogida_en ? HORA.format(new Date(p.recogida_en)) : "Sin hora";
    const ultimo = out[out.length - 1];
    if (ultimo?.hora === hora) ultimo.pedidos.push(p);
    else out.push({ hora, recogida: p.recogida_en, pedidos: [p] });
  }
  return out;
}

/**
 * «Pedidos»: los pedidos para recoger del día, pensados para el encargado desde el
 * móvil (no para la pantalla de cocina). Un botón por paso: Aceptar → Está listo →
 * Cobrar y entregar. Tiempo real con sondeo de respaldo y aviso sonoro al entrar uno.
 * Para días con muchos pedidos: agrupados por hora, tarjetas compactas, en el móvil
 * un paso a la vista (pestañas) y en escritorio tres columnas con scroll propio.
 */
export function PedidosRecogida({ inicial }: { inicial: PedidoKds[] }) {
  const [pedidos, setPedidos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [sonido, setSonido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Paso>(() => (inicial.some((p) => p.estado === "RECEIVED") ? "nuevos" : inicial.some((p) => p.estado === "READY") ? "listos" : "preparando"));
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

  // En plena hora punta: aceptar de un toque todos los que han entrado.
  const [aceptando, setAceptando] = useState(false);
  const aceptarTodos = async () => {
    const lista = grupos.nuevos;
    if (!lista.length || !window.confirm(`¿Aceptar los ${lista.length} pedidos nuevos?`)) return;
    setAceptando(true);
    setError(null);
    for (const p of lista) {
      const r = await avanzarPedido<PedidoKds>(p.id, "ACCEPTED", null);
      if (!r.ok) {
        setError(r.error);
        break;
      }
    }
    setAceptando(false);
    void recargar();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Móvil: los pasos son pestañas (uno a la vista). Escritorio: resumen, las tres columnas se ven a la vez. */}
        <div role="tablist" aria-label="Paso" className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-arena p-1 lg:w-auto lg:flex lg:bg-transparent lg:p-0 dark:bg-noche-2 lg:dark:bg-transparent">
          {PASOS.map((s) => (
            <button
              key={s.k}
              type="button"
              role="tab"
              aria-selected={pestana === s.k}
              onClick={() => setPestana(s.k)}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-semibold aria-selected:bg-white aria-selected:shadow-card lg:min-h-11 lg:flex-row lg:gap-2 lg:bg-white lg:px-4 lg:text-sm lg:shadow-card lg:aria-selected:ring-0 dark:aria-selected:bg-noche-3 lg:dark:bg-noche-2"
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.punto}`} aria-hidden="true" />
                <span className="truncate">{s.k === "listos" ? <><span className="lg:hidden">Listos</span><span className="hidden lg:inline">{s.titulo}</span></> : s.titulo}</span>
              </span>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${grupos[s.k].length ? s.contador : "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/50"}`}>
                {grupos[s.k].length}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSonido(activarSonido())} aria-pressed={sonido} className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}>
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {pedidos.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name="bag" className="h-8 w-8 opacity-50" />
          No hay pedidos para recoger ahora mismo.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:h-[calc(100dvh-15rem)] lg:min-h-[28rem] lg:grid-cols-3">
          {PASOS.map((s) => (
            <section
              key={s.k}
              aria-label={s.titulo}
              className={`min-h-0 flex-col gap-3 lg:flex lg:h-full ${pestana === s.k ? "flex" : "hidden"}`}
            >
              <h2 className="hidden items-center gap-2 px-1 font-display text-xl lg:flex">
                <span className={`h-3 w-3 rounded-full ${s.punto}`} aria-hidden="true" />
                {s.titulo}
                <span className="ml-auto text-sm font-normal tabular-nums text-carbon-muted dark:text-crema/60">{grupos[s.k].length}</span>
              </h2>
              {s.k === "nuevos" && grupos.nuevos.length > 1 ? (
                <button type="button" disabled={aceptando} onClick={() => void aceptarTodos()} className={`${botonSecundario} w-full`}>
                  <Icon name="check" className="h-4 w-4" />
                  {aceptando ? "Aceptando…" : `Aceptar los ${grupos.nuevos.length}`}
                </button>
              ) : null}
              <div className="grid min-h-0 content-start gap-4 lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
                {grupos[s.k].length === 0 ? (
                  <p className="rounded-[1.25rem] border border-dashed border-carbon/15 px-4 py-8 text-center text-sm text-carbon-muted dark:border-crema/15 dark:text-crema/50">{s.vacio}</p>
                ) : null}
                {porHora(grupos[s.k]).map((h) => {
                  const c = cuando(h.recogida, ahora);
                  return (
                    <div key={h.hora} className="grid gap-2">
                      <p className="flex items-baseline gap-2 px-1">
                        <span className="font-display text-2xl tabular-nums">{h.hora}</span>
                        <span className={`text-xs font-semibold ${c.tarde && s.k !== "listos" ? "text-terracota" : "text-carbon-muted dark:text-crema/60"}`}>{c.texto}</span>
                        <span className="ml-auto text-xs text-carbon-muted dark:text-crema/60">{h.pedidos.length === 1 ? "1 pedido" : `${h.pedidos.length} pedidos`}</span>
                      </p>
                      {h.pedidos.map((p) => (
                        <Tarjeta
                          key={p.id}
                          p={p}
                          paso={s.k}
                          banda={s.banda}
                          ocupado={ocupado === p.id || aceptando}
                          onAvanzar={(e) => void avanzar(p, e)}
                          onCobrar={(m) => void cobrarYEntregar(p, m)}
                          onCancelar={() => cancelar(p)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Un pedido en poco sitio: quién, qué lleva, cuánto, si está pagado y el botón del paso. */
function Tarjeta({
  p,
  paso,
  banda,
  ocupado,
  onAvanzar,
  onCobrar,
  onCancelar,
}: {
  p: PedidoKds;
  paso: Paso;
  banda: string;
  ocupado: boolean;
  onAvanzar: (e: "ACCEPTED" | "READY" | "DELIVERED") => void;
  onCobrar: (m: "EFECTIVO" | "TARJETA") => void;
  onCancelar: () => void;
}) {
  const pagado = p.payment_status === "PAID";
  const productos = p.items.filter((i) => i.estado !== "CANCELLED");
  const accion = "min-h-11 rounded-xl px-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50";
  return (
    <article className={`${card} relative overflow-hidden py-3 pl-4 pr-3 motion-safe:animate-fade-up`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${banda}`} />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {p.nombre_cliente ?? "Sin nombre"}
            <span className="ml-1.5 text-xs font-normal text-carbon-muted dark:text-crema/60">#{p.numero_dia}</span>
          </p>
          <ul className="mt-1 grid gap-0.5 text-sm leading-snug">
            {productos.map((i) => (
              <li key={i.id}>
                <span className="font-semibold tabular-nums">{i.cantidad}×</span> {i.nombre}
                {i.modificadores.length > 0 ? (
                  <span className="text-carbon-muted dark:text-crema/60"> · {i.modificadores.map((m) => m.opciones.map((o) => o.nombre).join(", ")).join(" · ")}</span>
                ) : null}
                {i.notas ? <span className="italic text-terracota"> · {i.notas}</span> : null}
              </li>
            ))}
          </ul>
          {p.notas ? <p className="mt-1.5 rounded-lg bg-ratan/15 px-2 py-1 text-xs font-semibold">{p.notas}</p> : null}
        </div>
        <div className="grid shrink-0 justify-items-end gap-1">
          <span className="font-bold tabular-nums">{formatCentimos(p.total_centimos)}</span>
          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${pagado ? "bg-oliva text-crema" : "bg-ratan/25 text-carbon dark:text-crema"}`}>{pagado ? "Pagado" : "Paga al recoger"}</span>
          {p.telefono ? (
            <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className="mt-0.5 grid h-9 w-9 place-items-center rounded-full ring-1 ring-carbon/15 dark:ring-crema/15" aria-label={`Llamar a ${p.nombre_cliente ?? "cliente"}`}>
              <Icon name="phone" className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {paso === "nuevos" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("ACCEPTED")} className={`${accion} flex-1 bg-marino text-crema dark:bg-neon dark:text-noche`}>
            Aceptar
          </button>
        ) : paso === "preparando" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("READY")} className={`${accion} flex-1 bg-marino text-crema dark:bg-neon dark:text-noche`}>
            Está listo
          </button>
        ) : pagado ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("DELIVERED")} className={`${accion} flex-1 bg-marino text-crema dark:bg-neon dark:text-noche`}>
            Entregado
          </button>
        ) : (
          <>
            <span className="text-xs font-semibold text-carbon-muted dark:text-crema/60">Cobrar y entregar:</span>
            <button type="button" disabled={ocupado} onClick={() => onCobrar("EFECTIVO")} className={`${accion} flex-1 bg-marino text-crema dark:bg-neon dark:text-noche`}>
              Efectivo
            </button>
            <button type="button" disabled={ocupado} onClick={() => onCobrar("TARJETA")} className={`${accion} flex-1 bg-marino text-crema dark:bg-neon dark:text-noche`}>
              Tarjeta
            </button>
          </>
        )}
        <button type="button" disabled={ocupado} onClick={onCancelar} aria-label={`Cancelar el pedido #${p.numero_dia}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-terracota ring-1 ring-carbon/10 dark:ring-crema/10">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
