import type { Metadata } from "next";
import Link from "next/link";
import { AvisosMesas } from "@/components/admin/AvisosMesas";
import { Cabecera, Cifra, card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { colaCocina, estadoCaja, salon } from "@/lib/admin/actions";
import { SECCIONES } from "@/lib/admin/roles";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import type { MesaSalon, SalonData } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";

export const metadata: Metadata = { title: "Hoy" };
export const dynamic = "force-dynamic";

export default async function AdminInicio() {
  const sesion = (await obtenerSesionAdmin())!;
  const sala = sesion.rol !== "cocina";
  const gestion = sesion.rol === "admin" || sesion.rol === "encargado";
  const [s, cola, caja] = await Promise.all([
    sala ? salon<SalonData>() : null,
    colaCocina<{ id: string }>(),
    gestion ? estadoCaja<{ ventas_centimos: number; pedidos: number; pendiente_cobro_centimos: number }>() : null,
  ]);
  const mesas: MesaSalon[] = s?.ok ? s.data.mesas : [];
  const ocupadas = mesas.filter((m) => m.ocupada).length;
  const avisos = mesas.filter((m) => m.aviso_camarero || m.pide_cuenta);
  const accesos = SECCIONES.filter((x) => x.href !== "/admin" && x.roles.includes(sesion.rol));

  return (
    <>
      <Cabecera titulo={`Hola, ${sesion.nombre.split(/[ @]/)[0]}`} texto="Lo que está pasando ahora mismo en La Ofi." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra label="Pedidos en cocina y barra" valor={cola.ok ? cola.data.length : "–"} icon="flame" />
        {sala ? <Cifra label="Mesas ocupadas" valor={`${ocupadas} / ${mesas.length}`} icon="users" /> : null}
        {sala ? <Cifra label="Avisos de mesa" valor={avisos.length} icon="bell" tono={avisos.length > 0 ? "aviso" : "neutro"} /> : null}
        {caja?.ok ? <Cifra label={`Ventas desde el último cierre (${caja.data.pedidos} pedidos)`} valor={formatCentimos(caja.data.ventas_centimos)} icon="chart" tono="ok" /> : null}
      </div>

      {sala ? (
        <section className={`${card} mt-6 p-5`} aria-labelledby="avisos-t">
          <h2 id="avisos-t" className="font-display text-2xl">
            Avisos de mesa
          </h2>
          <AvisosMesas inicial={avisos} />
        </section>
      ) : null}

      <section className="mt-6" aria-labelledby="accesos-t">
        <h2 id="accesos-t" className="sr-only">
          Accesos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accesos.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className={`${card} flex min-h-20 items-center gap-4 p-5 transition-colors hover:border-marino dark:hover:border-neon`}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-arena text-marino dark:bg-noche-3 dark:text-neon">
                  <Icon name={a.icon} className="h-6 w-6" />
                </span>
                <span className="font-semibold">{a.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
