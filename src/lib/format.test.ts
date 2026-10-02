import { describe, expect, it } from "vitest";
import { formatCentimos, formatearHoraActualizacion, formatearTelefono, hoyEnMadrid, normalizarTelefono } from "@/lib/format";

describe("format", () => {
  it("formatea céntimos en euros con coma decimal", () => {
    expect(formatCentimos(1250)).toMatch(/^12,50\s€$/);
  });

  it("normaliza y agrupa teléfonos españoles", () => {
    expect(normalizarTelefono("+34 946 36 64 79")).toBe("946366479");
    expect(normalizarTelefono("628409781")).toBe("628409781");
    expect(formatearTelefono("946366479")).toBe("946 36 64 79");
  });

  it("calcula el día civil en Madrid aunque el servidor esté en UTC", () => {
    // 23:30 UTC del 30/09 ya es 1/10 en Madrid (UTC+2 en horario de verano).
    expect(hoyEnMadrid(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
  });
});

describe("formatearHoraActualizacion", () => {
  it("dice 'hoy a las' si es del mismo día en Madrid", () => {
    expect(formatearHoraActualizacion("2026-10-01T08:12:00Z", new Date("2026-10-01T15:00:00Z"))).toBe("hoy a las 10:12");
  });
  it("da la fecha si es de otro día", () => {
    expect(formatearHoraActualizacion("2026-09-30T16:40:00Z", new Date("2026-10-01T09:00:00Z"))).toBe("el 30 sept a las 18:40");
  });
});
