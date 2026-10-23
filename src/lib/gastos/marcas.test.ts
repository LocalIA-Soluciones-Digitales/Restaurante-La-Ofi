import { describe, expect, it } from "vitest";
import { calcularMarcas, type TipoMarca } from "./marcas";
import { leerGasto, type OcrCaja } from "./ocr";

// Mismo truco que en ocr.test: cada trozo separado por 2+ espacios es una
// caja, a 10 px por carácter y 30 px por fila.
function doc(renglones: string[]): OcrCaja[] {
  const cajas: OcrCaja[] = [];
  renglones.forEach((r, fila) => {
    for (const m of r.matchAll(/\S+(?: \S+)*/g)) cajas.push({ text: m[0], x: m.index! * 10, y: fila * 30, width: m[0].length * 10, height: 20 });
  });
  return cajas;
}

const ALBARAN = [
  "ALBARÁN",
  "Electricidad - Fontaneria Tosma S.L.",
  "Avd. La cruz roja, 17 (45001) Toledo   B10047855",
  "Nº Albarán     Fecha Albarán",
  "A / 129        28-04-2023",
  "Cod.   Concepto                                 Ud.     Precio    Dto   Importe",
  "000113   Válvula antirretorno doble clapeta 2 DN50   20.00   48,83          976,60",
  "77       Membrana flujostato válvula 5 vías         12.00   25,00    5     285,00",
  "000107   Aro cera para inodoros                     21.00   6,75           141,75",
  "B. Imponible    IVA                        Total Albarán",
  "1.403,35 €   (21.00%)   294,70 €          1.698,05 €",
];

function porTipo(renglones: string[]) {
  const c = doc(renglones);
  const leido = leerGasto(c);
  const { m } = calcularMarcas(c, leido, 1000, renglones.length * 30);
  const r: Partial<Record<TipoMarca, number>> = {};
  for (const [k] of m) r[k] = (r[k] ?? 0) + 1;
  return { r, m, leido, cajas: c };
}

describe("calcularMarcas", () => {
  it("colorea proveedor, CIF, fecha, número, líneas, IVA y total", () => {
    const { r, leido, cajas } = porTipo(ALBARAN);
    expect(leido.lineas).toHaveLength(3);
    expect(leido.numero).toBe("A / 129");
    expect(r.proveedor).toBeGreaterThanOrEqual(3);
    expect(r.cif).toBe(1);
    expect(r.fecha).toBe(1);
    expect(r.numero).toBeGreaterThanOrEqual(1);
    expect(r.importe).toBe(3);
    expect(r.cantidad).toBe(3);
    // La membrana lleva un 5 % de descuento: el precio neto (23,75) no está escrito.
    expect(r.precio).toBe(2);
    expect(r.producto).toBeGreaterThanOrEqual(3);
    expect(r.iva).toBe(2);
    expect(r.total).toBe(1);
    expect(r.texto).toBe(cajas.length);
  });

  it("posiciones en milésimas de la imagen", () => {
    const { m } = porTipo(ALBARAN);
    for (const [, x, y, w, h] of m) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(1001);
      expect(y + h).toBeLessThanOrEqual(1001);
    }
  });
});
