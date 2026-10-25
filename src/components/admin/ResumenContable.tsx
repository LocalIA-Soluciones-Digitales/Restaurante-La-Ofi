"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIAS, type Gasto } from "@/components/admin/GastosPanel";
import { botonSecundario, card } from "@/components/admin/ui";
import type { Ventas } from "@/components/admin/VentasPanel";
import { Icon } from "@/components/ui/Icon";
import type { CategoriaGasto } from "@/lib/gastos/ocr";
import { formatCentimos } from "@/lib/format";

const METODO: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", STRIPE: "Online (Stripe)" };

const nombreDeMes = (mes: string) =>
  new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1)));

/**
 * Resumen del mes para la contabilidad: lo vendido frente a lo gastado, el IVA
 * soportado de las facturas y en qué se va el dinero. Importes con IVA, como se
 * cobran y se pagan; el detalle está en las pestañas Ventas y Gastos.
 */
export function ResumenContable({ mes, ventas, gastos }: { mes: string; ventas: Ventas; gastos: Gasto[] }) {
  const router = useRouter();
  const [anio, numMes] = mes.split("-").map(Number) as [number, number];
  const irMes = (delta: number) => {
    const d = new Date(Date.UTC(anio, numMes - 1 + delta, 1));
    router.push(`/admin/contabilidad?vista=resumen&mes=${d.toISOString().slice(0, 7)}`);
  };

  const ingresos = ventas.resumen.ventas_centimos;
  const gastado = gastos.reduce((t, g) => t + g.total_centimos, 0);
  const ivaSoportado = gastos.reduce((t, g) => t + (g.iva_centimos ?? 0), 0);
  const diferencia = ingresos - gastado;
  const margen = ingresos > 0 ? diferencia / ingresos : null;

  const porCategoria = (() => {
    const m = new Map<CategoriaGasto, number>();
    for (const g of gastos) m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.total_centimos);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const cobrado = ventas.por_metodo.reduce((t, x) => t + x.importe_centimos, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${card} flex items-center gap-1 p-1`}>
          <button type="button" onClick={() => irMes(-1)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronLeft" className="h-4 w-4" />
            <span className="sr-only">Mes anterior</span>
          </button>
          <span className="inline-block min-w-[9.5rem] text-center font-semibold first-letter:uppercase">{nombreDeMes(mes)}</span>
          <button type="button" onClick={() => irMes(1)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronRight" className="h-4 w-4" />
            <span className="sr-only">Mes siguiente</span>
          </button>
        </div>
      </div>

      {/* Lo que entra, lo que sale y lo que queda. */}
      <section aria-label="Resultado del mes" className="relative overflow-hidden rounded-[1.5rem] bg-marino p-5 text-crema shadow-lift dark:bg-noche-2 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crema/60">Diferencia del mes</p>
        <p className={`mt-1 font-display text-4xl tabular-nums sm:text-5xl ${diferencia < 0 ? "text-[#FFB59E]" : ""}`}>{formatCentimos(diferencia)}</p>
        <p className="mt-1 text-sm text-crema/70">
          {margen === null ? "Sin ventas este mes." : `${Math.round(margen * 100)} % de lo vendido`} · ventas menos gastos registrados, con IVA
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.08] p-4">
            <dt className="text-xs text-crema/65">Ventas</dt>
            <dd className="mt-1 font-display text-2xl tabular-nums">{formatCentimos(ingresos)}</dd>
            <dd className="text-xs text-crema/60">{ventas.resumen.pedidos} pedidos</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.08] p-4">
            <dt className="text-xs text-crema/65">Gastos</dt>
            <dd className="mt-1 font-display text-2xl tabular-nums">{formatCentimos(gastado)}</dd>
            <dd className="text-xs text-crema/60">{gastos.length} documentos</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${card} p-5`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl">En qué se gasta</h2>
            <Link href={`/admin/contabilidad?vista=gastos&mes=${mes}`} className="text-sm font-semibold underline-offset-4 hover:underline">
              Ver gastos
            </Link>
          </div>
          {porCategoria.length ? (
            <ul className="mt-3 grid gap-2.5">
              {porCategoria.map(([c, v]) => (
                <li key={c} className="grid gap-1 text-sm">
                  <span className="flex justify-between gap-2">
                    <span className="font-semibold">{CATEGORIAS[c]}</span>
                    <span className="tabular-nums">{formatCentimos(v)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10">
                    <span className="block h-full rounded-full bg-marino dark:bg-neon" style={{ width: `${gastado > 0 ? Math.max(2, (v / gastado) * 100) : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">Sin gastos registrados este mes.</p>
          )}
          <p className="mt-4 flex justify-between gap-2 border-t border-carbon/10 pt-3 text-sm dark:border-crema/10">
            <span>IVA soportado (facturas y tickets)</span>
            <span className="font-semibold tabular-nums">{formatCentimos(ivaSoportado)}</span>
          </p>
        </section>

        <section className={`${card} p-5`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl">Cómo se cobra</h2>
            <Link href="/admin/contabilidad?vista=ventas" className="text-sm font-semibold underline-offset-4 hover:underline">
              Ver ventas
            </Link>
          </div>
          {ventas.por_metodo.length ? (
            <ul className="mt-3 grid gap-2.5">
              {ventas.por_metodo.map((x) => (
                <li key={x.metodo} className="grid gap-1 text-sm">
                  <span className="flex justify-between gap-2">
                    <span className="font-semibold">{METODO[x.metodo] ?? x.metodo}</span>
                    <span className="tabular-nums">{formatCentimos(x.importe_centimos)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10">
                    <span className="block h-full rounded-full bg-oliva" style={{ width: `${cobrado > 0 ? Math.max(2, (x.importe_centimos / cobrado) * 100) : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-60">Sin cobros este mes.</p>
          )}
          <dl className="mt-4 grid gap-1 border-t border-carbon/10 pt-3 text-sm dark:border-crema/10">
            <div className="flex justify-between gap-2">
              <dt>Descuentos</dt>
              <dd className="tabular-nums">{formatCentimos(ventas.resumen.descuentos_centimos)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Invitaciones</dt>
              <dd className="tabular-nums">{formatCentimos(ventas.resumen.invitaciones_centimos)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/contabilidad?vista=gastos&mes=${mes}`} className={botonSecundario}>
          <Icon name="download" className="h-4 w-4" />
          CSV de gastos para la gestoría
        </Link>
        <Link href="/admin/contabilidad?vista=ventas" className={botonSecundario}>
          <Icon name="print" className="h-4 w-4" />
          Informe de ventas en PDF
        </Link>
      </div>
    </div>
  );
}
