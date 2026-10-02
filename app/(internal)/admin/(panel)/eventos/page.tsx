import type { Metadata } from "next";
import { EventosGestion, type EventoBd } from "@/components/admin/EventosGestion";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Eventos" };
export const dynamic = "force-dynamic";

export default async function EventosAdmin() {
  const r = await listar<EventoBd>("eventos");
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return (
    <>
      <Cabecera titulo="Eventos" texto="Tardeos, partidos y celebraciones. Los borradores no se ven en la web hasta publicarlos." />
      <EventosGestion inicial={r.data} />
    </>
  );
}
