import "server-only";
import type { PedidoKds } from "@/lib/admin/types";
import { SITE_URL } from "@/lib/env";
import { formatCentimos } from "@/lib/format";
import { cuandoRecogida, fechaMadrid } from "@/lib/pedidos/franjas";
import { emailActivo, escapar, smtp } from "@/lib/reservas/email";
import { SITE } from "@/lib/site";

// Emails al cliente sobre su pedido para recoger: «encargo confirmado» (cuando el local
// acepta un encargo de otro día) y «listo» (cuando está para recoger). Mismo SMTP que las
// reservas: sin SMTP_USER/SMTP_PASS no se manda nada y el pedido sigue igual.

export type AvisoPedido = "confirmado" | "listo";

type PedidoAvisable = Pick<PedidoKds, "id" | "numero_dia" | "tipo" | "estado" | "nombre_cliente" | "email" | "recogida_en" | "created_at" | "total_centimos" | "payment_status" | "items">;

/** ¿La recogida es otro día (no hoy)? Los encargos se confirman; los de hoy, no. */
export const esDeOtroDia = (p: Pick<PedidoKds, "recogida_en">, ahora = new Date()) =>
  Boolean(p.recogida_en && fechaMadrid(p.recogida_en) > fechaMadrid(ahora));

/** Qué aviso toca al pasar el pedido de `anterior` a su estado actual (null: ninguno). */
export function avisoDePedido(p: PedidoAvisable, anterior: string | null | undefined, ahora = new Date()): AvisoPedido | null {
  if (p.tipo !== "RECOGIDA" || !p.email || !anterior || p.estado === anterior) return null;
  if (p.estado === "ACCEPTED" && anterior === "RECEIVED" && esDeOtroDia(p, ahora)) return "confirmado";
  if (p.estado === "READY" && !esDeOtroDia(p, ahora)) return "listo";
  return null;
}

const enlacePedido = (id: string) => `${SITE_URL}/es/pedido/${id}`;

function lineas(p: PedidoAvisable): string[] {
  return p.items.filter((i) => i.estado !== "CANCELLED").map((i) => `${i.cantidad}× ${i.nombre}`);
}

function textos(tipo: AvisoPedido, p: PedidoAvisable) {
  const hola = p.nombre_cliente ? `Hola, ${p.nombre_cliente.split(" ")[0]}:` : "Hola:";
  const cuando = p.recogida_en ? cuandoRecogida(p.recogida_en) : "";
  const pago = p.payment_status === "PAID" ? "Ya está pagado." : `Total: ${formatCentimos(p.total_centimos)}, se paga al recoger.`;
  if (tipo === "confirmado") {
    return {
      asunto: `Encargo confirmado para ${cuando} · ${SITE.shortName}`,
      sello: "Confirmado",
      color: "#4E6B3A",
      parrafos: [
        hola,
        `Te confirmamos tu encargo (pedido #${p.numero_dia}) para ${cuando}. Lo tendremos preparado a esa hora en la barra.`,
        pago,
        `Si necesitas cambiar algo, llámanos al ${SITE.phone.display}.`,
      ],
    };
  }
  return {
    asunto: `Tu pedido #${p.numero_dia} está listo · ${SITE.shortName}`,
    sello: "¡Listo!",
    color: "#4E6B3A",
    parrafos: [hola, `Tu pedido #${p.numero_dia} ya está listo. Pasa a recogerlo por la barra cuando quieras.`, pago],
  };
}

function html(tipo: AvisoPedido, p: PedidoAvisable, enlace: string): string {
  const t = textos(tipo, p);
  const [hola, ...resto] = t.parrafos;
  const lista = lineas(p)
    .map((l) => `<tr><td style="padding:2px 0;font-size:15px">${escapar(l)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F1E8D8;font-family:Helvetica,Arial,sans-serif;color:#2B2722">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1E8D8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border-radius:20px;overflow:hidden">
<tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:26px">La Ofi</td></tr>
<tr><td style="padding:0 28px"><span style="display:inline-block;background:${t.color};color:#fffdf8;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:bold">${t.sello}</span></td></tr>
<tr><td style="padding:20px 28px 0;font-size:18px;font-weight:bold">${escapar(hola ?? "")}</td></tr>
${resto.map((x) => `<tr><td style="padding:12px 28px 0;font-size:16px;line-height:1.5">${escapar(x)}</td></tr>`).join("")}
<tr><td style="padding:16px 28px 0"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #E6D8BF;padding-top:10px">${lista}</table></td></tr>
<tr><td style="padding:24px 28px"><a href="${enlace}" style="display:inline-block;background:#1E3557;color:#fffdf8;text-decoration:none;border-radius:12px;padding:12px 20px;font-weight:bold">Ver mi pedido</a></td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #E6D8BF;font-size:13px;color:#5E554B;line-height:1.5">
${SITE.name} · ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.locality}<br>${SITE.address.context} · ${SITE.phone.display}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Manda el aviso al cliente. Nunca lanza: si el SMTP falla, el pedido sigue su curso. */
export async function enviarAvisoPedido(tipo: AvisoPedido, p: PedidoAvisable): Promise<boolean> {
  if (!p.email || !emailActivo()) return false;
  const enlace = enlacePedido(p.id);
  const t = textos(tipo, p);
  try {
    await smtp().sendMail({
      from: { name: SITE.name, address: process.env.SMTP_USER! },
      ...(process.env.SMTP_REPLY_TO ? { replyTo: process.env.SMTP_REPLY_TO } : {}),
      to: p.email,
      subject: t.asunto,
      text: [...t.parrafos, lineas(p).join("\n"), `Ver mi pedido: ${enlace}`].join("\n\n") + `\n\n${SITE.name} · ${SITE.address.street}, ${SITE.address.locality} · ${SITE.phone.display}`,
      html: html(tipo, p, enlace),
    });
    return true;
  } catch (e) {
    console.error("[pedidos] email", tipo, e instanceof Error ? e.message : e);
    return false;
  }
}
