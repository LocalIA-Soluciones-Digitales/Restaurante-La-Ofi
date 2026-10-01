import { describe, expect, it } from "vitest";
import { HORARIO_INTERNET, agruparHorario, horarioSchemaOrg, parseHorario, resolverHorario } from "@/lib/horario";

const semana = [
  ...Array.from({ length: 4 }, () => ({ abierto: true, desde: "07:30", hasta: "17:00" })),
  { abierto: true, desde: "07:30", hasta: "23:59" },
  { abierto: true, desde: "11:00", hasta: "23:59" },
  { abierto: false, desde: "00:00", hasta: "00:00" },
];

describe("horario", () => {
  it("lee el formato hjson: de public.settings (compatible con Palomita)", () => {
    expect(parseHorario(`hjson:${JSON.stringify(semana)}`)).toHaveLength(7);
  });

  it("rechaza valores sin marca, incompletos o mal formados", () => {
    expect(parseHorario(null)).toBeNull();
    expect(parseHorario("L-V 9:00-17:00")).toBeNull();
    expect(parseHorario(`hjson:${JSON.stringify(semana.slice(0, 6))}`)).toBeNull();
    expect(parseHorario(`hjson:${JSON.stringify([{ abierto: true, desde: "7", hasta: "17:00" }, ...semana.slice(1)])}`)).toBeNull();
  });

  it("agrupa días consecutivos con el mismo horario", () => {
    expect(agruparHorario(semana)).toEqual([
      { dias: "Lunes a jueves", horas: "07:30 – 17:00" },
      { dias: "Viernes", horas: "07:30 – 23:59" },
      { dias: "Sábado", horas: "11:00 – 23:59" },
      { dias: "Domingo", horas: "Cerrado" },
    ]);
  });

  it("sin horario en Supabase usa el publicado en internet y deja el sábado como Consultar", () => {
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
