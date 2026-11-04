import type { ConfigPedidos, Franja } from "@/lib/pedidos/types";

// Horas de recogida de hoy y de los próximos días (laofi_get_config_pedidos.proximas).
// Sin la migración 20261104200000 aplicada no llega «proximas»: entonces solo hoy, como antes.

const ZONA = "Europe/Madrid";
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const FECHA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });
const DIA_LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });

/** «2026-11-05» en Madrid. */
export const fechaMadrid = (d: Date | string) => FECHA.format(new Date(d));
export const horaMadrid = (iso: string) => HORA.format(new Date(iso));

/** Todas las horas que se pueden elegir: hoy y los próximos días (o solo hoy si la base no las da). */
export const franjasDisponibles = (config: ConfigPedidos | null): Franja[] => config?.proximas ?? config?.franjas ?? [];

/** ¿Hay alguna hora libre, hoy o en los próximos días? */
export const hayRecogida = (config: ConfigPedidos | null) => franjasDisponibles(config).some((f) => f.libres > 0);

/** «Hoy», «Mañana» o «Viernes, 6 de noviembre». */
export function nombreDia(iso: string, ahora = new Date()): string {
  const f = fechaMadrid(iso);
  const hoy = fechaMadrid(ahora);
  const manana = fechaMadrid(new Date(new Date(`${hoy}T12:00:00Z`).getTime() + 86_400_000));
  if (f === hoy) return "Hoy";
  if (f === manana) return "Mañana";
  const largo = DIA_LARGO.format(new Date(iso));
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

/** «Hoy a las 20:30», «Mañana a las 12:30», «Viernes, 6 de noviembre a las 12:30». */
export const etiquetaRecogida = (iso: string, ahora = new Date()) => `${nombreDia(iso, ahora)} a las ${horaMadrid(iso)}`;

/** Dentro de una frase: «hoy a las 20:30», «mañana a las 12:30», «el viernes, 6 de noviembre, a las 12:30». */
export function cuandoRecogida(iso: string, ahora = new Date()): string {
  const dia = nombreDia(iso, ahora);
  if (dia === "Hoy" || dia === "Mañana") return `${dia.toLowerCase()} a las ${horaMadrid(iso)}`;
  return `el ${dia.charAt(0).toLowerCase()}${dia.slice(1)}, a las ${horaMadrid(iso)}`;
}

/** Las horas agrupadas por día, en orden. */
export function porDia(franjas: Franja[], ahora = new Date()): { fecha: string; nombre: string; franjas: Franja[] }[] {
  const out: { fecha: string; nombre: string; franjas: Franja[] }[] = [];
  for (const f of franjas) {
    const fecha = fechaMadrid(f.hora);
    const ultimo = out[out.length - 1];
    if (ultimo?.fecha === fecha) ultimo.franjas.push(f);
    else out.push({ fecha, nombre: nombreDia(f.hora, ahora), franjas: [f] });
  }
  return out;
}
