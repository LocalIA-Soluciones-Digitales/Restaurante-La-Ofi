import type { Metadata } from "next";
import { SalonBoard } from "@/components/admin/salon/SalonBoard";
import { Aviso } from "@/components/admin/ui";
import { listar, rpcAdmin, salon } from "@/lib/admin/actions";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import type { ReservaDia, SalonData } from "@/lib/admin/types";
import { hoyEnMadrid } from "@/lib/format";
import type { DatosFiscales } from "@/lib/print/ticket";

export const metadata: Metadata = { title: "Salón" };
export const dynamic = "force-dynamic";

export default async function SalonPage() {
  const sesion = (await obtenerSesionAdmin())!;
  const hoy = hoyEnMadrid();
  const [r, ajustes, reservas] = await Promise.all([
    salon<SalonData>(),
    listar<{ clave: string; valor: DatosFiscales }>("ajustes", { clave: "fiscal" }),
    rpcAdmin<ReservaDia[]>("laofi_admin_reservas", { p_desde: hoy, p_hasta: hoy }),
  ]);
  if (!r.ok || !r.data) return <Aviso>{r.ok ? "Sin acceso al salón." : r.error}</Aviso>;
  const fiscal = ajustes.ok ? (ajustes.data[0]?.valor ?? {}) : {};
  return (
    <SalonBoard
      inicial={r.data}
      rol={sesion.rol}
      fiscal={fiscal}
      yo={sesion.userId}
      reservasIniciales={reservas.ok ? reservas.data : []}
    />
  );
}
