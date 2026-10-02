"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CobroModal } from "@/components/admin/CobroModal";
import { Modal } from "@/components/admin/Modal";
import { Aviso, aCentimos, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { cobrar, crearComanda } from "@/lib/admin/actions";
import type { Rol } from "@/lib/admin/roles";
import { etiquetaPedido, type MesaSalon, type PedidoKds } from "@/lib/admin/types";
import { precioConModificadores, resumenModificadores, validarSeleccion, type SeleccionModificador } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import { vibrar } from "@/lib/haptics";
import { comandaHTML, cuentaHTML, imprimirHTML, type DatosFiscales } from "@/lib/print/ticket";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

interface Linea {
  key: string;
  /** Producto + opciones + precio manual: dos toques al mismo producto suman cantidad. */
  base: string;
  item: CartaItem;
  cantidad: number;
  seleccion: SeleccionModificador[];
  notas: string;
  invitacion: boolean;
  precioManual: number | null;
}

const unitario = (l: Linea) => (l.item.precioCentimos === null ? (l.precioManual ?? 0) : (precioConModificadores(l.item, l.seleccion) ?? 0));

/**
 * TPV táctil (portado de BarraPOS + ProductGridPicker + PedidoRapidoForm de
 * Palomita): rejilla de productos por categoría, comanda para barra o mesa con
 * modificadores, notas, invitaciones, descuento y precio manual para "según
 * mercado"; envío a cocina/barra y cobro inmediato en barra.
 */
export function BarraPOS({
  carta,
  mesas,
  mesaInicial,
  rol,
  fiscal,
}: {
  carta: CartaSeccion[];
  mesas: MesaSalon[];
  mesaInicial: string | null;
  rol: Rol;
  fiscal: DatosFiscales;
}) {
  const router = useRouter();
  const [cat, setCat] = useState(carta[0]?.id ?? "");
  const [busca, setBusca] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [destino, setDestino] = useState<string>(mesaInicial ?? "BARRA");
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [descuento, setDescuento] = useState("");
  const [eligiendo, setEligiendo] = useState<CartaItem | null>(null);
  const [cobro, setCobro] = useState<PedidoKds | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const puedeDescontar = rol === "admin" || rol === "encargado";

  const productos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q) return carta.flatMap((s) => s.items).filter((i) => i.nombre.toLowerCase().includes(q));
    return carta.find((s) => s.id === cat)?.items ?? [];
  }, [carta, cat, busca]);

  const subtotal = lineas.filter((l) => !l.invitacion).reduce((a, l) => a + unitario(l) * l.cantidad, 0);
  const desc = Math.min(aCentimos(descuento) ?? 0, subtotal);
  const total = subtotal - desc;
  const mesa = mesas.find((m) => m.id === destino) ?? null;

  const anadir = (item: CartaItem, seleccion: SeleccionModificador[] = [], precioManual: number | null = null) => {
    vibrar(10);
    const base = `${item.id}#${JSON.stringify(seleccion)}#${precioManual ?? ""}`;
    setLineas((ls) => {
      const ex = ls.find((l) => l.base === base && !l.notas && !l.invitacion);
      if (ex) return ls.map((l) => (l === ex ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...ls, { key: `${base}#${Date.now()}`, base, item, cantidad: 1, seleccion, notas: "", invitacion: false, precioManual }];
    });
  };

  const tocarProducto = (item: CartaItem) => {
    if (item.modificadores.length > 0 || item.precioCentimos === null) setEligiendo(item);
    else anadir(item);
  };

  const cambiar = (key: string, p: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const enviar = async (cobrarAhora: boolean) => {
    setEnviando(true);
    setAviso(null);
    const r = await crearComanda<PedidoKds>({
      tipo: mesa ? "MESA" : "BARRA",
      mesa_id: mesa?.id,
      nombre: nombre.trim() || undefined,
      notas: notas.trim() || undefined,
      descuento_centimos: puedeDescontar ? desc : 0,
      items: lineas.map((l) => ({
        producto_id: l.item.id,
        cantidad: l.cantidad,
        opciones: l.seleccion.flatMap((s) => s.opcionIds),
        notas: l.notas || undefined,
        invitacion: l.invitacion,
        precio_manual_centimos: l.item.precioCentimos === null ? l.precioManual : undefined,
      })),
    });
    setEnviando(false);
    if (!r.ok) return setAviso({ tono: "error", texto: r.error });
    setLineas([]);
    setNotas("");
    setDescuento("");
    vibrar([15, 40, 15]);
    setAviso({ tono: "ok", texto: `Comanda #${r.data.numero_dia} enviada a ${etiquetaPedido(r.data)}.` });
    if (cobrarAhora) setCobro(r.data);
    else if (mesa) router.refresh();
  };

  const imprimirComanda = (p: PedidoKds) => {
    for (const est of ["cocina", "barra"] as const) {
      const its = p.items.filter((i) => i.estacion === est);
      if (its.length === 0) continue;
      imprimirHTML(
        comandaHTML({
          destino: est === "cocina" ? "COCINA" : "BARRA",
          numero: p.numero_dia,
          etiqueta: etiquetaPedido(p),
          camarero: p.camarero,
          notas: p.notas,
          lineas: its.map((i) => ({
            cantidad: i.cantidad,
            nombre: i.nombre,
            modificadores: i.modificadores.map((m) => `${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ")}`).join(" · ") || null,
            notas: i.notas,
          })),
        }),
      );
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      {/* Productos */}
      <section aria-label="Productos" className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[12rem] flex-1">
            <span className="sr-only">Buscar producto</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className={`${input} pl-9`} />
          </label>
        </div>
        {!busca ? (
          <div role="tablist" aria-label="Categorías" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {carta.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={cat === s.id}
                onClick={() => setCat(s.id)}
                className="min-h-12 shrink-0 rounded-xl border border-carbon/15 bg-white px-4 text-sm font-semibold aria-selected:border-marino aria-selected:bg-marino aria-selected:text-crema dark:border-crema/15 dark:bg-noche-2 dark:aria-selected:bg-neon dark:aria-selected:text-noche"
              >
                {s.nombre}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {productos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => tocarProducto(p)}
                className={`${card} flex min-h-24 w-full flex-col justify-between p-3 text-left transition-transform active:scale-[0.97]`}
              >
                <span className="font-semibold leading-tight">{p.nombre}</span>
                <span className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-display text-lg text-marino dark:text-neon">{p.precioCentimos !== null ? formatCentimos(p.precioCentimos) : "S/M"}</span>
                  {p.modificadores.length > 0 ? <Icon name="settings" className="h-4 w-4 opacity-50" /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Comanda */}
      <section aria-label="Comanda" className={`${card} flex h-fit flex-col p-4 lg:sticky lg:top-20`}>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Para</span>
          <select value={destino} onChange={(e) => setDestino(e.target.value)} className={input}>
            <option value="BARRA">Barra (sin mesa)</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre ?? `Mesa ${m.numero}`}
                {m.ocupada ? ` · ${m.comensales}p` : " · libre"}
              </option>
            ))}
          </select>
        </label>
        {!mesa ? <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 60))} placeholder="Nombre (opcional)" className={`${input} mt-2`} /> : null}

        <ul className="mt-3 max-h-[40vh] divide-y divide-carbon/10 overflow-y-auto dark:divide-crema/10">
          {lineas.length === 0 ? <li className="py-6 text-center text-sm opacity-60">Toca productos para añadirlos.</li> : null}
          {lineas.map((l) => (
            <li key={l.key} className="py-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{l.item.nombre}</p>
                  {l.seleccion.length > 0 ? <p className="text-xs opacity-70">{resumenModificadores(l.item, l.seleccion)}</p> : null}
                  {l.invitacion ? <p className="text-xs font-semibold text-oliva">Invitación</p> : null}
                </div>
                <p className={`tabular-nums ${l.invitacion ? "line-through opacity-50" : ""}`}>{formatCentimos(unitario(l) * l.cantidad)}</p>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" onClick={() => (l.cantidad === 1 ? setLineas((ls) => ls.filter((x) => x !== l)) : cambiar(l.key, { cantidad: l.cantidad - 1 }))} className="grid h-10 w-10 place-items-center rounded-lg border border-carbon/15 dark:border-crema/15">
                  <Icon name={l.cantidad === 1 ? "trash" : "minus"} className="h-4 w-4" />
                  <span className="sr-only">Quitar</span>
                </button>
                <span className="min-w-7 text-center font-semibold tabular-nums">{l.cantidad}</span>
                <button type="button" onClick={() => cambiar(l.key, { cantidad: l.cantidad + 1 })} className="grid h-10 w-10 place-items-center rounded-lg border border-carbon/15 dark:border-crema/15">
                  <Icon name="plus" className="h-4 w-4" />
                  <span className="sr-only">Añadir</span>
                </button>
                <button type="button" aria-pressed={l.invitacion} onClick={() => cambiar(l.key, { invitacion: !l.invitacion })} className="ml-1 grid h-10 w-10 place-items-center rounded-lg border border-carbon/15 aria-pressed:bg-oliva aria-pressed:text-crema dark:border-crema/15">
                  <Icon name="gift" className="h-4 w-4" />
                  <span className="sr-only">Invitación</span>
                </button>
                <input
                  value={l.notas}
                  onChange={(e) => cambiar(l.key, { notas: e.target.value.slice(0, 140) })}
                  placeholder="Nota"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-carbon/15 bg-transparent px-2 text-sm dark:border-crema/15"
                />
              </div>
            </li>
          ))}
        </ul>

        <input value={notas} onChange={(e) => setNotas(e.target.value.slice(0, 300))} placeholder="Notas de la comanda" className={`${input} mt-3`} />
        {puedeDescontar ? (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold">Descuento €</span>
            <input value={descuento} onChange={(e) => setDescuento(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} max-w-28 text-right`} />
          </label>
        ) : null}

        <div className="mt-3 flex items-baseline justify-between border-t border-carbon/10 pt-3 dark:border-crema/10">
          <span className="opacity-70">Total</span>
          <span className="font-display text-3xl tabular-nums">{formatCentimos(total)}</span>
        </div>
        {aviso ? <div className="mt-2"><Aviso tono={aviso.tono === "ok" ? "ok" : "error"}>{aviso.texto}</Aviso></div> : null}
        <div className="mt-3 grid gap-2">
          <button type="button" disabled={lineas.length === 0 || enviando} onClick={() => void enviar(false)} className={`${botonPrimario} min-h-14 text-base`}>
            <Icon name="flame" className="h-5 w-5" />
            Enviar a cocina{mesa ? ` · ${mesa.nombre ?? `mesa ${mesa.numero}`}` : ""}
          </button>
          {!mesa ? (
            <button type="button" disabled={lineas.length === 0 || enviando} onClick={() => void enviar(true)} className={`${botonSecundario} min-h-12`}>
              <Icon name="cash" className="h-4 w-4" />
              Enviar y cobrar
            </button>
          ) : null}
        </div>
      </section>

      {eligiendo ? <ElegirOpciones item={eligiendo} onClose={() => setEligiendo(null)} onAnadir={(sel, precio) => (anadir(eligiendo, sel, precio), setEligiendo(null))} /> : null}

      {cobro ? (
        <CobroModal
          titulo={`Cobrar pedido #${cobro.numero_dia}`}
          pendiente={cobro.total_centimos}
          onClose={() => setCobro(null)}
          onImprimir={() => {
            imprimirComanda(cobro);
            imprimirHTML(
              cuentaHTML({
                etiqueta: etiquetaPedido(cobro),
                camarero: cobro.camarero,
                fiscal,
                lineas: cobro.items.map((i) => ({ cantidad: i.cantidad, nombre: i.nombre, precioUnitarioCentimos: i.precio_unitario_centimos, ivaPct: Number(i.iva_pct), invitacion: i.invitacion })),
              }),
            );
          }}
          onCobrar={async (metodo, importe) => {
            const r = await cobrar({ pedido_id: cobro.id, metodo, importe_centimos: importe });
            return r.ok ? { ok: true, pendiente: r.data.pendiente_centimos } : { ok: false, error: r.error };
          }}
        />
      ) : null}
    </div>
  );
}

