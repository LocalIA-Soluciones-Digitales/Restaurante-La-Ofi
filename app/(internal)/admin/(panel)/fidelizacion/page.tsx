import type { Metadata } from "next";
import { FidelizacionPanel, type Comensal, type Premio, type Regla } from "@/components/admin/FidelizacionPanel";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Fidelización" };
export const dynamic = "force-dynamic";

export default async function FidelizacionAdmin() {
  const [a, r, p, c] = await Promise.all([
    listar<{ valor: { activa?: boolean } }>("ajustes", { clave: "fidelizacion" }),
    listar<Regla>("reglas_promocion"),
    listar<Premio>("premios_otorgados"),
    listar<Comensal>("comensales"),
  ]);
  if (!a.ok || !r.ok || !p.ok || !c.ok) return <Aviso>{primerError(a, r, p, c)}</Aviso>;
  return (
    <>
      <Cabecera titulo="Fidelización" texto="Premia a quien repite: cada N visitas con reserva, un detalle. Desactivada por defecto." />
      <FidelizacionPanel activa={Boolean(a.data[0]?.valor.activa)} reglas={r.data} premios={p.data} comensales={c.data} />
    </>
  );
}
