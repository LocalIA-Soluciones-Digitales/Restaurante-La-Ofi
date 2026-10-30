import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvisosMovil } from "@/components/admin/AvisosMovil";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { estadoAvisos } from "@/lib/admin/actions";
import { obtenerSesionAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Avisos al móvil" };
export const dynamic = "force-dynamic";

export default async function AvisosAdmin() {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) redirect("/admin/login");
  const r = await estadoAvisos();
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return (
    <>
      <Cabecera
        titulo="Avisos al móvil"
        texto="Un aviso en el móvil cada vez que entra una reserva, un pedido para recoger o alguien se apunta a un evento, aunque no tengas el panel abierto."
      />
      <AvisosMovil inicial={r.data} puedeEditar={sesion.rol === "admin" || sesion.rol === "encargado"} />
    </>
  );
}
