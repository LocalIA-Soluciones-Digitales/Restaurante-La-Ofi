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
export function resolverHorario(filas: readonly HorarioDiaBd[] | null | undefined): HorarioResuelto {
  return filas && filas.length > 0
    ? { semana: semanaDesdeBd(filas), fuente: "supabase" }
    : { semana: HORARIO_INTERNET, fuente: "internet" };
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
