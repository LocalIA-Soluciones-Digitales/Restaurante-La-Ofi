import { describe, expect, it } from "vitest";
import { HORARIO_INTERNET, agruparHorario, horarioSchemaOrg, resolverHorario, type HorarioDiaBd } from "@/lib/horario";

const filas: HorarioDiaBd[] = [
  ...[1, 2, 3, 4].map((dia) => ({ dia, estado: "abierto" as const, desde: "07:30", hasta: "17:00" })),
  { dia: 5, estado: "abierto", desde: "07:30", hasta: "00:00" },
  { dia: 6, estado: "abierto", desde: "11:00", hasta: "00:00" },
  { dia: 7, estado: "cerrado", desde: null, hasta: null },
];

describe("horario", () => {
  it("convierte las filas de laofi.horario en una semana agrupada", () => {
    const r = resolverHorario(filas);
    expect(r.fuente).toBe("supabase");
    expect(agruparHorario(r.semana)).toEqual([
      { dias: "Lunes a jueves", horas: "07:30 – 17:00" },
      { dias: "Viernes", horas: "07:30 – 00:00" },
      { dias: "Sábado", horas: "11:00 – 00:00" },
      { dias: "Domingo", horas: "Cerrado" },
    ]);
  });

  it("los días ausentes o marcados como consultar se muestran como Consultar", () => {
    const r = resolverHorario([{ dia: 1, estado: "consultar", desde: null, hasta: null }]);
    expect(agruparHorario(r.semana)).toEqual([{ dias: "Lunes a domingo", horas: "Consultar" }]);
  });

  it("sin filas en Supabase usa el publicado en internet y deja el sábado como Consultar", () => {
    const r = resolverHorario(null);
    expect(r.fuente).toBe("internet");
    expect(agruparHorario(r.semana)).toEqual([
      { dias: "Lunes a jueves", horas: "07:30 – 17:00" },
      { dias: "Viernes", horas: "07:30 – 00:00" },
      { dias: "Sábado", horas: "Consultar" },
      { dias: "Domingo", horas: "Cerrado" },
    ]);
  });

  it("el JSON-LD omite los días sin dato y los cerrados", () => {
    expect(horarioSchemaOrg(HORARIO_INTERNET).map((d) => d.dayOfWeek)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  });
});
