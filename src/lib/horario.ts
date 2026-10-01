// Formato de horario compartido con Palomita-Bar: public.settings (key "horario")
// guarda "hjson:" + JSON de 7 días, editable desde /admin/configuracion.
// Si Supabase no tiene horario, se usa el publicado en internet (ver HORARIO_INTERNET).

export type DiaHorario = { abierto: boolean; desde: string; hasta: string };

/** null = día sin dato fiable (se muestra "Consultar" y no entra en el JSON-LD). */
export type Semana = (DiaHorario | null)[];

/**
 * Horario publicado en internet a 2026-10-01: Restaurant Guru (sincronizado con la
 * ficha de Google; coincide con Google Business en el día comprobado, jueves
 * cierre 17:00). El sábado figura como "11:22–00:00", dato claramente erróneo:
 * se deja sin publicar hasta confirmarlo. Ver RESEARCH.md §6.
 */
export const HORARIO_INTERNET: Semana = [
  { abierto: true, desde: "07:30", hasta: "17:00" },
  { abierto: true, desde: "07:30", hasta: "17:00" },
  { abierto: true, desde: "07:30", hasta: "17:00" },
  { abierto: true, desde: "07:30", hasta: "17:00" },
  { abierto: true, desde: "07:30", hasta: "00:00" },
  null,
  { abierto: false, desde: "00:00", hasta: "00:00" },
];

export interface HorarioResuelto {
  semana: Semana;
  fuente: "supabase" | "internet";
}

/** Horario de Supabase (editable desde /admin) o, si no hay, el publicado en internet. */
export function resolverHorario(valorBd: string | null | undefined): HorarioResuelto {
  const bd = parseHorario(valorBd);
  return bd ? { semana: bd, fuente: "supabase" } : { semana: HORARIO_INTERNET, fuente: "internet" };
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

const DIA_SCHEMA_ORG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const MARCA_JSON = "hjson:";
const HHMM = /^\d{2}:\d{2}$/;

function esDiaValido(dia: unknown): dia is DiaHorario {
  if (!dia || typeof dia !== "object") return false;
  const d = dia as Record<string, unknown>;
  return typeof d.abierto === "boolean" && typeof d.desde === "string" && typeof d.hasta === "string" && HHMM.test(d.desde) && HHMM.test(d.hasta);
}

export function parseHorario(valor: string | null | undefined): DiaHorario[] | null {
  if (!valor || !valor.startsWith(MARCA_JSON)) return null;
  try {
    const dias = JSON.parse(valor.slice(MARCA_JSON.length)) as unknown;
    if (!Array.isArray(dias) || dias.length !== 7 || !dias.every(esDiaValido)) return null;
    return dias;
  } catch {
    return null;
  }
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
      closes: dia.hasta,
    }));
}
