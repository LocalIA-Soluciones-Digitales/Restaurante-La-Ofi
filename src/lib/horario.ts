import { formatearFechaCorta, hoyEnMadrid } from "@/lib/format";

// Horario de La Ofi. Fuente: tabla laofi.horario (RPC laofi_get_horario),
// editable desde el futuro /admin. Si aún no hay filas, se usa el publicado en
// internet (HORARIO_INTERNET).

export type DiaHorario = { abierto: boolean; desde: string; hasta: string };

/** null = día sin dato fiable (se muestra "Consultar" y no entra en el JSON-LD). */
export type Semana = (DiaHorario | null)[];

/** Fila tal como la devuelve laofi_get_horario (dia 1 = lunes … 7 = domingo). */
export interface HorarioDiaBd {
  dia: number;
  estado: "abierto" | "cerrado" | "consultar";
  desde: string | null;
  hasta: string | null;
}

/**
 * Horario confirmado por el propietario (29/10/2026): lunes a jueves 7:30–16:30,
 * viernes 7:30–00:00 y sábado 11:00–00:00. El domingo no lo indicó: se mantiene
 * cerrado, como en Google. Solo se usa si laofi.horario no tiene filas.
 */
export const HORARIO_INTERNET: Semana = [
  { abierto: true, desde: "07:30", hasta: "16:30" },
  { abierto: true, desde: "07:30", hasta: "16:30" },
  { abierto: true, desde: "07:30", hasta: "16:30" },
  { abierto: true, desde: "07:30", hasta: "16:30" },
  { abierto: true, desde: "07:30", hasta: "00:00" },
  { abierto: true, desde: "11:00", hasta: "00:00" },
  { abierto: false, desde: "00:00", hasta: "00:00" },
];

/** Cierre puntual (festivo, vacaciones) del ajuste «cierres» de /admin/configuracion. */
export interface Cierre {
  /** YYYY-MM-DD, día en Madrid. */
  fecha: string;
  motivo: string | null;
}

export interface HorarioResuelto {
  semana: Semana;
  fuente: "supabase" | "internet";
  /** De hoy en adelante. */
  cierres: Cierre[];
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const DIA_SCHEMA_ORG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Convierte las filas de BD en una semana de lunes a domingo (días ausentes = "Consultar"). */
export function semanaDesdeBd(filas: readonly HorarioDiaBd[]): Semana {
  return DIAS_SEMANA.map((_, i) => {
    const fila = filas.find((f) => f.dia === i + 1);
    if (!fila || fila.estado === "consultar") return null;
    if (fila.estado === "cerrado") return { abierto: false, desde: "00:00", hasta: "00:00" };
    return fila.desde && fila.hasta ? { abierto: true, desde: fila.desde, hasta: fila.hasta } : null;
  });
}

/** Horario de Supabase o, si no hay filas, el publicado en internet. */
export function resolverHorario(filas: readonly HorarioDiaBd[] | null | undefined, cierres: readonly Cierre[] | null = null): HorarioResuelto {
  const c = [...(cierres ?? [])];
  return filas && filas.length > 0
    ? { semana: semanaDesdeBd(filas), fuente: "supabase", cierres: c }
    : { semana: HORARIO_INTERNET, fuente: "internet", cierres: c };
}

/** Agrupa días consecutivos con el mismo horario: "Lunes a jueves: 07:30 – 17:00". */
export function agruparHorario(semana: Semana): { dias: string; horas: string }[] {
  const grupos: { firma: string; desde: number; hasta: number }[] = [];
  semana.forEach((dia, i) => {
    const firma = !dia ? "Consultar" : dia.abierto ? `${dia.desde} – ${dia.hasta}` : "Cerrado";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.firma === firma) ultimo.hasta = i;
    else grupos.push({ firma, desde: i, hasta: i });
  });
  return grupos.map(({ firma, desde, hasta }) => ({
    dias: desde === hasta ? DIAS_SEMANA[desde]! : `${DIAS_SEMANA[desde]} a ${DIAS_SEMANA[hasta]!.toLowerCase()}`,
    horas: firma,
  }));
}

export function horarioSchemaOrg(semana: Semana) {
  return semana
    .map((dia, i) => ({ dia, i }))
    .filter((x): x is { dia: DiaHorario; i: number } => x.dia !== null && x.dia.abierto)
    .map(({ dia, i }) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DIA_SCHEMA_ORG[i],
      opens: dia.desde,
      // schema.org: un cierre a medianoche se escribe 23:59 ("00:00" se lee como cerrado todo el día).
      closes: dia.hasta === "00:00" ? "23:59" : dia.hasta,
    }));
}

/** Cierres puntuales en JSON-LD: abre y cierra a las 00:00 = cerrado ese día. */
export function cierresSchemaOrg(cierres: readonly Cierre[]) {
  return cierres.map((c) => ({
    "@type": "OpeningHoursSpecification",
    validFrom: c.fecha,
    validThrough: c.fecha,
    opens: "00:00",
    closes: "00:00",
  }));
}

