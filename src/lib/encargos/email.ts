import "server-only";
import type { EncargoVinoAdmin } from "@/lib/admin/types";
import { recogidaEnFrase } from "@/lib/encargos/recogida";
import { SITE_URL } from "@/lib/env";
import { formatCentimos } from "@/lib/format";
import { conCavaDeRegalo } from "@/lib/lanzamiento";
import { htmlAvisoCliente } from "@/lib/pedidos/email";
import { emailActivo, smtp } from "@/lib/reservas/email";
import { SITE } from "@/lib/site";

// Emails al cliente sobre su encargo de vino: «confirmado» (el local lo acepta), «listo»
// (está preparado) y «anulado» (no se puede servir). Mismo SMTP que reservas y pedidos:
// sin SMTP_USER/SMTP_PASS no se manda nada y el encargo sigue igual.

export type AvisoEncargo = "confirmado" | "listo" | "anulado";

type EncargoAvisable = Pick<EncargoVinoAdmin, "id" | "numero" | "nombre" | "email" | "estado" | "lineas" | "botellas" | "total_centimos" | "recogida_en">;

/** Qué aviso toca al pasar el encargo de `anterior` a su estado actual (null: ninguno). */
export function avisoDeEncargo(e: EncargoAvisable, anterior: string | null | undefined): AvisoEncargo | null {
  if (!e.email || !anterior || e.estado === anterior) return null;
  if (e.estado === "CONFIRMADO" && anterior === "PENDIENTE") return "confirmado";
  if (e.estado === "LISTO" && (anterior === "PENDIENTE" || anterior === "CONFIRMADO")) return "listo";
  if (e.estado === "CANCELADO" && anterior !== "ENTREGADO") return "anulado";
  return null;
}

const botellas = (n: number) => `${n} ${n === 1 ? "botella" : "botellas"}`;

function textos(tipo: AvisoEncargo, e: EncargoAvisable) {
  const hola = `Hola, ${e.nombre.trim().split(/\s+/)[0] ?? ""}:`;
  const cuando = e.recogida_en ? recogidaEnFrase(e.recogida_en) : null;
  const cava = conCavaDeRegalo(e.total_centimos) ? " Y te llevas tu cava de regalo." : "";
  const pago = `Son ${formatCentimos(e.total_centimos)} y se paga al recogerlo.${cava}`;
  if (tipo === "confirmado") {
    return {
      asunto: `Encargo de vino confirmado${cuando ? ` para ${cuando}` : ""} · ${SITE.shortName}`,
      sello: "Confirmado",
      color: "#4E6B3A",
      parrafos: [
        hola,
        `Te confirmamos tu encargo de vino nº ${e.numero} (${botellas(e.botellas)}). ${cuando ? `Te lo dejamos preparado para ${cuando}.` : "Te avisamos cuando esté preparado."}`,
        pago,
        `Si necesitas cambiar algo, llámanos al ${SITE.phone.display}.`,
      ],
    };
  }
  if (tipo === "listo") {
    return {
      asunto: `Tu encargo de vino nº ${e.numero} está listo · ${SITE.shortName}`,
      sello: "¡Listo!",
      color: "#4E6B3A",
      parrafos: [hola, `Tu encargo de vino nº ${e.numero} (${botellas(e.botellas)}) ya está preparado en La Ofi. ${cuando ? `Te esperamos ${cuando}.` : "Pásate a recogerlo cuando quieras."}`, pago],
    };
  }
  return {
    asunto: `Tu encargo de vino nº ${e.numero} · ${SITE.shortName}`,
    sello: "Anulado",
    color: "#9A4527",
    parrafos: [hola, `Sentimos decirte que no podemos preparar tu encargo de vino nº ${e.numero}. No tienes que pagar nada.`, `Llámanos al ${SITE.phone.display} y te buscamos una alternativa.`],
  };
}

/** Manda el aviso al cliente. Nunca lanza: si el SMTP falla, el encargo sigue su curso. */
export async function enviarAvisoEncargo(tipo: AvisoEncargo, e: EncargoAvisable): Promise<boolean> {
  if (!e.email || !emailActivo()) return false;
  const enlace = `${SITE_URL}/es/encargo/${e.id}`;
  const t = textos(tipo, e);
  const lista = e.lineas.filter((l) => l.cantidad > 0).map((l) => `${l.cantidad}× ${l.nombre}`);
  try {
    await smtp().sendMail({
      from: { name: SITE.name, address: process.env.SMTP_USER! },
      ...(process.env.SMTP_REPLY_TO ? { replyTo: process.env.SMTP_REPLY_TO } : {}),
      to: e.email,
      subject: t.asunto,
      text: [...t.parrafos, lista.join("\n"), `Ver mi encargo: ${enlace}`].join("\n\n") + `\n\n${SITE.name} · ${SITE.address.street}, ${SITE.address.locality} · ${SITE.phone.display}`,
      html: htmlAvisoCliente(t, lista, enlace, "Ver mi encargo"),
    });
    return true;
  } catch (err) {
    console.error("[encargos] email", tipo, err instanceof Error ? err.message : err);
    return false;
  }
}
