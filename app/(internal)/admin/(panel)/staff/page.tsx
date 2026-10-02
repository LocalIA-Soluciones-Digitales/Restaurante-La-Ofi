import type { Metadata } from "next";
import { StaffPanel, type Empleado } from "@/components/admin/StaffPanel";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

export default async function StaffAdmin() {
  const r = await listar<Empleado>("staff");
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return (
    <>
      <Cabecera titulo="Equipo" texto="Cuentas del panel y qué puede hacer cada una. La seguridad está en la base de datos: un rol no puede saltarse sus permisos." />
      <StaffPanel inicial={r.data} />
    </>
  );
}
