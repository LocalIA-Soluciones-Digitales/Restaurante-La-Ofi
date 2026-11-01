import { describe, expect, it } from "vitest";
import { enlaceWhatsApp, telefonoInternacional, textoAviso, type ReservaAvisable } from "./mensajes";

const r: ReservaAvisable = { id: "abc", nombre: "Natalia Pérez", fecha: "2026-10-31", hora: "14:45", personas: 2, espacio: "mesa" };

describe("avisos de la reserva", () => {
  it("confirmada: saludo con el nombre de pila, qué, cuándo y el enlace para cancelar", () => {
    const t = textoAviso("confirmada", r, "https://laofi.es/es/reserva/abc", "946 36 64 79");
    expect(t).toMatch(/^¡Hola, Natalia!/);
    expect(t).toContain("Tu mesa para 2 personas el sábado, 31 de octubre, a las 14:45 en La Ofi está confirmada");
    expect(t).toContain("https://laofi.es/es/reserva/abc");
  });

  it("cada tipo dice lo suyo", () => {
    expect(textoAviso("confirmada", { ...r, espacio: "recogida", personas: 3 }, "x", "y")).toContain("Tus 3 menús para recoger");
    expect(textoAviso("confirmada", { ...r, espacio: "evento", evento: "Vermuteo" }, "x", "y")).toContain("Vuestras 2 plazas para «Vermuteo»");
    expect(textoAviso("cancelada", r, "x", "946")).toContain("hemos tenido que cancelar tu mesa");
    expect(textoAviso("recibida", r, "x", "y")).toContain("Todavía no está confirmada");
  });

  it("WhatsApp con prefijo de país", () => {
    expect(telefonoInternacional("656 66 26 95")).toBe("34656662695");
    expect(telefonoInternacional("+33 6 12 34 56 78")).toBe("33612345678");
    expect(telefonoInternacional("0044 7700 900123")).toBe("447700900123");
    expect(enlaceWhatsApp("656662695", "Hola y adiós")).toBe("https://wa.me/34656662695?text=Hola%20y%20adi%C3%B3s");
  });
});
