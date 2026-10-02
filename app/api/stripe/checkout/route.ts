import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";
import { getStripe } from "@/lib/stripe/server";
import { rpcServicio } from "@/lib/supabase/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PedidoParaPago {
  id: string;
  numero_dia: number;
  payment_method: "ONLINE" | "LOCAL";
  payment_status: string;
  estado: string;
  total_centimos: number;
  lineas: { nombre: string; cantidad: number; precio_unitario_centimos: number }[];
}

/**
 * Crea la sesión de Stripe Checkout de un pedido ya creado (Palomita §10). Los
 * importes salen de la base de datos, nunca del navegador. El pago se confirma
 * SOLO en el webhook; success_url es solo la página de seguimiento.
 */
export async function POST(request: Request) {
  const { pedidoId } = (await request.json().catch(() => ({}))) as { pedidoId?: string };
  if (!pedidoId || !UUID.test(pedidoId)) return NextResponse.json({ error: "Pedido no válido" }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "El pago online no está activo" }, { status: 503 });

  const r = await rpcServicio<PedidoParaPago>("laofi_get_pedido_para_pago", { p_pedido_id: pedidoId });
  const pedido = r?.data ?? null;
  if (!r || r.error || !pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (pedido.payment_method !== "ONLINE" || pedido.payment_status === "PAID" || pedido.estado === "CANCELLED") {
    return NextResponse.json({ error: "Este pedido no admite pago online" }, { status: 409 });
  }

  const volver = `${SITE_URL}/es/pedido/${pedido.id}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "es",
    line_items: pedido.lineas.map((l) => ({
      quantity: l.cantidad,
      price_data: { currency: "eur", unit_amount: l.precio_unitario_centimos, product_data: { name: l.nombre } },
    })),
    metadata: { pedido_id: pedido.id },
    payment_intent_data: { metadata: { pedido_id: pedido.id }, description: `La Ofi · pedido #${pedido.numero_dia}` },
    success_url: `${volver}?pago=ok`,
    cancel_url: `${volver}?pago=cancelado`,
  });

  return NextResponse.json({ url: session.url });
}
