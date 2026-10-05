import type { Metadata } from "next";
import Link from "next/link";
import { PanelHoy } from "@/components/admin/PanelHoy";
import { botonPrimario, botonSecundario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { cargarHoy } from "@/lib/admin/hoy";
import { obtenerSesionAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Hoy" };
export const dynamic = "force-dynamic";

const FECHA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

export default async function AdminInicio() {
  const sesion = (await obtenerSesionAdmin())!;
  const sala = sesion.rol !== "cocina";
  const gestion = sesion.rol === "admin" || sesion.rol === "encargado";
  const datos = await cargarHoy(sala, gestion);

  return (
    // En tablet/escritorio todo cabe en pantalla: alto = ventana − cabecera (4rem) − padding del main (3rem).
    <div className="flex flex-col lg:h-[calc(100dvh-7rem)] lg:min-h-[34rem]">
      {/* Cabecera compacta: saludo + accesos de servicio (el resto está en la barra lateral). */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Hola, {sesion.nombre.split(/[ @]/)[0]}</h1>
          <p className="text-sm text-carbon-muted first-letter:uppercase dark:text-crema/65">{FECHA.format(new Date())}
            <span className="hidden xl:inline"> · lo que está pasando ahora en La Ofi</span>
          </p>
        </div>
        {sala ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/tpv" className={botonPrimario}>
              <Icon name="plus" className="h-4 w-4" />
              Nueva comanda
            </Link>
            <Link href="/admin/salon" className={botonSecundario}>
              <Icon name="users" className="h-4 w-4" />
              Salón
            </Link>
            <Link href="/admin/reservas" className={botonSecundario}>
              <Icon name="calendar" className="h-4 w-4" />
              Reservar
            </Link>
          </div>
        ) : null}
      </div>
      <PanelHoy inicial={datos} yo={sesion.userId} sala={sala} gestion={gestion} />
    </div>
  );
}
