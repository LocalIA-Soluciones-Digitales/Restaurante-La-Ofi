"use client";

import { useMemo, useState } from "react";
import { Aviso, aCentimos, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { cerrarCaja, cierresCaja, estadoCaja } from "@/lib/admin/actions";
import { formatCentimos } from "@/lib/format";
import { imprimirHTML } from "@/lib/print/ticket";

export interface EstadoCaja {
  desde: string;
  efectivo_centimos: number;
  tarjeta_centimos: number;
  online_centimos: number;
  cobros: number;
  pedidos: number;
  ventas_centimos: number;
  descuentos_centimos: number;
  invitaciones_centimos: number;
  pendiente_cobro_centimos: number;
}

export interface Cierre {
  id: string;
  desde: string;
  cerrado_at: string;
  fondo_inicial_centimos: number;
  efectivo_esperado_centimos: number;
  efectivo_contado_centimos: number;
  tarjeta_centimos: number;
  online_centimos: number;
  descuadre_centimos: number;
  tickets: number;
  notas: string | null;
  cerrado_por_nombre: string | null;
}

const DENOMINACIONES = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const fecha = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });

/**
 * Cierre de caja (arqueo): efectivo esperado (fondo + cobros en efectivo desde el
 * último cierre) frente al contado, descuadre, tarjeta y online, historial e
 * impresión del arqueo en la térmica.
 */
