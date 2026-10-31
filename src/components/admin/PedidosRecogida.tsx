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
const PASOS = {
  nuevos: { titulo: "Nuevos", corto: "Nuevo", banda: "bg-terracota", texto: "text-terracota", contador: "bg-terracota text-crema" },
  preparando: { titulo: "Preparando", corto: "Preparando", banda: "bg-ratan", texto: "text-madera-oscura dark:text-ratan", contador: "bg-ratan text-noche" },
  listos: { titulo: "Listos", corto: "Listo", banda: "bg-oliva", texto: "text-oliva dark:text-oliva-soft", contador: "bg-oliva text-crema" },
} as const;

type Paso = keyof typeof PASOS;
type Filtro = "todos" | Paso;

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

/** Pedidos agrupados por hora de recogida (ya vienen ordenados por ella). */
function porHora(lista: PedidoKds[]): { hora: string; recogida: string | null; pedidos: PedidoKds[] }[] {
  const out: { hora: string; recogida: string | null; pedidos: PedidoKds[] }[] = [];
  for (const p of lista) {
    const hora = p.recogida_en ? HORA.format(new Date(p.recogida_en)) : "—";
    const ultimo = out[out.length - 1];
    if (ultimo?.hora === hora) ultimo.pedidos.push(p);
    else out.push({ hora, recogida: p.recogida_en, pedidos: [p] });
  }
  return out;
}

/** «2 menús, Ibérico, 2× Burrata»: lo que lleva, en una línea. */
function queLleva(p: PedidoKds): string {
  const productos = p.items.filter((i) => i.estado !== "CANCELLED");
  const menus = productos.filter((i) => i.nombre === "Menú del día").reduce((a, i) => a + i.cantidad, 0);
  const resto = productos.filter((i) => i.nombre !== "Menú del día").map((i) => (i.cantidad > 1 ? `${i.cantidad}× ${i.nombre}` : i.nombre));
  return [menus ? `${menus} ${menus === 1 ? "menú" : "menús"}` : null, ...resto].filter(Boolean).join(", ");
}

/**
 * «Pedidos»: los pedidos para recoger del día, pensados para el encargado desde el
 * móvil (no para la pantalla de cocina). Agenda por hora de recogida, una línea por
 * pedido con su paso (color) y su botón: Aceptar → Listo → Cobrar y entregar. Tocar
 * un pedido despliega lo que lleva entero. Tiempo real con sondeo de respaldo y
 * aviso sonoro al entrar uno.
 */
