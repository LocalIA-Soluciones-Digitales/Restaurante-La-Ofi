import type { Metadata } from "next";
import Link from "next/link";
import { GastosPanel, type Gasto, type ProveedorGasto } from "@/components/admin/GastosPanel";
import { ResumenContable } from "@/components/admin/ResumenContable";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { VentasPanel, type Ventas } from "@/components/admin/VentasPanel";
import { listar, rpcAdmin } from "@/lib/admin/actions";
import { gastosEntre } from "@/lib/admin/gastos-actions";
import type { DatosFiscales } from "@/lib/print/ticket";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contabilidad" };
export const dynamic = "force-dynamic";

const VISTAS = [
  { key: "resumen", label: "Resumen", texto: "El mes de un vistazo: lo que entra, lo que sale y la diferencia." },
  { key: "ventas", label: "Ventas", texto: "Qué se vende, cuándo y quién lo vende. Exporta a CSV o imprime el informe en PDF." },
  {
    key: "gastos",
    label: "Gastos",
    texto: "Haz una foto a un albarán, factura o ticket: el lector lo lee en el propio dispositivo (gratis, sin enviarlo a nadie), lo revisas y se guarda. Aprende de cada corrección.",
  },
] as const;
type Vista = (typeof VISTAS)[number]["key"];

/** Mes «AAAA-MM» del parámetro, o el actual en Madrid; con su primer y último día. */
function periodoMes(q: string | undefined) {
  const actual = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()).slice(0, 7);
  const mes = q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : actual;
  const [anio, m] = mes.split("-").map(Number) as [number, number];
  return { mes, desde: `${mes}-01`, hasta: new Date(Date.UTC(anio, m, 0)).toISOString().slice(0, 10) };
}

/**
 * Contabilidad: ventas (con sus informes) y gastos en una sola sección, más un
 * resumen mensual que cruza ambos. Antes eran dos entradas del menú separadas.
 */
export default async function ContabilidadPage({ searchParams }: { searchParams: Promise<{ vista?: string; mes?: string }> }) {
  const q = await searchParams;
  const vista: Vista = VISTAS.some((v) => v.key === q.vista) ? (q.vista as Vista) : "resumen";
  const actual = VISTAS.find((v) => v.key === vista)!;
  const { mes, desde, hasta } = periodoMes(q.mes);

  return (
    <>
      <Cabecera titulo="Contabilidad" texto={actual.texto} />
      <nav aria-label="Contabilidad" className="-mt-2 mb-6 flex w-full gap-1 rounded-xl bg-arena p-1 dark:bg-noche-2 sm:w-fit">
        {VISTAS.map((v) => (
          <Link
            key={v.key}
            href={`/admin/contabilidad?vista=${v.key}${v.key !== "ventas" ? `&mes=${mes}` : ""}`}
            aria-current={vista === v.key ? "page" : undefined}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors aria-[current=page]:bg-[theme(colors.marino.DEFAULT)] aria-[current=page]:text-crema dark:aria-[current=page]:bg-neon dark:aria-[current=page]:text-noche sm:flex-none"
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {vista === "ventas" ? <VentasPanel /> : vista === "gastos" ? <Gastos mes={mes} desde={desde} hasta={hasta} /> : <Resumen mes={mes} desde={desde} hasta={hasta} />}
    </>
  );
}

async function Gastos({ mes, desde, hasta }: { mes: string; desde: string; hasta: string }) {
  const [r, ajustes] = await Promise.all([gastosEntre<{ gastos: Gasto[]; proveedores: ProveedorGasto[] }>(desde, hasta), listar<{ valor: DatosFiscales }>("ajustes", { clave: "fiscal" })]);
  if (!r.ok || !r.data) return <Aviso>{r.ok ? "Sin acceso." : r.error}</Aviso>;
  const fiscal = ajustes.ok ? (ajustes.data[0]?.valor ?? {}) : {};
  return (
    <GastosPanel
      mes={mes}
      gastos={r.data.gastos}
      proveedores={r.data.proveedores}
      propios={{ nombres: [SITE.name, SITE.shortName, ...(fiscal.razon_social ? [fiscal.razon_social] : [])], cif: fiscal.nif ?? null }}
    />
  );
}

async function Resumen({ mes, desde, hasta }: { mes: string; desde: string; hasta: string }) {
  const [ventas, gastos] = await Promise.all([rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: desde, p_hasta: hasta }), gastosEntre<{ gastos: Gasto[] }>(desde, hasta)]);
  if (!ventas.ok) return <Aviso>{ventas.error}</Aviso>;
  if (!gastos.ok || !gastos.data) return <Aviso>{gastos.ok ? "Sin acceso." : gastos.error}</Aviso>;
  return <ResumenContable mes={mes} ventas={ventas.data} gastos={gastos.data.gastos} />;
}