export function CajaPanel({ inicial, historial: h0 }: { inicial: EstadoCaja; historial: Cierre[] }) {
  const [caja, setCaja] = useState(inicial);
  const [historial, setHistorial] = useState(h0);
  const [fondo, setFondo] = useState("");
  const [recuento, setRecuento] = useState<Record<number, string>>({});
  const [manual, setManual] = useState("");
  const [notas, setNotas] = useState("");
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const porRecuento = DENOMINACIONES.reduce((a, d) => a + d * (Number(recuento[d]) || 0), 0);
  const contado = manual.trim() ? (aCentimos(manual) ?? 0) : porRecuento;
  const fondoC = aCentimos(fondo) ?? 0;
  const esperado = fondoC + caja.efectivo_centimos;
  const descuadre = contado - esperado;
  const hayRecuento = manual.trim() !== "" || porRecuento > 0;

  const imprimir = (c: Cierre) =>
    imprimirHTML(`<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: 80mm auto; margin: 0 } body { font-family: "Courier New", monospace; width: 80mm; padding: 8px 6px; font-size: 13px }
      h1 { font-size: 18px; text-align: center; margin: 0 0 4px } td { padding: 2px 0 } .r { text-align: right } table { width: 100% }
    </style></head><body>
      <h1>LA OFI · ARQUEO</h1><div>${fecha(c.desde)} → ${fecha(c.cerrado_at)}</div><hr/>
      <table>
        <tr><td>Fondo inicial</td><td class="r">${formatCentimos(c.fondo_inicial_centimos)}</td></tr>
        <tr><td>Efectivo esperado</td><td class="r">${formatCentimos(c.efectivo_esperado_centimos)}</td></tr>
        <tr><td>Efectivo contado</td><td class="r">${formatCentimos(c.efectivo_contado_centimos)}</td></tr>
        <tr><td><b>Descuadre</b></td><td class="r"><b>${formatCentimos(c.descuadre_centimos)}</b></td></tr>
        <tr><td>Tarjeta</td><td class="r">${formatCentimos(c.tarjeta_centimos)}</td></tr>
        <tr><td>Online</td><td class="r">${formatCentimos(c.online_centimos)}</td></tr>
        <tr><td>Cobros</td><td class="r">${c.tickets}</td></tr>
      </table><hr/>${c.notas ? `<div>Notas: ${c.notas.replace(/</g, "&lt;")}</div>` : ""}<div>Cerró: ${(c.cerrado_por_nombre ?? "-").replace(/</g, "&lt;")}</div>
    </body></html>`);

  const cerrar = async () => {
    if (!window.confirm(`¿Cerrar la caja con un descuadre de ${formatCentimos(descuadre)}?`)) return;
    const r = await cerrarCaja<Cierre>(fondoC, contado, notas);
    if (!r.ok) return setAviso({ tono: "error", texto: r.error });
    const [e, hh] = await Promise.all([estadoCaja<EstadoCaja>(), cierresCaja<Cierre>()]);
    if (e.ok) setCaja(e.data);
    if (hh.ok) setHistorial(hh.data);
    setRecuento({});
    setManual("");
    setNotas("");
    setAviso({ tono: "ok", texto: "Caja cerrada." });
    imprimir(hh.ok ? (hh.data[0] ?? r.data) : r.data);
  };

  const filas = useMemo(
    () => [
      ["Ventas (pedidos no cancelados)", formatCentimos(caja.ventas_centimos)],
      ["Cobrado en efectivo", formatCentimos(caja.efectivo_centimos)],
      ["Cobrado con tarjeta", formatCentimos(caja.tarjeta_centimos)],
      ["Cobrado online (Stripe)", formatCentimos(caja.online_centimos)],
      ["Pendiente de cobro", formatCentimos(caja.pendiente_cobro_centimos)],
      ["Descuentos", formatCentimos(caja.descuentos_centimos)],
      ["Invitaciones", formatCentimos(caja.invitaciones_centimos)],
    ],
    [caja],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <div className="grid gap-4">
        <section className={`${card} p-5`}>
          <h2 className="font-display text-2xl">Desde {fecha(caja.desde)}</h2>
          <p className="text-sm opacity-70">
            {caja.pedidos} pedidos · {caja.cobros} cobros
          </p>
          <dl className="mt-3 grid gap-1.5 text-sm">
            {filas.map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-carbon/5 py-1 dark:border-crema/5">
                <dt>{k}</dt>
                <dd className="font-semibold tabular-nums">{val}</dd>
              </div>
            ))}
          </dl>
          {caja.pendiente_cobro_centimos > 0 ? <p className="mt-3 text-sm font-semibold text-terracota">Hay pedidos sin cobrar: revísalos antes de cerrar.</p> : null}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-display text-2xl">Recuento de efectivo</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {DENOMINACIONES.map((d) => (
              <label key={d} className="grid gap-1 text-xs">
                {d >= 500 ? `${d / 100} € (billete)` : formatCentimos(d)}
                <input value={recuento[d] ?? ""} onChange={(e) => setRecuento((r) => ({ ...r, [d]: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="0" className={`${input} text-right`} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm">
            Total contado: <b>{formatCentimos(porRecuento)}</b>
          </p>
          <label className="mt-3 grid gap-1 text-sm">
            <span className="font-semibold">…o escribe el total contado</span>
            <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} max-w-40 text-right`} />
          </label>
        </section>
      </div>

      <aside className={`${card} h-fit p-5 xl:sticky xl:top-20`}>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Fondo de caja al empezar €</span>
          <input value={fondo} onChange={(e) => setFondo(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} text-right`} />
        </label>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt>Efectivo esperado</dt>
            <dd className="tabular-nums">{formatCentimos(esperado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Efectivo contado</dt>
            <dd className="tabular-nums">{formatCentimos(contado)}</dd>
          </div>
          <div className="flex justify-between border-t border-carbon/10 pt-2 text-base font-semibold dark:border-crema/10">
            <dt>Descuadre</dt>
            <dd className={`tabular-nums ${descuadre === 0 ? "text-oliva" : "text-terracota"}`}>
              {descuadre > 0 ? "+" : ""}
              {formatCentimos(descuadre)}
            </dd>
          </div>
        </dl>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas del cierre" className={`${input} mt-4`} />
        {aviso ? (
          <div className="mt-3">
            <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
          </div>
        ) : null}
        <button type="button" onClick={() => void cerrar()} disabled={!hayRecuento} className={`${botonPrimario} mt-4 w-full min-h-14 text-base`}>
          <Icon name="lock" className="h-5 w-5" />
          Cerrar caja
        </button>
      </aside>

      <section className={`${card} p-5 xl:col-span-2`}>
        <h2 className="font-display text-2xl">Cierres anteriores</h2>
        {historial.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">Todavía no hay cierres.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                  <th className="pb-2">Cierre</th>
                  <th className="text-right">Esperado</th>
                  <th className="text-right">Contado</th>
                  <th className="text-right">Descuadre</th>
                  <th className="text-right">Tarjeta</th>
                  <th>Quién</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                {historial.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">{fecha(c.cerrado_at)}</td>
                    <td className="text-right tabular-nums">{formatCentimos(c.efectivo_esperado_centimos)}</td>
                    <td className="text-right tabular-nums">{formatCentimos(c.efectivo_contado_centimos)}</td>
                    <td className={`text-right tabular-nums font-semibold ${c.descuadre_centimos === 0 ? "text-oliva" : "text-terracota"}`}>{formatCentimos(c.descuadre_centimos)}</td>
                    <td className="text-right tabular-nums">{formatCentimos(c.tarjeta_centimos)}</td>
                    <td>{c.cerrado_por_nombre ?? "—"}</td>
                    <td className="text-right">
                      <button type="button" onClick={() => imprimir(c)} className={botonSecundario}>
                        <Icon name="print" className="h-4 w-4" />
                        <span className="sr-only">Imprimir arqueo</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
