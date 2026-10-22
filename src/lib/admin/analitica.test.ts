import { describe, expect, it } from "vitest";
import { abc, estadisticas, prever, proyeccionMes, serieDiaria, sumarDias, tendencia, variacion, type PuntoDia } from "./analitica";

const historia = (dias: number, hasta: string, valor: (f: string, i: number) => number): PuntoDia[] =>
  Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(hasta, i - dias + 1);
    return { fecha, ventas: valor(fecha, i), pedidos: 1 };
  });

describe("analítica de ventas", () => {
  it("rellena con ceros los días sin ventas", () => {
    const s = serieDiaria([{ fecha: "2026-10-02", ventas_centimos: 500, pedidos: 2 }], "2026-10-01", "2026-10-03");
    expect(s.map((p) => p.ventas)).toEqual([0, 500, 0]);
  });

  it("variación sin base es null", () => {
    expect(variacion(100, 0)).toBeNull();
    expect(variacion(150, 100)).toBeCloseTo(0.5);
  });

  it("estadística descriptiva", () => {
    const e = estadisticas([1, 2, 3, 4]);
    expect(e.media).toBe(2.5);
    expect(e.mediana).toBe(2.5);
    expect(e.max).toBe(4);
  });

  it("tendencia lineal perfecta", () => {
    const t = tendencia([10, 20, 30, 40]);
    expect(t.pendiente).toBeCloseTo(10);
    expect(t.r2).toBeCloseTo(1);
  });

  it("prevé por día de la semana y deja a 0 el día de cierre", () => {
    // Lunes cerrado (0), sábados 300 €, resto 100 €.
    const h = historia(56, "2026-10-21", (f) => {
      const d = new Date(`${f}T12:00:00Z`).getUTCDay();
      return d === 1 ? 0 : d === 6 ? 30000 : 10000;
    });
    const [sab, lun, mar] = prever(h, ["2026-10-24", "2026-10-26", "2026-10-27"]);
    expect(sab?.esperado).toBe(30000);
    expect(lun?.esperado).toBe(0);
    expect(mar?.esperado).toBe(10000);
  });

  it("ABC: los primeros productos hasta el 80 % son A", () => {
    const r = abc([
      { nombre: "x", cantidad: 1, importe_centimos: 800 },
      { nombre: "y", cantidad: 1, importe_centimos: 150 },
      { nombre: "z", cantidad: 1, importe_centimos: 50 },
    ]);
    expect(r.map((p) => p.clase)).toEqual(["A", "B", "C"]);
  });

  it("proyecta el cierre de mes", () => {
    const h = historia(60, "2026-10-22", () => 1000);
    const p = proyeccionMes(h, "2026-10-22");
    expect(p.llevado).toBe(22 * 1000);
    expect(p.diasRestantes).toBe(9);
    expect(p.total).toBe(31 * 1000);
  });
});
