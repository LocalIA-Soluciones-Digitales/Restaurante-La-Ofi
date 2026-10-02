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

/** Servicio de sala (laofi_admin_ocupacion): se mide cada vez que se libera una mesa. */
export interface Ocupacion {
  desde_medicion: string | null;
  resumen: { ocupaciones: number; comensales: number; minutos_medios: number; importe_medio_centimos: number };
  por_zona: { zona: string; mesas: number; ocupaciones: number; rotacion: number; minutos_medios: number; comensales: number; importe_medio_centimos: number }[];
}

const duracion = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`);

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
  const [o, setO] = useState<Ocupacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [r, oc] = await Promise.all([
      rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: desde, p_hasta: hasta }),
      rpcAdmin<Ocupacion>("laofi_admin_ocupacion", { p_desde: desde, p_hasta: hasta }),
    ]);
    if (r.ok) setV(r.data);
    else setError(r.error);
    if (oc.ok) setO(oc.data);
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

          {o ? (
            <section className={`${card} p-5 break-inside-avoid`} aria-labelledby="sala-t">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="sala-t" className="font-display text-xl">
                  Servicio de sala
                </h2>
                <p className="text-xs opacity-60">
                  {o.desde_medicion
                    ? `Se mide al liberar cada mesa, desde el ${new Date(o.desde_medicion).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}.`
                    : "Se empieza a medir cuando se libere la primera mesa desde el salón."}
                </p>
              </div>
              {o.resumen.ocupaciones === 0 ? (
                <p className="mt-2 text-sm opacity-60">Sin mesas liberadas en este periodo.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Cifra label="Mesas servidas" valor={o.resumen.ocupaciones} icon="users" />
                    <Cifra label="Tiempo medio en mesa" valor={duracion(o.resumen.minutos_medios)} icon="clock" />
                    <Cifra label="Comensales" valor={o.resumen.comensales} icon="utensils" />
                    <Cifra label="Importe medio por mesa" valor={formatCentimos(o.resumen.importe_medio_centimos)} icon="cash" />
                  </div>
                  <table className="mt-4 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                        <th className="pb-2">Zona</th>
                        <th className="pb-2 text-right">Mesas</th>
                        <th className="pb-2 text-right">Servidas</th>
                        <th className="pb-2 text-right" title="Veces que se ocupa cada mesa al día, de media">
                          Rotación/día
                        </th>
                        <th className="pb-2 text-right">Tiempo medio</th>
                        <th className="pb-2 text-right">Importe medio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                      {o.por_zona.map((z) => (
                        <tr key={z.zona}>
                          <td className="py-1.5 font-semibold">{z.zona}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.mesas}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? Number(z.rotacion).toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? duracion(z.minutos_medios) : "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? formatCentimos(z.importe_medio_centimos) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          ) : null}

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
