import { describe, expect, it } from "vitest";
import { HORARIO_INTERNET, agruparHorario, cierresSchemaOrg, estadoAhora, horasReservables, primerDiaReservable, horarioDeHoy, horarioSchemaOrg, resolverHorario, type HorarioDiaBd } from "@/lib/horario";

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

  it("sin filas en Supabase usa el horario confirmado por el propietario", () => {
    const r = resolverHorario(null);
    expect(r.fuente).toBe("internet");
    expect(agruparHorario(r.semana)).toEqual([
      { dias: "Lunes a jueves", horas: "07:30 – 16:30" },
      { dias: "Viernes", horas: "07:30 – 00:00" },
      { dias: "Sábado", horas: "11:00 – 00:00" },
      { dias: "Domingo", horas: "Cerrado" },
    ]);
  });

  it("el JSON-LD omite los días sin dato y los cerrados", () => {
    expect(horarioSchemaOrg(HORARIO_INTERNET).map((d) => d.dayOfWeek)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  });
});

describe("estadoAhora", () => {
  const semana = resolverHorario(null).semana;
  // 2026-10-01 es jueves. Madrid en octubre = UTC+2.
  it("abierto entre semana con la hora de cierre", () => {
    expect(estadoAhora(semana, new Date("2026-10-01T10:00:00Z"))).toEqual({ abierto: true, texto: "Abierto ahora · cierra a las 16:30" });
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
  it("un día sin dato fiable no afirma nada", () => {
    const sinSabado = semana.map((d, i) => (i === 5 ? null : d));
    expect(estadoAhora(sinSabado, new Date("2026-10-03T10:00:00Z"))).toEqual({ abierto: null, texto: "Consulta el horario de hoy" });
  });
  it("pasada la medianoche del viernes ya es sábado: cerrado hasta las 11:00", () => {
    expect(estadoAhora(semana, new Date("2026-10-02T22:30:00Z"))).toEqual({ abierto: false, texto: "Cerrado · abre hoy a las 11:00" });
  });

  it("da el horario de hoy en Madrid y no inventa los días sin dato", () => {
    // 2026-10-02 es viernes; 2026-10-03, sábado; 2026-10-04, domingo.
    expect(horarioDeHoy(HORARIO_INTERNET, new Date("2026-10-02T10:00:00+02:00"))).toBe("07:30 – 00:00");
    expect(horarioDeHoy(HORARIO_INTERNET, new Date("2026-10-03T10:00:00+02:00"))).toBe("11:00 – 00:00");
    expect(horarioDeHoy(HORARIO_INTERNET, new Date("2026-10-04T10:00:00+02:00"))).toBe("Cerrado");
  });
});

describe("cierres puntuales", () => {
  const semana = resolverHorario(null).semana;
  // 2026-12-08 es martes (Inmaculada); en diciembre Madrid = UTC+1.
  const festivo = [{ fecha: "2026-12-08", motivo: "Festivo" }];

  it("un festivo entre semana sale cerrado y anuncia la siguiente apertura", () => {
    expect(estadoAhora(semana, new Date("2026-12-08T11:00:00Z"), festivo)).toEqual({ abierto: false, texto: "Cerrado hoy (Festivo) · abre mañana a las 7:30" });
    expect(horarioDeHoy(semana, new Date("2026-12-08T11:00:00Z"), festivo)).toBe("Cerrado");
  });

  it("la víspera del festivo salta al día siguiente abierto", () => {
    expect(estadoAhora(semana, new Date("2026-12-07T17:00:00Z"), festivo).texto).toBe("Cerrado · abre el miércoles a las 7:30");
  });

  it("sin cierres el martes 8 abriría con normalidad", () => {
    expect(estadoAhora(semana, new Date("2026-12-08T11:00:00Z")).abierto).toBe(true);
  });

  it("el JSON-LD escribe la medianoche como 23:59 y los cierres como días cerrados", () => {
    expect(horarioSchemaOrg(HORARIO_INTERNET).find((d) => d.dayOfWeek === "Friday")?.closes).toBe("23:59");
    expect(cierresSchemaOrg(festivo)).toEqual([
      { "@type": "OpeningHoursSpecification", validFrom: "2026-12-08", validThrough: "2026-12-08", opens: "00:00", closes: "00:00" },
    ]);
  });
});

describe("horas reservables", () => {
  const semana = resolverHorario(null).semana;

  it("van de la apertura a media hora antes del cierre, cada 15 minutos", () => {
    // 2026-10-29 es jueves (07:30 – 16:30); se consulta el día anterior.
    const horas = horasReservables(semana, [], "2026-10-29", new Date("2026-10-28T10:00:00Z"));
    expect(horas[0]).toBe("07:30");
    expect(horas.at(-1)).toBe("16:00");
    expect(horas).toContain("14:00");
  });

  it("hoy, con media hora de antelación", () => {
    // Jueves 2026-10-29 a las 13:50 en Madrid (UTC+1).
    expect(horasReservables(semana, [], "2026-10-29", new Date("2026-10-29T12:50:00Z"))[0]).toBe("14:30");
  });

  it("domingo y cierres puntuales no tienen horas; el sábado, de 11:00 a medianoche", () => {
    expect(horasReservables(semana, [], "2026-11-01", new Date("2026-10-28T10:00:00Z"))).toEqual([]);
    expect(horasReservables(semana, [{ fecha: "2026-10-29", motivo: null }], "2026-10-29", new Date("2026-10-28T10:00:00Z"))).toEqual([]);
    const sabado = horasReservables(semana, [], "2026-10-31", new Date("2026-10-28T10:00:00Z"));
    expect([sabado[0], sabado.at(-1)]).toEqual(["11:00", "23:15"]);
  });

  it("«Reservar para hoy» a las 20:55 de un miércoles salta al jueves", () => {
    expect(primerDiaReservable(semana, [], new Date("2026-10-28T19:55:00Z"))).toBe("2026-10-29");
    expect(primerDiaReservable(semana, [{ fecha: "2026-10-29", motivo: null }], new Date("2026-10-28T19:55:00Z"))).toBe("2026-10-30");
  });
});
