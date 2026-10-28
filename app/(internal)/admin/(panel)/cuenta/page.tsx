import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CambiarContrasenaForm } from "@/components/admin/CambiarContrasenaForm";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { obtenerSesionAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function CuentaAdmin() {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) redirect("/admin/login");
  return (
    <>
      <Cabecera titulo="Mi cuenta" texto={`Has entrado como ${sesion.email}.`} />
      {sesion.rol === "admin" || sesion.rol === "encargado" ? (
        <CambiarContrasenaForm email={sesion.email} />
      ) : (
        <Aviso tono="info">Esta es una cuenta compartida del local: su contraseña la cambia el administrador.</Aviso>
      )}
    </>
  );
}
