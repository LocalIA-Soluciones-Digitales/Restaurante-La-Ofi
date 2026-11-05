import type { Metadata } from "next";
import { PedidosRecogida } from "@/components/admin/PedidosRecogida";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { colaCocina } from "@/lib/admin/actions";
import type { PedidoKds } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const r = await colaCocina<PedidoKds>();
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return (
    <>
      <Cabecera titulo="Pedidos" texto="Los menús del día encargados para recoger hoy (se encargan de 9:00 a 12:00 y se recogen de 13:00 a 15:00). Un botón por paso: acéptalo, avisa cuando esté listo y entrégalo al cliente." />
      <PedidosRecogida inicial={r.data.filter((p) => p.tipo === "RECOGIDA")} />
    </>
  );
}
