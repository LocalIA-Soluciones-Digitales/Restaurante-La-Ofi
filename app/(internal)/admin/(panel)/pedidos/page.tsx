import type { Metadata } from "next";
import type { Ajuste } from "@/components/admin/ConfiguracionPanel";
import { PedidosRecogida } from "@/components/admin/PedidosRecogida";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { colaCocina, listar } from "@/lib/admin/actions";
import type { PedidoKds } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const hhmm = (v: unknown, porDefecto: string) => (typeof v === "string" && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : porDefecto);

/** La cabecera con el horario de verdad (ajuste «recogida»), no uno escrito a mano. */
function texto(rec: Record<string, unknown> | undefined): string {
  const pasos = "Un botón por paso: acéptalo, avisa cuando esté listo y cóbralo al entregarlo.";
  if (!rec || rec.activa === false) return `Los pedidos para recoger están desactivados en Configuración. ${pasos}`;
  const recoge = `${hhmm(rec.desde, "13:00")} a ${hhmm(rec.hasta, "15:00")}`;
  if (rec.solo_menu_dia === true) {
    return `Los menús del día encargados para recoger hoy (se encargan de ${hhmm(rec.pedir_desde, "09:00")} a ${hhmm(rec.pedir_hasta, "12:00")} y se recogen de ${recoge}). ${pasos}`;
  }
  return `Los pedidos para recoger (${rec.segun_horario === true ? "en el horario del local" : `se recogen de ${recoge}`}). ${pasos}`;
}

export default async function PedidosPage() {
  const [r, a] = await Promise.all([colaCocina<PedidoKds>(), listar<Ajuste>("ajustes")]);
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  const rec = a.ok ? (a.data.find((x) => x.clave === "recogida")?.valor as Record<string, unknown> | undefined) : undefined;
  return (
    <>
      <Cabecera titulo="Pedidos" texto={texto(rec)} />
      <PedidosRecogida inicial={r.data.filter((p) => p.tipo === "RECOGIDA")} />
    </>
  );
}
