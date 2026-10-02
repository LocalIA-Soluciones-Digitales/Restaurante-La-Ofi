import type { Metadata } from "next";
import { ConfiguracionPanel, type Ajuste, type DiaHorarioBd } from "@/components/admin/ConfiguracionPanel";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionAdmin() {
  const [a, h] = await Promise.all([listar<Ajuste>("ajustes"), listar<DiaHorarioBd>("horario")]);
  if (!a.ok || !h.ok) return <Aviso>{primerError(a, h)}</Aviso>;
  return (
    <>
      <Cabecera titulo="Configuración" texto="Horario, recogida, pagos, reservas y datos fiscales. Todo lo nuevo viene apagado hasta que lo actives." />
      <ConfiguracionPanel ajustes={a.data} horario={h.data.map((d) => ({ ...d, desde: d.desde?.slice(0, 5) ?? null, hasta: d.hasta?.slice(0, 5) ?? null }))} ticketbai={{ activo: process.env.TICKETBAI_ENABLED === "true" }} />
    </>
  );
}
