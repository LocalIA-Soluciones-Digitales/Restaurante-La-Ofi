import { NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import { emitirFacturaTicketBai } from "@/lib/ticketbai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Emite (o recupera, si ya existe) la factura TicketBAI de una cuenta antes de
 * imprimirla. Solo staff de sala. Con TICKETBAI_ENABLED distinto de "true"
 * responde { habilitado: false } y el ticket se imprime como siempre.
 */
export async function POST(request: Request) {
  const sesion = await obtenerSesionAdmin();
  if (!sesion || sesion.rol === "cocina") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { pedidoIds, mesaId } = (await request.json().catch(() => ({}))) as { pedidoIds?: string[]; mesaId?: string };
  if (!Array.isArray(pedidoIds) || pedidoIds.length === 0 || !pedidoIds.every((x) => UUID.test(x))) {
    return NextResponse.json({ error: "Pedidos no válidos" }, { status: 400 });
  }
  const r = await emitirFacturaTicketBai({ pedidoIds, mesaId: mesaId && UUID.test(mesaId) ? mesaId : null });
  return NextResponse.json(r);
}
