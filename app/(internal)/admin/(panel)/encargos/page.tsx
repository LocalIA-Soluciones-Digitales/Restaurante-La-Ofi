import type { Metadata } from "next";
import { EncargosVino } from "@/components/admin/EncargosVino";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { encargosVino } from "@/lib/admin/actions";
import type { EncargoVinoAdmin } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Encargos de vino" };
export const dynamic = "force-dynamic";

export default async function EncargosPage() {
  const r = await encargosVino<EncargoVinoAdmin>();
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return (
    <>
      <Cabecera titulo="Encargos de vino" texto="Las botellas que encargan desde la carta de vinos para llevar. Confírmalas (al cliente le llega un email si lo dejó), avisa cuando estén listas y cóbralas aquí al entregarlas: entran en la caja." />
      <EncargosVino inicial={r.data} />
    </>
  );
}
