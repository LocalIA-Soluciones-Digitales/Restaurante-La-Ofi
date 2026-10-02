import type { Metadata } from "next";
import { ResenasPanel, type Resena } from "@/components/admin/ResenasPanel";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Reseñas" };
export const dynamic = "force-dynamic";

export default async function ResenasAdmin() {
  const [a, r] = await Promise.all([listar<{ valor: { activa?: boolean } }>("ajustes", { clave: "resenas" }), listar<Resena>("resenas")]);
  if (!a.ok || !r.ok) return <Aviso>{primerError(a, r)}</Aviso>;
  return (
    <>
      <Cabecera titulo="Reseñas" texto="Opiniones de clientes moderadas. Desactivadas por defecto." />
      <ResenasPanel activa={Boolean(a.data[0]?.valor.activa)} inicial={r.data} />
    </>
  );
}
