import { formatearFechaLarga } from "@/lib/format";

// Lo que se le dice al cliente sobre su reserva, igual por WhatsApp (panel, con un
// toque) que por email (automático). Sin dependencias de servidor: lo usa el panel.

/** «presupuesto»: el mensaje con el que el local responde a una petición de presupuesto (solo WhatsApp/email a mano). */
export type AvisoReserva = "recibida" | "confirmada" | "cancelada" | "presupuesto";

export interface ReservaAvisable {
  id: string;
  nombre: string;
  fecha: string;
  hora: string;
  personas: number;
  espacio: "mesa" | "despacho" | "evento" | "presupuesto" | "recogida";
  /** Título del evento, si es un evento. */
  evento?: string | null;
}

/** Enlace para que el cliente vea (y cancele) su reserva. */
export const enlaceReserva = (siteUrl: string, id: string) => `${siteUrl.replace(/\/+$/, "")}/es/reserva/${id}`;

/** Nombre de pila, para el saludo. */
const pila = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? "";

/** «el sábado, 31 de octubre, a las 14:45». */
export const cuando = (r: Pick<ReservaAvisable, "fecha" | "hora">) => `el ${formatearFechaLarga(r.fecha)}, a las ${r.hora.slice(0, 5)}`;

/** «tu mesa para 2 en el comedor», «tus 3 menús para recoger», «tu plaza en Vermuteo»… */
export function queReserva(r: ReservaAvisable): string {
  const n = r.personas;
  switch (r.espacio) {
    case "recogida":
      return n === 1 ? "tu menú para recoger" : `tus ${n} menús para recoger`;
    case "evento":
      return `${n === 1 ? "tu plaza" : `vuestras ${n} plazas`} para «${r.evento ?? "el evento"}»`;
    case "despacho":
      return `tu reserva en El Despacho para ${n} ${n === 1 ? "persona" : "personas"}`;
    case "presupuesto":
      return `tu comida de grupo para ${n} personas`;
    default:
      return `tu mesa para ${n} ${n === 1 ? "persona" : "personas"}`;
  }
}

/** Asunto del email. */
export function asunto(tipo: AvisoReserva, r: ReservaAvisable): string {
  const dia = `${formatearFechaLarga(r.fecha)}, ${r.hora.slice(0, 5)}`;
  if (tipo === "recibida") return `Hemos recibido tu solicitud · La Ofi, ${dia}`;
  if (tipo === "confirmada") return `Reserva confirmada · La Ofi, ${dia}`;
  if (tipo === "presupuesto") return `Tu presupuesto · La Ofi, ${dia}`;
  return `Reserva cancelada · La Ofi, ${dia}`;
}

/** Los párrafos del aviso (el email los envuelve en su plantilla; WhatsApp los une con saltos de línea). */
export function parrafos(tipo: AvisoReserva, r: ReservaAvisable, enlace: string, telefono: string): string[] {
  const hola = `¡Hola, ${pila(r.nombre)}!`;
  const que = queReserva(r);
  if (tipo === "presupuesto") {
    // La propuesta la completa el local antes de enviarla: van los huecos a rellenar.
    return [
      hola,
      `Te escribimos de La Ofi por el presupuesto que nos pediste: ${que} ${cuando(r)}.`,
      "Te proponemos:\n• Menú: \n• Precio por persona: ",
      `¿Qué te parece? Si os encaja, lo dejamos reservado. Para cualquier duda, llámanos al ${telefono}.`,
    ];
  }
  if (tipo === "recibida" && r.espacio === "presupuesto") {
    return [hola, `Hemos recibido tu petición de presupuesto para ${r.personas} personas ${cuando(r)} en La Ofi. En breve te escribimos o te llamamos con la propuesta.`];
  }
  if (tipo === "recibida") {
    return [
      hola,
      `Hemos recibido ${que} ${cuando(r)} en La Ofi. Todavía no está confirmada: te avisamos en cuanto la confirmemos.`,
      `Puedes ver cómo va en ${enlace}`,
    ];
  }
  if (tipo === "confirmada") {
    return [
      hola,
      `${que.charAt(0).toUpperCase()}${que.slice(1)} ${cuando(r)} en La Ofi está confirmada. ¡Te esperamos!`,
      `Si al final no podéis venir, cancélala aquí: ${enlace} o llámanos al ${telefono}.`,
    ];
  }
  return [
    hola,
    `Sentimos decirte que hemos tenido que cancelar ${que} ${cuando(r)} en La Ofi.`,
    `Llámanos al ${telefono} y te buscamos otro hueco.`,
  ];
}

/** El texto entero, para WhatsApp o SMS. */
export const textoAviso = (tipo: AvisoReserva, r: ReservaAvisable, enlace: string, telefono: string) =>
  parrafos(tipo, r, enlace, telefono).join("\n\n");

/** Teléfono para wa.me: con prefijo de país (34 si es un número español de 9 cifras). */
export function telefonoInternacional(telefono: string): string {
  const t = telefono.trim();
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) return d;
  if (d.startsWith("00")) return d.slice(2);
  return d.length === 9 ? `34${d}` : d;
}

export const enlaceWhatsApp = (telefono: string, texto: string) => `https://wa.me/${telefonoInternacional(telefono)}?text=${encodeURIComponent(texto)}`;

/** SMS: «?&body=» funciona en iPhone y en Android. */
export const enlaceSms = (telefono: string, texto: string) => `sms:${telefono.replace(/\s/g, "")}?&body=${encodeURIComponent(texto)}`;
