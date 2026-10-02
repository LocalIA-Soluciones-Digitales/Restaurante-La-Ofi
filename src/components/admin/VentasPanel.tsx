"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart } from "@/components/admin/BarChart";
import { Aviso, Cifra, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { rpcAdmin } from "@/lib/admin/actions";
import { descargarCsv } from "@/lib/export-csv";
import { formatCentimos, formatearFechaCorta, hoyEnMadrid } from "@/lib/format";

export interface Ventas {
  resumen: {
    ventas_centimos: number;
    pedidos: number;
    ticket_medio_centimos: number;
    descuentos_centimos: number;
    invitaciones_centimos: number;
    cancelados: number;
    productos_vendidos: number;
  };
  por_dia: { fecha: string; ventas_centimos: number; pedidos: number }[];
  por_hora: { hora: number; ventas_centimos: number; pedidos: number }[];
  por_producto: { nombre: string; cantidad: number; importe_centimos: number }[];
  por_camarero: { nombre: string; pedidos: number; ventas_centimos: number }[];
  por_tipo: { tipo: string; pedidos: number; ventas_centimos: number }[];
  por_metodo: { metodo: string; importe_centimos: number }[];
}

const desplazar = (f: string, n: number) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const PRESETS = [
  { label: "Hoy", dias: 0 },
  { label: "7 días", dias: 6 },
  { label: "30 días", dias: 29 },
] as const;
const TIPO: Record<string, string> = { MESA: "Mesa", RECOGIDA: "Para recoger", BARRA: "Barra" };
const METODO: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", STRIPE: "Online (Stripe)" };
const euros = (c: number) => (c / 100).toFixed(2);

/**
 * Ventas e informes (portado de VentasCharts + InformeProfesional de Palomita):
 * resumen, ventas por día y por hora, productos, camareros, tipo de pedido y
 * método de cobro; exportación CSV e informe imprimible en A4.
 */
export function VentasPanel() {
  const [hasta, setHasta] = useState(hoyEnMadrid());
  const [desde, setDesde] = useState(desplazar(hoyEnMadrid(), -6));
  const [v, setV] = useState<Ventas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: desde, p_hasta: hasta });
    if (r.ok) setV(r.data);
    else setError(r.error);
  }, [desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porHora = v ? Array.from({ length: 24 }, (_, h) => v.por_hora.find((x) => x.hora === h) ?? { hora: h, ventas_centimos: 0, pedidos: 0 }).filter((x, i, a) => i >= 6 || a.slice(0, 6).some((y) => y.pedidos)) : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={hasta === hoyEnMadrid() && desde === desplazar(hoyEnMadrid(), -p.dias)}
            onClick={() => {
              setHasta(hoyEnMadrid());
              setDesde(desplazar(hoyEnMadrid(), -p.dias));
            }}
            className={`${botonSecundario} aria-pressed:border-marino aria-pressed:text-marino dark:aria-pressed:border-neon dark:aria-pressed:text-neon`}
          >
            {p.label}
          </button>
        ))}
        <label className="grid gap-1 text-xs">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className={`${input} w-40`} />
        </label>
        <label className="grid gap-1 text-xs">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={`${input} w-40`} />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={!v}
            onClick={() =>
              v &&
              descargarCsv(
                `la-ofi-productos-${desde}_${hasta}.csv`,
                v.por_producto.map((p) => ({ producto: p.nombre, unidades: p.cantidad, importe_eur: Number(euros(p.importe_centimos)) })),
              )
            }
            className={botonSecundario}
          >
            <Icon name="download" className="h-4 w-4" />
            CSV productos
          </button>
          <button
            type="button"
            disabled={!v}
            onClick={() =>
              v &&
              descargarCsv(
                `la-ofi-ventas-dia-${desde}_${hasta}.csv`,
                v.por_dia.map((d) => ({ fecha: d.fecha, pedidos: d.pedidos, ventas_eur: Number(euros(d.ventas_centimos)) })),
              )
            }
            className={botonSecundario}
          >
            <Icon name="download" className="h-4 w-4" />
            CSV por día
          </button>
          <button type="button" onClick={() => window.print()} className={botonSecundario}>
            <Icon name="print" className="h-4 w-4" />
            Informe PDF
          </button>
        </div>
      </div>
      {error ? <Aviso>{error}</Aviso> : null}

      {v ? (
        <>
          <div className="hidden print:block">
            <p className="font-display text-3xl">Restaurante La Ofi · Informe de ventas</p>
            <p className="text-sm">
              Del {desde} al {hasta} · generado el {new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra label="Ventas" valor={formatCentimos(v.resumen.ventas_centimos)} icon="chart" tono="ok" />
            <Cifra label="Pedidos" valor={v.resumen.pedidos} icon="receipt" />
            <Cifra label="Ticket medio" valor={formatCentimos(v.resumen.ticket_medio_centimos)} icon="cash" />
            <Cifra label="Productos vendidos" valor={v.resumen.productos_vendidos} icon="utensils" />
          </div>
          <p className="text-sm opacity-70">
            Descuentos {formatCentimos(v.resumen.descuentos_centimos)} · invitaciones {formatCentimos(v.resumen.invitaciones_centimos)} · {v.resumen.cancelados} pedidos cancelados
          </p>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${card} p-5 break-inside-avoid`}>
              <BarChart
                titulo="Ventas por día"
                datos={v.por_dia.map((d) => {
                  const f = formatearFechaCorta(d.fecha);
                  return { etiqueta: `${f.dia} ${f.mes}`, valor: d.ventas_centimos, detalle: `${d.pedidos} pedidos` };
                })}
                formato={formatCentimos}
              />
            </section>
            <section className={`${card} p-5 break-inside-avoid`}>
              <BarChart titulo="Ventas por hora (todo el periodo)" datos={porHora.map((h) => ({ etiqueta: `${h.hora}h`, valor: h.ventas_centimos, detalle: `${h.pedidos} pedidos` }))} formato={formatCentimos} />
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Tabla
              titulo="Productos más vendidos"
              cols={["Producto", "Uds.", "Importe"]}
              filas={v.por_producto.slice(0, 20).map((p) => [p.nombre, p.cantidad, formatCentimos(p.importe_centimos)])}
              clase="xl:col-span-2"
            />
            <div className="grid gap-4">
              <Tabla titulo="Por día" cols={["Día", "Pedidos", "Ventas"]} filas={v.por_dia.map((d) => [d.fecha, d.pedidos, formatCentimos(d.ventas_centimos)])} />
              <Tabla titulo="Por camarero/a" cols={["Quién", "Pedidos", "Ventas"]} filas={v.por_camarero.map((c) => [c.nombre, c.pedidos, formatCentimos(c.ventas_centimos)])} />
              <Tabla titulo="Por tipo de pedido" cols={["Tipo", "Pedidos", "Ventas"]} filas={v.por_tipo.map((t) => [TIPO[t.tipo] ?? t.tipo, t.pedidos, formatCentimos(t.ventas_centimos)])} />
              <Tabla titulo="Cobros por método" cols={["Método", "Importe"]} filas={v.por_metodo.map((m) => [METODO[m.metodo] ?? m.metodo, formatCentimos(m.importe_centimos)])} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Tabla({ titulo, cols, filas, clase = "" }: { titulo: string; cols: string[]; filas: (string | number)[][]; clase?: string }) {
  return (
    <section className={`${card} p-5 break-inside-avoid ${clase}`}>
      <h2 className="font-display text-xl">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">Sin datos.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider opacity-60">
              {cols.map((c, i) => (
                <th key={c} className={`pb-2 ${i > 0 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
            {filas.map((f, i) => (
              <tr key={i}>
                {f.map((c, j) => (
                  <td key={j} className={`py-1.5 ${j > 0 ? "text-right tabular-nums" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