/** Fecha en Madrid `dias` días después de hoy (YYYY-MM-DD). */
function fechaMadrid(ahora: Date, dias: number): string {
  const d = new Date(`${hoyEnMadrid(ahora)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const cierreDe = (cierres: readonly Cierre[], fecha: string) => cierres.find((c) => c.fecha === fecha);

// --- Estado en tiempo real ("Abierto ahora · cierra a las 17:00") ------------

/** Día ISO (0 = lunes … 6 = domingo) y minutos desde medianoche en Madrid. */
export function ahoraEnMadrid(ahora: Date = new Date()): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(valor("weekday"));
  return { dia, minutos: Number(valor("hour")) * 60 + Number(valor("minute")) };
}

function aMinutos(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Cierre en minutos; "00:00" (o anterior a la apertura) = medianoche del mismo día. */
function cierreMinutos(dia: DiaHorario): number {
  const hasta = aMinutos(dia.hasta);
  return hasta <= aMinutos(dia.desde) ? 24 * 60 : hasta;
}

const hora = (hhmm: string) => (hhmm === "00:00" ? "medianoche" : `las ${hhmm.replace(/^0/, "")}`);

export interface EstadoAhora {
  /** null = no se sabe (día "Consultar"): no se afirma nada. */
  abierto: boolean | null;
  texto: string;
}

/** Estado del local ahora mismo según el horario resuelto. Nunca inventa: los
 * días sin dato fiable devuelven "Consulta el horario". Los cierres puntuales
 * (festivos) mandan sobre el horario semanal. */
export function estadoAhora(semana: Semana, ahora: Date = new Date(), cierres: readonly Cierre[] = []): EstadoAhora {
  const { dia, minutos } = ahoraEnMadrid(ahora);
  const cierreHoy = cierreDe(cierres, fechaMadrid(ahora, 0));
  const hoy = cierreHoy ? { abierto: false, desde: "00:00", hasta: "00:00" } : semana[dia];
  if (hoy === undefined || hoy === null) return { abierto: null, texto: "Consulta el horario de hoy" };

  if (hoy.abierto) {
    const desde = aMinutos(hoy.desde);
    const hasta = cierreMinutos(hoy);
    if (minutos >= desde && minutos < hasta) return { abierto: true, texto: `Abierto ahora · cierra a ${hora(hoy.hasta)}` };
    if (minutos < desde) return { abierto: false, texto: `Cerrado · abre hoy a ${hora(hoy.desde)}` };
  }

  const cerrado = cierreHoy ? `Cerrado hoy${cierreHoy.motivo ? ` (${cierreHoy.motivo})` : ""}` : "Cerrado";

  // Siguiente apertura conocida en los próximos 14 días (saltando cierres).
  for (let i = 1; i <= 14; i++) {
    if (cierreDe(cierres, fechaMadrid(ahora, i))) continue;
    const d = semana[(dia + i) % 7];
    if (d === null || d === undefined) return { abierto: false, texto: cierreHoy ? cerrado : "Cerrado ahora" };
    if (d.abierto) {
      const corta = formatearFechaCorta(fechaMadrid(ahora, i));
      const cuando =
        i === 1 ? "mañana" : i < 7 ? `el ${["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][(dia + i) % 7]}` : `el ${corta.dia} de ${corta.mes}`;
      return { abierto: false, texto: `${cerrado} · abre ${cuando} a ${hora(d.desde)}` };
    }
  }
  return { abierto: false, texto: cierreHoy ? cerrado : "Cerrado ahora" };
}

/** Horario de hoy en Madrid ("07:30 – 17:00", "Cerrado") o null si no hay dato fiable. */
export function horarioDeHoy(semana: Semana, ahora: Date = new Date(), cierres: readonly Cierre[] = []): string | null {
  if (cierreDe(cierres, fechaMadrid(ahora, 0))) return "Cerrado";
  const hoy = semana[ahoraEnMadrid(ahora).dia];
  if (!hoy) return null;
  return hoy.abierto ? `${hoy.desde} – ${hoy.hasta}` : "Cerrado";
}

// --- Horas reservables (mismas reglas que laofi_crear_reserva) --------------------

const PASO_RESERVA = 15;
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Horas que se pueden pedir en el formulario para una fecha (YYYY-MM-DD), cada 15
 * minutos: desde la apertura hasta media hora antes del cierre y, si es hoy, con 30
 * minutos de antelación. Un día «Consultar» usa el horario más amplio de la semana;
 * un día cerrado o de cierre puntual no tiene horas.
 */
export function horasReservables(semana: Semana, cierres: readonly Cierre[], fecha: string, ahora: Date = new Date()): string[] {
  if (cierreDe(cierres, fecha)) return [];
  const dia = semana[(new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7];
  const abiertos = dia === null || dia === undefined ? semana.filter((d): d is DiaHorario => Boolean(d?.abierto)) : dia.abierto ? [dia] : [];
  if (abiertos.length === 0) return [];

  const desde = Math.min(...abiertos.map((d) => aMinutos(d.desde)));
  const hasta = Math.max(...abiertos.map((d) => (d.hasta === "00:00" ? 23 * 60 + 59 : aMinutos(d.hasta))));
  const minimo = fecha === hoyEnMadrid(ahora) ? ahoraEnMadrid(ahora).minutos + 30 : 0;

  const horas: string[] = [];
  for (let m = desde; m <= hasta - 30; m += PASO_RESERVA) if (m >= minimo) horas.push(aHora(m));
  return horas;
}

/** Primer día (de hoy en adelante) con alguna hora reservable, o null en `maxDias`. */
export function primerDiaReservable(semana: Semana, cierres: readonly Cierre[], ahora: Date = new Date(), maxDias = 60): string | null {
  for (let i = 0; i <= maxDias; i++) {
    const fecha = fechaMadrid(ahora, i);
    if (horasReservables(semana, cierres, fecha, ahora).length > 0) return fecha;
  }
  return null;
}
