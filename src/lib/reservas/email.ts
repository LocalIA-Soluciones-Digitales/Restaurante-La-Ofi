import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL } from "@/lib/env";
import { asunto, enlaceReserva, parrafos, type AvisoReserva, type ReservaAvisable } from "@/lib/reservas/mensajes";
import { SITE } from "@/lib/site";

// Emails al cliente sobre su reserva (recibida, confirmada, cancelada por el local).
// Por SMTP: con Gmail basta la cuenta (SMTP_USER=laofiparke@gmail.com) y una
// «contraseña de aplicación» (SMTP_PASS), sin dominio propio. Sin SMTP_USER/SMTP_PASS
// no se envía nada y todo sigue igual (WhatsApp desde el panel).

export const emailActivo = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporte: Transporter | null = null;
export function smtp() {
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporte;
}

export const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Los enlaces del texto, clicables. */
const conEnlaces = (s: string) => escapar(s).replace(/https?:\/\/\S+?(?=[.,]?(\s|$))/g, (u) => `<a href="${u}" style="color:#1E3557">${u}</a>`);

/** HTML sencillo con tablas y estilos en línea: es lo que respetan Gmail, Outlook y el móvil. */
export function htmlAviso(tipo: AvisoReserva, r: ReservaAvisable, enlace: string): string {
  const [hola, ...resto] = parrafos(tipo, r, enlace, SITE.phone.display);
  const color = tipo === "confirmada" ? "#4E6B3A" : tipo === "cancelada" ? "#96442B" : "#1E3557";
  const sello = tipo === "confirmada" ? "Confirmada" : tipo === "cancelada" ? "Cancelada" : "Por confirmar";
  const boton =
    tipo === "cancelada"
      ? { href: SITE.phone.href, texto: `Llamar al ${SITE.phone.display}` }
      : { href: enlace, texto: tipo === "confirmada" ? "Ver o cancelar mi reserva" : "Ver mi reserva" };
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F1E8D8;font-family:Helvetica,Arial,sans-serif;color:#2B2722">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1E8D8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border-radius:20px;overflow:hidden">
<tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:26px">La Ofi</td></tr>
<tr><td style="padding:0 28px"><span style="display:inline-block;background:${color};color:#fffdf8;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:bold">${sello}</span></td></tr>
<tr><td style="padding:20px 28px 0;font-size:18px;font-weight:bold">${escapar(hola ?? "")}</td></tr>
${resto.map((p) => `<tr><td style="padding:12px 28px 0;font-size:16px;line-height:1.5">${conEnlaces(p)}</td></tr>`).join("")}
<tr><td style="padding:24px 28px"><a href="${boton.href}" style="display:inline-block;background:#1E3557;color:#fffdf8;text-decoration:none;border-radius:12px;padding:12px 20px;font-weight:bold">${boton.texto}</a></td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #E6D8BF;font-size:13px;color:#5E554B;line-height:1.5">
${SITE.name} · ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.locality}<br>${SITE.address.context} · ${SITE.phone.display}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Evento de calendario (.ics) con la hora de Madrid, para «Añadir al calendario». */
function calendario(r: ReservaAvisable, enlace: string, duracionMin = 90): string {
  const local = (d: Date) => d.toISOString().slice(0, 16).replace(/[-:]/g, "") + "00";
  const inicio = new Date(`${r.fecha}T${r.hora.slice(0, 5)}:00Z`);
  const fin = new Date(inicio.getTime() + duracionMin * 60_000);
  const sello = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lugar = `${SITE.name}, ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.locality}`.replace(/,/g, "\\,");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Ofi//Reservas//ES",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@laofi`,
    `DTSTAMP:${sello}`,
    `DTSTART;TZID=Europe/Madrid:${local(inicio)}`,
    `DTEND;TZID=Europe/Madrid:${local(fin)}`,
    `SUMMARY:${r.espacio === "evento" && r.evento ? r.evento.replace(/,/g, "\\,") : "Reserva en La Ofi"} (${r.personas} p.)`,
    `LOCATION:${lugar}`,
    `URL:${enlace}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Manda el aviso al email del cliente. Nunca lanza: si el SMTP falla, la reserva ya
 * está hecha y el local tiene el WhatsApp a mano. Devuelve si se ha enviado.
 */
export async function enviarAvisoReserva(tipo: AvisoReserva, r: ReservaAvisable, email: string | null | undefined): Promise<boolean> {
  if (!email || !emailActivo()) return false;
  const enlace = enlaceReserva(SITE_URL, r.id);
  try {
    await smtp().sendMail({
      from: { name: SITE.name, address: process.env.SMTP_USER! },
      // Si el cliente contesta, que le llegue al correo que mira el local (no a la cuenta de envío).
      ...(process.env.SMTP_REPLY_TO ? { replyTo: process.env.SMTP_REPLY_TO } : {}),
      to: email,
      subject: asunto(tipo, r),
      text: parrafos(tipo, r, enlace, SITE.phone.display).join("\n\n") + `\n\n${SITE.name} · ${SITE.address.street}, ${SITE.address.locality} · ${SITE.phone.display}`,
      html: htmlAviso(tipo, r, enlace),
      ...(tipo === "confirmada" && r.espacio !== "recogida"
        ? { icalEvent: { filename: "reserva-la-ofi.ics", method: "PUBLISH", content: calendario(r, enlace) } }
        : {}),
    });
    return true;
  } catch (e) {
    console.error("[reservas] email", tipo, e instanceof Error ? e.message : e);
    return false;
  }
}
