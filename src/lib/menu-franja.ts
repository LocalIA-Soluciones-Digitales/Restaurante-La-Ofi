// Momento del día respecto a la franja del menú del día, en hora de Madrid. Lo usa
// la hoja del menú sin publicar para elegir el mensaje (components/menu/MenuSinPublicar).

export type Momento = "antes" | "franja" | "despues" | "finde";

/** Franja en la que se publica el menú del día (laofi.ajustes 'menu_dia', por defecto 8:00–16:00). */
export const MENU_DESDE = "08:00";
export const MENU_HASTA = "16:00";

/** Día de la semana (1 = lunes … 7 = domingo) y hora «HH:MM» en Madrid. */
export function ahoraEnMadrid(d: Date = new Date()): { dia: number; hora: string } {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(v("weekday")) + 1;
  return { dia, hora: `${v("hour")}:${v("minute")}` };
}

/** El menú es de lunes a viernes, de MENU_DESDE a MENU_HASTA. */
export function momentoMenu(d: Date = new Date()): Momento {
  const { dia, hora } = ahoraEnMadrid(d);
  if (dia >= 6) return "finde";
  if (hora < MENU_DESDE) return "antes";
  return hora < MENU_HASTA ? "franja" : "despues";
}
