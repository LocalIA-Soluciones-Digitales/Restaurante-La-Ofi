import type { Metadata } from "next";
import { GastosPanel, type Gasto, type ProveedorGasto } from "@/components/admin/GastosPanel";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";
import { gastosEntre } from "@/lib/admin/gastos-actions";
import type { DatosFiscales } from "@/lib/print/ticket";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Gastos" };
export const dynamic = "force-dynamic";

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: q } = await searchParams;
  const actual = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()).slice(0, 7);
  const mes = q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : actual;
  const [anio, m] = mes.split("-").map(Number) as [number, number];
  const hasta = new Date(Date.UTC(anio, m, 0)).toISOString().slice(0, 10);
  const [r, ajustes] = await Promise.all([
    gastosEntre<{ gastos: Gasto[]; proveedores: ProveedorGasto[] }>(`${mes}-01`, hasta),
    listar<{ valor: DatosFiscales }>("ajustes", { clave: "fiscal" }),
  ]);
  if (!r.ok || !r.data) return <Aviso>{r.ok ? "Sin acceso." : r.error}</Aviso>;
  const fiscal = ajustes.ok ? (ajustes.data[0]?.valor ?? {}) : {};
  return (
    <>
      <Cabecera
        titulo="Gastos"
        texto="Haz una foto a un albarán, factura o ticket: el lector lo lee en el propio dispositivo (gratis, sin enviarlo a nadie), lo revisas y se guarda. Aprende de cada corrección."
      />
      <GastosPanel
        mes={mes}
        gastos={r.data.gastos}
        proveedores={r.data.proveedores}
        propios={{ nombres: [SITE.name, SITE.shortName, ...(fiscal.razon_social ? [fiscal.razon_social] : [])], cif: fiscal.nif ?? null }}
      />
    </>
  );
}
