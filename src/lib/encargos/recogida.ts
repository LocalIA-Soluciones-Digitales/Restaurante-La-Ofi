// Cómo se dice el día y la hora a la que pasan a recoger un encargo de vino
// (laofi.encargos_vino.recogida_en, desde la migración 20261105300000).

const ZONA = "Europe/Madrid";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA });
const LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });

const diaDe = (d: Date) => DIA.format(d);
const manana = (ahora: Date) => diaDe(new Date(ahora.getTime() + 86_400_000));

/** ¿La recogida es hoy (en Madrid)? */
export const recogeHoy = (iso: string, ahora = new Date()) => diaDe(new Date(iso)) === diaDe(ahora);

/** «Hoy · 18:30», «Mañana · 12:00», «Vie 6 nov · 18:30»: para el panel. */
export function recogidaCorta(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  const dia = diaDe(d) === diaDe(ahora) ? "Hoy" : diaDe(d) === manana(ahora) ? "Mañana" : CORTO.format(d).replace(/\./g, "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${HORA.format(d)}`;
}

/** «hoy a las 18:30», «mañana a las 12:00», «el viernes, 6 de noviembre, a las 18:30»: dentro de una frase. */
export function recogidaEnFrase(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  if (diaDe(d) === diaDe(ahora)) return `hoy a las ${HORA.format(d)}`;
  if (diaDe(d) === manana(ahora)) return `mañana a las ${HORA.format(d)}`;
  return `el ${LARGO.format(d)}, a las ${HORA.format(d)}`;
}
