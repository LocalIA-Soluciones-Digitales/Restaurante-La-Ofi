import { describe, expect, it } from "vitest";
import { HORARIO_INTERNET, agruparHorario, estadoAhora, horarioSchemaOrg, resolverHorario, type HorarioDiaBd } from "@/lib/horario";

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

describe("estadoAhora", () => {
  const semana = resolverHorario(null).semana;
  // 2026-10-01 es jueves. Madrid en octubre = UTC+2.
  it("abierto entre semana con la hora de cierre", () => {
    expect(estadoAhora(semana, new Date("2026-10-01T10:00:00Z"))).toEqual({ abierto: true, texto: "Abierto ahora · cierra a las 17:00" });
  });
  it("antes de abrir indica la hora de apertura de hoy", () => {
    expect(estadoAhora(semana, new Date("2026-10-01T04:00:00Z")).texto).toBe("Cerrado · abre hoy a las 7:30");
  });
  it("después de cerrar el jueves abre mañana viernes", () => {
    expect(estadoAhora(semana, new Date("2026-10-01T16:30:00Z")).texto).toBe("Cerrado · abre mañana a las 7:30");
  });
  it("el viernes cierra a medianoche", () => {
    expect(estadoAhora(semana, new Date("2026-10-02T20:00:00Z")).texto).toBe("Abierto ahora · cierra a medianoche");
  });
  it("un día sin dato fiable (sábado) no afirma nada", () => {
    expect(estadoAhora(semana, new Date("2026-10-03T10:00:00Z"))).toEqual({ abierto: null, texto: "Consulta el horario de hoy" });
  });
  it("pasada la medianoche del viernes ya es sábado (dudoso): no afirma nada", () => {
    expect(estadoAhora(semana, new Date("2026-10-02T22:30:00Z")).abierto).toBeNull();
  });
});
