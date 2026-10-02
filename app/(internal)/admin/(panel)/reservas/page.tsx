import type { Metadata } from "next";
import { ReservasBoard, type EventoLite } from "@/components/admin/ReservasBoard";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar, salon } from "@/lib/admin/actions";
import type { SalonData } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reservas" };
export const dynamic = "force-dynamic";

export default async function ReservasAdmin() {
  const [s, ev] = await Promise.all([salon<SalonData>(), listar<EventoLite & { publicado: boolean }>("eventos")]);
  if (!s.ok || !s.data) return <Aviso>{s.ok ? "Sin acceso." : s.error}</Aviso>;
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Cabecera titulo="Reservas" texto="Las que llegan desde la web entran como pendientes: confírmalas o llama al cliente." />
      <ReservasBoard mesas={s.data.mesas} zonas={s.data.zonas} eventos={ev.ok ? ev.data.filter((e) => e.publicado && e.fecha >= hoy) : []} />
    </>
  );
}
