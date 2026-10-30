import type { Metadata } from "next";
import { EventosGestion, type Asistentes, type EventoBd } from "@/components/admin/EventosGestion";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar, rpcAdmin } from "@/lib/admin/actions";
import { hoyEnMadrid } from "@/lib/format";

export const metadata: Metadata = { title: "Eventos" };
export const dynamic = "force-dynamic";

export default async function EventosAdmin() {
  const hoy = hoyEnMadrid();
  const [r, reservas] = await Promise.all([
    listar<EventoBd>("eventos"),
    // Quién se ha apuntado desde la web (o se ha metido a mano) a cada evento que viene.
    rpcAdmin<{ evento_id: string | null; personas: number; estado: string }[]>("laofi_admin_reservas", {
      p_desde: hoy,
      p_hasta: `${Number(hoy.slice(0, 4)) + 1}${hoy.slice(4)}`,
    }),
  ]);
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  const asistentes: Asistentes = {};
  for (const x of reservas.ok ? reservas.data : []) {
    if (!x.evento_id || x.estado === "CANCELADA" || x.estado === "NO_SHOW") continue;
    const a = (asistentes[x.evento_id] ??= { personas: 0, grupos: 0 });
    a.personas += x.personas;
    a.grupos += 1;
  }
  return (
    <>
      <Cabecera titulo="Eventos" texto="Mete los eventos de todo el año: los publicados salen en la agenda. Con «Anunciar» eliges cuál sale como aviso al entrar en la web." />
      <EventosGestion inicial={r.data} asistentes={asistentes} />
    </>
  );
}
