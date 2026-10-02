import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";
import { getStripe, idsEnMetadata } from "@/lib/stripe/server";
import { rpcServicio } from "@/lib/supabase/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RETORNO = /^\/es\/pedir\?mesa=[A-Za-z0-9_-]{8,64}$/;

interface RepartoParaPago {
  participante_id: string;
  nombre: string;
  sesion_id: string;
  lineas: { reparto_id: string; nombre: string; importe_centimos: number }[];
}

/**
 * "Pagar mi parte" en modo "cada uno lo suyo" (Palomita §16.3): cobra solo las
 * partes pendientes de un comensal. Los ids de esas partes viajan en la metadata
 * para que el webhook marque exactamente lo cobrado.
 */
export async function POST(request: Request) {
  const { participanteId, volverA } = (await request.json().catch(() => ({}))) as { participanteId?: string; volverA?: string };
  if (!participanteId || !UUID.test(participanteId)) return NextResponse.json({ error: "Comensal no válido" }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "El pago online no está activo" }, { status: 503 });

  const r = await rpcServicio<RepartoParaPago>("laofi_get_reparto_para_pago", { p_participante_id: participanteId });
  const reparto = r?.data ?? null;
  if (!r || r.error || !reparto) return NextResponse.json({ error: "Comensal no encontrado" }, { status: 404 });
  if (reparto.lineas.length === 0) return NextResponse.json({ error: "No tienes nada pendiente de pagar" }, { status: 409 });

  // Solo se vuelve a la propia mesa (sin redirecciones abiertas).
  const destino = volverA && RETORNO.test(volverA) ? `${SITE_URL}${volverA}` : `${SITE_URL}/es/pedir`;
  const sep = destino.includes("?") ? "&" : "?";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "es",
    line_items: reparto.lineas.map((l) => ({
      quantity: 1,
      price_data: { currency: "eur", unit_amount: l.importe_centimos, product_data: { name: l.nombre } },
    })),
    metadata: { participante_id: participanteId, ...idsEnMetadata("r", reparto.lineas.map((l) => l.reparto_id)) },
    payment_intent_data: { description: `La Ofi · parte de ${reparto.nombre}` },
    success_url: `${destino}${sep}pago=ok`,
    cancel_url: `${destino}${sep}pago=cancelado`,
  });

  return NextResponse.json({ url: session.url });
}
