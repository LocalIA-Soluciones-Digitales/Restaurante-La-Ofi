import { describe, expect, it } from "vitest";
import { comandaHTML, cuentaHTML, desgloseIva } from "@/lib/print/ticket";

describe("desglose de IVA", () => {
  it("separa comida (10 %) y alcohol (21 %), excluye invitaciones y reparte el descuento", () => {
    const lineas = [
      { cantidad: 2, nombre: "Tostada", precioUnitarioCentimos: 550, ivaPct: 10 },
      { cantidad: 1, nombre: "Txakoli", precioUnitarioCentimos: 300, ivaPct: 21 },
      { cantidad: 1, nombre: "Café", precioUnitarioCentimos: 150, ivaPct: 10, invitacion: true },
    ];
    const sin = desgloseIva(lineas);
    expect(sin.map((x) => x.tipo)).toEqual([10, 21]);
    expect(sin.reduce((a, x) => a + x.total, 0)).toBe(1400);
    expect(sin[0]!.base + sin[0]!.cuota).toBe(sin[0]!.total);
    const con = desgloseIva(lineas, 140);
    expect(con.reduce((a, x) => a + x.total, 0)).toBe(1260);
  });
});

describe("plantillas", () => {
  it("escapa el HTML de nombres y notas", () => {
    const html = comandaHTML({ destino: "COCINA", numero: 3, etiqueta: "Mesa 4", lineas: [{ cantidad: 1, nombre: "<b>X</b>", notas: "sin <sal>" }] });
    expect(html).toContain("&lt;b&gt;X&lt;/b&gt;");
    expect(html).not.toContain("<b>X</b>");
  });

  it("no imprime un NIF que no esté configurado", () => {
    expect(cuentaHTML({ etiqueta: "Mesa 1", lineas: [] })).not.toContain("NIF");
    expect(cuentaHTML({ etiqueta: "Mesa 1", lineas: [], fiscal: { nif: "B00000000" } })).toContain("NIF: B00000000");
  });
});