export function PedidosRecogida({ inicial }: { inicial: PedidoKds[] }) {
  const [pedidos, setPedidos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [sonido, setSonido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
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

  const cuenta = useMemo(() => {
    const c: Record<Paso, number> = { nuevos: 0, preparando: 0, listos: 0 };
    for (const p of pedidos) c[pasoDe(p)]++;
    return c;
  }, [pedidos]);
  const visibles = filtro === "todos" ? pedidos : pedidos.filter((p) => pasoDe(p) === filtro);

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
    const lista = pedidos.filter((p) => pasoDe(p) === "nuevos");
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

  const filtros: { k: Filtro; titulo: string; n: number; contador: string }[] = [
    { k: "todos", titulo: "Todos", n: pedidos.length, contador: "bg-carbon text-crema dark:bg-crema dark:text-noche" },
    ...(Object.keys(PASOS) as Paso[]).map((k) => ({ k, titulo: PASOS[k].titulo, n: cuenta[k], contador: PASOS[k].contador })),
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Paso" className="grid w-full grid-cols-4 gap-1 rounded-2xl bg-arena p-1 sm:flex sm:w-auto dark:bg-noche-2">
          {filtros.map((f) => (
            <button
              key={f.k}
              type="button"
              role="tab"
              aria-selected={filtro === f.k}
              onClick={() => setFiltro(f.k)}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-semibold aria-selected:bg-white aria-selected:shadow-card sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm dark:aria-selected:bg-noche-3"
            >
              {f.titulo}
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums ${f.n ? f.contador : "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/50"}`}>{f.n}</span>
            </button>
          ))}
        </div>
        {cuenta.nuevos > 1 && (filtro === "todos" || filtro === "nuevos") ? (
          <button type="button" disabled={aceptando} onClick={() => void aceptarTodos()} className={botonSecundario}>
            <Icon name="check" className="h-4 w-4" />
            {aceptando ? "Aceptando…" : `Aceptar los ${cuenta.nuevos} nuevos`}
          </button>
        ) : null}
        <button type="button" onClick={() => setSonido(activarSonido())} aria-pressed={sonido} className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}>
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {visibles.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name="bag" className="h-8 w-8 opacity-50" />
          {pedidos.length ? "Ningún pedido en este paso." : "No hay pedidos para recoger ahora mismo."}
        </p>
      ) : (
        <div className="grid gap-3">
          {porHora(visibles).map((h) => {
            const c = cuando(h.recogida, ahora);
            const pendientes = h.pedidos.some((p) => pasoDe(p) !== "listos");
            return (
              // Cada hora en una fila de la agenda: la hora a la izquierda y sus pedidos alineados a su lado.
              <div key={h.hora} className="grid grid-cols-[3.4rem_minmax(0,1fr)] gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-3">
                <div className="pt-2.5 text-right">
                  <p className="font-display text-xl leading-none tabular-nums sm:text-2xl">{h.hora}</p>
                  <p className={`mt-1 text-[0.65rem] font-semibold leading-tight ${c.tarde && pendientes ? "text-terracota" : "text-carbon-muted dark:text-crema/55"}`}>{c.texto}</p>
                </div>
                <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
                  {h.pedidos.map((p) => (
                    <li key={p.id}>
                      <FilaPedido
                        p={p}
                        abierto={abierto === p.id}
                        onAbrir={() => setAbierto(abierto === p.id ? null : p.id)}
                        ocupado={ocupado === p.id || aceptando}
                        onAvanzar={(e) => void avanzar(p, e)}
                        onCobrar={(m) => void cobrarYEntregar(p, m)}
                        onCancelar={() => cancelar(p)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Un pedido en una línea: su paso (color), quién y qué lleva, cuánto y el botón del
 * paso. Tocarlo despliega todo: los platos de cada menú, las notas, llamar y cancelar.
 */
function FilaPedido({
  p,
  abierto,
  onAbrir,
  ocupado,
  onAvanzar,
  onCobrar,
  onCancelar,
}: {
  p: PedidoKds;
  abierto: boolean;
  onAbrir: () => void;
  ocupado: boolean;
  onAvanzar: (e: "ACCEPTED" | "READY" | "DELIVERED") => void;
  onCobrar: (m: "EFECTIVO" | "TARJETA") => void;
  onCancelar: () => void;
}) {
  const paso = pasoDe(p);
  const s = PASOS[paso];
  const pagado = p.payment_status === "PAID";
  const [cobrando, setCobrando] = useState(false);
  const boton = "min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50";
  const lleno = `${boton} bg-marino text-crema dark:bg-neon dark:text-noche`;

  return (
    <div className="relative">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s.banda}`} />
      <div className="flex items-center gap-2.5 py-2.5 pl-3.5 pr-2.5">
        <button type="button" onClick={onAbrir} aria-expanded={abierto} className="min-w-0 flex-1 text-left">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{p.nombre_cliente ?? "Sin nombre"}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">{formatCentimos(p.total_centimos)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-carbon-muted dark:text-crema/60">
            <span className={`shrink-0 font-semibold ${s.texto}`}>{s.corto}</span>
            <span className="truncate">· {queLleva(p)}</span>
            {p.notas ? <Icon name="edit" className="h-3 w-3 shrink-0" /> : null}
          </span>
        </button>
        {paso === "nuevos" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("ACCEPTED")} className={lleno}>
            Aceptar
          </button>
        ) : paso === "preparando" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("READY")} className={`${boton} ring-1 ring-carbon/15 dark:ring-crema/20`}>
            Listo
          </button>
        ) : pagado ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("DELIVERED")} className={lleno}>
            Entregar
          </button>
        ) : (
          <button type="button" disabled={ocupado} onClick={() => setCobrando(!cobrando)} aria-expanded={cobrando} className={lleno}>
            Cobrar
          </button>
        )}
      </div>

      {cobrando && paso === "listos" && !pagado ? (
        <div className="flex items-center gap-2 px-3.5 pb-3">
          <span className="mr-auto text-sm font-semibold">Cobrar {formatCentimos(p.total_centimos)} y entregar:</span>
          <button type="button" disabled={ocupado} onClick={() => onCobrar("EFECTIVO")} className={lleno}>
            Efectivo
          </button>
          <button type="button" disabled={ocupado} onClick={() => onCobrar("TARJETA")} className={lleno}>
            Tarjeta
          </button>
        </div>
      ) : null}

      {abierto ? (
        <div className="grid gap-2 border-t border-carbon/[0.07] bg-arena/40 px-3.5 py-3 text-sm dark:border-crema/10 dark:bg-noche-3/50">
          <ul className="grid gap-1">
            {p.items
              .filter((i) => i.estado !== "CANCELLED")
              .map((i) => (
                <li key={i.id}>
                  <span className="font-semibold tabular-nums">{i.cantidad}×</span> {i.nombre}
                  {i.modificadores.length > 0 ? (
                    <span className="block pl-6 text-xs text-carbon-muted dark:text-crema/60">{i.modificadores.map((m) => m.opciones.map((o) => o.nombre).join(", ")).join(" · ")}</span>
                  ) : null}
                  {i.notas ? <span className="block pl-6 text-xs italic text-terracota">↳ {i.notas}</span> : null}
                </li>
              ))}
          </ul>
          {p.notas ? <p className="rounded-lg bg-ratan/20 px-2.5 py-1.5 font-semibold">{p.notas}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-carbon-muted dark:text-crema/60">
              #{p.numero_dia} · {pagado ? "pagado" : "paga al recoger"}
            </span>
            {p.telefono ? (
              <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className={`${botonSecundario} ml-auto min-h-9 px-3`}>
                <Icon name="phone" className="h-4 w-4" />
                Llamar
              </a>
            ) : null}
            <button type="button" disabled={ocupado} onClick={onCancelar} className={`${p.telefono ? "" : "ml-auto"} min-h-9 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15`}>
              Cancelar pedido
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
