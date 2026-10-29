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
      <Cabecera titulo="Eventos" texto="Mete los eventos de todo el año: los publicados salen en la agenda. Con «Anunciar» eliges cuál sale como aviso al entrar en la web." />
      <EventosGestion inicial={r.data} />
    </>
  );
}
