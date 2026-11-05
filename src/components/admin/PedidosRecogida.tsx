"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HistorialDias, diaMadrid } from "@/components/admin/HistorialDias";
import { Modal } from "@/components/admin/Modal";
import { Campo, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { avanzarPedido, borrarPedido, cancelarPedido, cobrar, colaCocina, editarPedido, historialPedidos, pedidosProximos } from "@/lib/admin/actions";
import type { PedidoKds } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";
import { fechaMadrid, nombreDia } from "@/lib/pedidos/franjas";
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
type Filtro = "todos" | Paso | "historial";

/** null: ya cerrado (entregado o cancelado), solo sale en el historial. */
function pasoDe(p: PedidoKds): Paso | null {
  if (p.estado === "DELIVERED" || p.estado === "CANCELLED") return null;
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

/** Encargos de otros días, por día de recogida («Mañana», «Viernes, 6 de noviembre»). */
function porDiaRecogida(lista: PedidoKds[]): { fecha: string; nombre: string; pedidos: PedidoKds[] }[] {
  const out: { fecha: string; nombre: string; pedidos: PedidoKds[] }[] = [];
  for (const p of lista) {
    const iso = p.recogida_en ?? p.created_at;
    const fecha = fechaMadrid(iso);
    const ultimo = out[out.length - 1];
    if (ultimo?.fecha === fecha) ultimo.pedidos.push(p);
    else out.push({ fecha, nombre: nombreDia(iso), pedidos: [p] });
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
  // Encargados para otros días: aparte, y pasan a la lista de arriba el día de su recogida.
  const [proximos, setProximos] = useState<PedidoKds[]>([]);
  const proximosCargados = useRef(false);

  const recargar = useCallback(async () => {
    const [r, prox] = await Promise.all([colaCocina<PedidoKds>(), pedidosProximos<PedidoKds>()]);
    if (!r.ok) return setError(r.error);
    const lista = r.data.filter((p) => p.tipo === "RECOGIDA");
    // Sin la migración de «otros días» no hay próximos: la lista de hoy sigue igual.
    const otros = prox.ok ? prox.data : [];
    const nuevos = [...lista, ...(proximosCargados.current ? otros : [])].some((p) => !conocidos.current.has(p.id));
    if (nuevos) sonarAviso("nuevo");
    for (const p of [...lista, ...otros]) conocidos.current.add(p.id);
    proximosCargados.current = true;
    setError(null);
    setPedidos(lista);
    setProximos(otros);
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

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
    for (const p of pedidos) {
      const k = pasoDe(p);
      if (k) c[k]++;
    }
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
      const r = await avanzarPedido<PedidoKds>(p.id, estado, null, p.estado);
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

  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState<PedidoKds | null>(null);
  const borrar = (p: PedidoKds) => {
    const cobrado = p.payment_status === "PAID" ? " Si está cobrado, el cobro también se borra de la caja." : "";
    if (!window.confirm(`¿Eliminar para siempre el pedido #${p.numero_dia} de ${p.nombre_cliente ?? "este cliente"}?${cobrado} No se puede deshacer.`)) return;
    void hacer(p, async () => {
      const r = await borrarPedido(p.id);
      if (r.ok) {
        setAbierto(null);
        setVersion((v) => v + 1);
      }
      return r;
    });
  };

  const fila = (p: PedidoKds, encargo = false) => (
    <FilaPedido
      p={p}
      encargo={encargo}
      abierto={abierto === p.id}
      onAbrir={() => setAbierto(abierto === p.id ? null : p.id)}
      ocupado={ocupado === p.id || aceptando}
      onAvanzar={(e) => void avanzar(p, e)}
      onCobrar={(m) => void cobrarYEntregar(p, m)}
      onCancelar={() => cancelar(p)}
      onEditar={() => setEditando(p)}
      onBorrar={() => borrar(p)}
    />
  );

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
        <button type="button" onClick={() => setFiltro(filtro === "historial" ? "todos" : "historial")} aria-pressed={filtro === "historial"} className={botonSecundario}>
          <Icon name="clock" className="h-4 w-4" />
          Historial
        </button>
        <button type="button" onClick={() => setSonido(activarSonido())} aria-pressed={sonido} className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}>
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {filtro === "historial" ? (
        <HistorialDias
          cargar={historialPedidos<PedidoKds>}
          dia={(p) => diaMadrid(p.recogida_en ?? p.created_at)}
          cerrado={(p) => diaMadrid(p.updated_at)}
          csv={(p) => ({
            Día: diaMadrid(p.recogida_en ?? p.created_at),
            Hora: p.recogida_en ? new Date(p.recogida_en).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "",
            Número: p.numero_dia,
            Cliente: p.nombre_cliente ?? "",
            Teléfono: p.telefono ?? "",
            Email: p.email ?? "",
            Estado: p.estado === "CANCELLED" ? "Anulado" : "Entregado",
            Pago: p.payment_method ?? "",
            Platos: p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", "),
            Total: (p.total_centimos / 100).toFixed(2).replace(".", ","),
          })}
          importe={(p) => p.total_centimos}
          anulado={(p) => p.estado === "CANCELLED"}
          clave={(p) => p.id}
          fila={fila}
          version={version}
          icono="bag"
          nombres={["pedido", "pedidos"]}
          etiquetaHecho="Entregados"
        />
      ) : visibles.length === 0 ? (
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
                    <li key={p.id}>{fila(p)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {filtro !== "historial" && proximos.length > 0 ? (
        <section aria-labelledby="pedidos-proximos" className="mt-2 grid gap-3">
          <div>
            <h2 id="pedidos-proximos" className="font-display text-2xl">
              Encargados para otros días
            </h2>
            <p className="text-sm text-carbon-muted dark:text-crema/60">
              Confírmalos y al cliente le llega un email. El día de la recogida pasan a la lista de arriba (y a cocina) para prepararlos y entregarlos.
            </p>
          </div>
          {porDiaRecogida(proximos).map((d) => (
            <div key={d.fecha} className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-carbon-muted dark:text-crema/55">{d.nombre}</p>
              <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
                {d.pedidos.map((p) => (
                  <li key={p.id} className="grid grid-cols-[3.4rem_minmax(0,1fr)] items-start sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                    <span className="pt-3 text-center font-display text-lg tabular-nums">{p.recogida_en ? HORA.format(new Date(p.recogida_en)) : "—"}</span>
                    {fila(p, true)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {editando ? (
        <EditarPedido
          p={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            setVersion((v) => v + 1);
            void recargar();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Un pedido en una línea: su paso (color), quién y qué lleva, cuánto y el botón del
 * paso. Tocarlo despliega todo: los platos de cada menú, las notas, llamar y cancelar.
 */
function FilaPedido({
  p,
  encargo = false,
  abierto,
  onAbrir,
  ocupado,
  onAvanzar,
  onCobrar,
  onCancelar,
  onEditar,
  onBorrar,
}: {
  p: PedidoKds;
  /** Encargo de otro día: solo se confirma; Listo y Cobrar, el día de la recogida. */
  encargo?: boolean;
  abierto: boolean;
  onAbrir: () => void;
  ocupado: boolean;
  onAvanzar: (e: "ACCEPTED" | "READY" | "DELIVERED") => void;
  onCobrar: (m: "EFECTIVO" | "TARJETA") => void;
  onCancelar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const paso = pasoDe(p);
  const s = paso
    ? encargo
      ? p.estado === "RECEIVED"
        ? { ...PASOS.nuevos, corto: "Por confirmar" }
        : { ...PASOS.listos, corto: p.estado === "READY" ? "Listo" : "Confirmado" }
      : PASOS[paso]
    : { banda: "bg-carbon/20", texto: "", corto: `${p.estado === "CANCELLED" ? "Cancelado" : "Entregado"}${p.recogida_en ? ` · ${HORA.format(new Date(p.recogida_en))}` : ""}` };
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
        {encargo ? (
          p.estado === "RECEIVED" ? (
            <button type="button" disabled={ocupado} onClick={() => onAvanzar("ACCEPTED")} className={lleno}>
              Confirmar
            </button>
          ) : null
        ) : paso === "nuevos" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("ACCEPTED")} className={lleno}>
            Aceptar
          </button>
        ) : paso === "preparando" ? (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("READY")} className={`${boton} ring-1 ring-carbon/15 dark:ring-crema/20`}>
            Listo
          </button>
        ) : paso === null ? null : pagado ? (
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
              {encargo && !p.email ? " · sin email: confírmaselo por teléfono" : ""}
            </span>
            {p.email ? (
              <a href={`mailto:${p.email}`} className="truncate text-xs text-carbon-muted underline underline-offset-2 dark:text-crema/60">
                {p.email}
              </a>
            ) : null}
            {p.telefono ? (
              <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className={`${botonSecundario} ml-auto min-h-9 px-3`}>
                <Icon name="phone" className="h-4 w-4" />
                Llamar
              </a>
            ) : null}
            <button type="button" disabled={ocupado} onClick={onEditar} className={`${botonSecundario} ${p.telefono ? "" : "ml-auto"} min-h-9 px-3`}>
              <Icon name="edit" className="h-4 w-4" />
              Editar
            </button>
            {paso ? (
              <button type="button" disabled={ocupado} onClick={onCancelar} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15">
                Cancelar pedido
              </button>
            ) : null}
            <button type="button" disabled={ocupado} onClick={onBorrar} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15">
              <Icon name="trash" className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const FECHA_HORA = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const DESFASE = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "longOffset" });

/** «2026-11-04T13:30» en hora de Madrid, para el campo de fecha y hora. */
const aCampo = (iso: string) => FECHA_HORA.format(new Date(iso)).replace(" ", "T");

/** Del campo (hora de Madrid) a un instante con su desfase (+01:00 en invierno, +02:00 en verano). */
function deCampo(valor: string): string {
  const [d = "", h = ""] = valor.split("T");
  const [a = 1970, m = 1, dia = 1] = d.split("-").map(Number);
  const desfase = DESFASE.formatToParts(new Date(Date.UTC(a, m - 1, dia, 12))).find((x) => x.type === "timeZoneName")?.value.replace("GMT", "") || "+01:00";
  return `${d}T${h}:00${desfase}`;
}

/** Corregir un pedido: cliente, teléfono, hora de recogida y notas. Platos e importes no (puede estar cobrado). */
function EditarPedido({ p, onClose, onGuardado }: { p: PedidoKds; onClose: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(p.nombre_cliente ?? "");
  const [telefono, setTelefono] = useState(p.telefono ?? "");
  const [recogida, setRecogida] = useState(p.recogida_en ? aCampo(p.recogida_en) : "");
  const [notas, setNotas] = useState(p.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    const r = await editarPedido<PedidoKds>(p.id, { nombre_cliente: nombre, telefono, notas, recogida_en: recogida ? deCampo(recogida) : null });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    onGuardado();
  };

  return (
    <Modal titulo={`Pedido #${p.numero_dia}`} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          void guardar();
        }}
      >
        <Campo label="Nombre del cliente">
          <input className={input} value={nombre} onChange={(ev) => setNombre(ev.target.value)} maxLength={60} required />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono">
            <input className={input} type="tel" value={telefono} onChange={(ev) => setTelefono(ev.target.value)} />
          </Campo>
          <Campo label="Recogida">
            <input className={input} type="datetime-local" value={recogida} onChange={(ev) => setRecogida(ev.target.value)} />
          </Campo>
        </div>
        <Campo label="Notas">
          <textarea className={`${input} h-auto min-h-20 py-2`} value={notas} onChange={(ev) => setNotas(ev.target.value)} maxLength={300} />
        </Campo>
        <p className="text-xs text-carbon-muted dark:text-crema/60">
          Los platos y el importe ({formatCentimos(p.total_centimos)}) no se cambian aquí: el pedido puede estar ya cobrado o con ticket.
        </p>
        {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={botonPrimario}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
