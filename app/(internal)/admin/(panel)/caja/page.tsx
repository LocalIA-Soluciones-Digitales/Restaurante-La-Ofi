import type { Metadata } from "next";
import { CajaPanel, type Cierre, type EstadoCaja } from "@/components/admin/CajaPanel";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { cierresCaja, estadoCaja } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Cierre de caja" };
export const dynamic = "force-dynamic";

export default async function CajaAdmin() {
  const [e, h] = await Promise.all([estadoCaja<EstadoCaja>(), cierresCaja<Cierre>()]);
  if (!e.ok || !h.ok || !e.data) return <Aviso>{primerError(e, h) ?? "Sin acceso."}</Aviso>;
  return (
    <>
      <Cabecera titulo="Cierre de caja" texto="Cuenta el efectivo, compáralo con lo cobrado y cierra el turno. El arqueo se imprime en la térmica." />
      <CajaPanel inicial={e.data} historial={h.data} />
    </>
  );
}