function ElegirOpciones({ item, onClose, onAnadir }: { item: CartaItem; onClose: () => void; onAnadir: (s: SeleccionModificador[], precio: number | null) => void }) {
  const [sel, setSel] = useState<SeleccionModificador[]>([]);
  const [precio, setPrecio] = useState("");
  const errores = validarSeleccion(item, sel);
  const precioManual = item.precioCentimos === null ? aCentimos(precio) : null;
  const falta = errores.length > 0 || (item.precioCentimos === null && precioManual === null);

  return (
    <Modal titulo={item.nombre} onClose={onClose}>
      <div className="grid gap-4">
        {item.precioCentimos === null ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold">Precio (según mercado)</span>
            <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" autoFocus placeholder="0,00" className={`${input} text-lg`} />
          </label>
        ) : null}
        {item.modificadores.map((m) => {
          const elegidas = sel.find((s) => s.modificadorId === m.id)?.opcionIds ?? [];
          return (
            <fieldset key={m.id}>
              <legend className="text-sm font-semibold">
                {m.nombre}
                {m.obligatorio ? " *" : ""}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.opciones.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={elegidas.includes(o.id)}
                    onClick={() =>
                      setSel((prev) => {
                        const act = prev.find((s) => s.modificadorId === m.id)?.opcionIds ?? [];
                        const nuevas = m.tipo === "unico" ? [o.id] : act.includes(o.id) ? act.filter((x) => x !== o.id) : [...act, o.id];
                        return [...prev.filter((s) => s.modificadorId !== m.id), { modificadorId: m.id, opcionIds: nuevas }];
                      })
                    }
                    className="min-h-12 rounded-xl border border-carbon/15 px-4 font-semibold aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-crema dark:border-crema/15 dark:aria-pressed:bg-neon dark:aria-pressed:text-noche"
                  >
                    {o.nombre}
                    {o.precio_extra_centimos > 0 ? ` +${formatCentimos(o.precio_extra_centimos)}` : ""}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button type="button" disabled={falta} onClick={() => onAnadir(sel, precioManual)} className={`${botonPrimario} min-h-14 text-base`}>
          Añadir
        </button>
      </div>
    </Modal>
  );
}
