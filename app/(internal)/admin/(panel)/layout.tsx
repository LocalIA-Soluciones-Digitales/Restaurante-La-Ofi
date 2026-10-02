import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import { PGLITE_ACTIVO } from "@/lib/supabase/dev-pglite";

export const dynamic = "force-dynamic";

/** Todo /admin salvo el login exige sesión de staff de La Ofi (rol en laofi.mi_rol). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) redirect("/admin/login");
  return (
    <AdminShell nombre={sesion.nombre} rol={sesion.rol} local={PGLITE_ACTIVO}>
      {children}
    </AdminShell>
  );
}
