import { describe, expect, it } from "vitest";
import { momentoMenu as momento } from "@/lib/menu-franja";

// Fechas en UTC; Madrid va a UTC+1 en invierno (después del 25/10/2026).
describe("mensaje del menú sin publicar según la hora de Madrid", () => {
  it("antes de las 8:00", () => expect(momento(new Date("2026-11-02T06:30:00Z"))).toBe("antes"));
  it("dentro de la franja", () => expect(momento(new Date("2026-11-02T11:00:00Z"))).toBe("franja"));
  it("a las 16:00 ya ha terminado", () => expect(momento(new Date("2026-11-02T15:00:00Z"))).toBe("despues"));
  it("de noche", () => expect(momento(new Date("2026-11-06T21:30:00Z"))).toBe("despues"));
  it("sábado y domingo", () => {
    expect(momento(new Date("2026-10-31T11:00:00Z"))).toBe("finde");
    expect(momento(new Date("2026-11-01T09:00:00Z"))).toBe("finde");
  });
});
