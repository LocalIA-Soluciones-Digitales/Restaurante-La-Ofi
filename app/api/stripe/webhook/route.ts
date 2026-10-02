import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, idsDesdeMetadata } from "@/lib/stripe/server";
import { rpcServicio } from "@/lib/supabase/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe: ÚNICA vía que confirma un pago (nunca la redirección del
 * navegador). Verifica la firma antes de nada y llama a las RPC de pago, que solo
 * puede ejecutar service_role, comprueban el importe y son idempotentes (Stripe
 * puede reenviar el mismo evento).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const firma = request.headers.get("stripe-signature");
  const stripe = getStripe();
  if (!secret || !firma || !stripe) return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), firma, secret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return NextResponse.json({ received: true });
    const intent = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
    const importe = s.amount_total ?? 0;

    let res: Awaited<ReturnType<typeof rpcServicio>> = null;
    if (s.metadata?.pedido_id) {
      res = await rpcServicio("laofi_marcar_pedido_pagado", {
        p_pedido_id: s.metadata.pedido_id,
        p_stripe_session_id: s.id,
        p_payment_intent: intent,
        p_importe_centimos: importe,
      });
    } else if (s.metadata?.participante_id) {
      res = await rpcServicio("laofi_marcar_repartos_pagados", {
        p_participante_id: s.metadata.participante_id,
        p_reparto_ids: idsDesdeMetadata("r", s.metadata),
        p_stripe_session_id: s.id,
        p_payment_intent: intent,
        p_importe_centimos: importe,
      });
    }
    const error = res === null && (s.metadata?.pedido_id || s.metadata?.participante_id) ? { message: "Supabase sin configurar" } : res?.error;

    if (error) {
      // 500 → Stripe reintenta. El detalle queda en los logs del servidor.
      console.error("[stripe webhook]", s.id, error.message);
      return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
