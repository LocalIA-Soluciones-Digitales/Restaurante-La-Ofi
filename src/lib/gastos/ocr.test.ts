import { describe, expect, it } from "vitest";
import { aNumero, adivinarCategoria, leerCifs, leerGasto, leerIva, lineaDeNumeros, limpiarNombre, type OcrCaja, type ProveedorMemoria } from "./ocr";

/**
 * Documento simulado: cada renglón se parte en trozos separados por 2+ espacios
 * (como los devuelve el OCR por cajas), con su posición por columnas.
 */
function doc(renglones: string[]): OcrCaja[] {
  const cajas: OcrCaja[] = [];
  renglones.forEach((r, fila) => {
    for (const m of r.matchAll(/\S+(?: \S+)*/g)) cajas.push({ text: m[0], x: m.index! * 10, y: fila * 30, width: m[0].length * 10, height: 20 });
  });
  return cajas;
}

const PROPIOS = { nombres: ["Restaurante La Ofi", "La Ofi"], cif: "B95000000" };

describe("números y piezas", () => {
  it("lee números con miles y decimales", () => {
    expect(aNumero("1.520,62")).toBe(1520.62);
    expect(aNumero("11,600")).toBe(11.6);
    expect(aNumero("-14,50")).toBe(-14.5);
    expect(aNumero("31'94")).toBe(31.94);
  });

  it("cuadra líneas con descuento y columnas extra", () => {
    expect(lineaDeNumeros("x", [2, 6.5, 13])).toMatchObject({ cantidad: 2, precio: 6.5, estado: "ok" });
    expect(lineaDeNumeros("x", [10, 1.2, 5, 11.4])).toMatchObject({ cantidad: 10, precio: 1.2, importe: 11.4, estado: "ok" });
    expect(lineaDeNumeros("x", [3, 4.1, 12.4])).toMatchObject({ precio: 4.1333, estado: "corregida" });
  });

  it("limpia códigos y lotes del nombre", () => {
    expect(limpiarNombre("0041 HARINA TRIGO 25KG L2026091")).toBe("HARINA TRIGO 25KG");
    expect(limpiarNombre("ACEITE OLIVA 5L 12")).toBe("ACEITE OLIVA 5L");
  });

  it("encuentra CIF aunque vengan con puntos o guiones", () => {
    expect(leerCifs(["CIF: B-95.719.746", "NIF 12345678Z"])).toEqual(["B95719746", "12345678Z"]);
  });

  it("lee el desglose de IVA", () => {
    expect(leerIva(["BASE  IVA %  CUOTA", "100,00  10,00%  10,00", "50,00  21%  10,50"])).toEqual([
      { tipo: 21, base: 50, cuota: 10.5 },
      { tipo: 10, base: 100, cuota: 10 },
    ]);
  });

  it("adivina la categoría por palabras", () => {
    expect(adivinarCategoria("Iberdrola Clientes")).toBe("suministros");
    expect(adivinarCategoria("Bodegas Txakoli Gorka")).toBe("bebida");
    expect(adivinarCategoria("Frutas y Verduras Txomin")).toBe("comida");
    expect(adivinarCategoria("Nada que ver")).toBeNull();
  });
});

describe("leerGasto", () => {
  it("albarán con cantidades enteras", () => {
    const r = leerGasto(
      doc([
        "DISTRIBUCIONES BEBIDAS ARRIGORRIAGA S.L.",
        "CIF: B48123456",
        "Cliente: RESTAURANTE LA OFI   B95000000",
        "ALBARÁN Nº 2026/1543        Fecha: 14/10/2026",
        "CÓDIGO  DESCRIPCIÓN                 CANT.   PRECIO    IMPORTE",
        "1001    COCA COLA 35CL CAJA 24      6       12,50     75,00",
        "1002    AGUA MINERAL 1,5L PACK      4       3,20      12,80",
        "BASE IMPONIBLE  87,80",
        "IVA 10%  87,80  8,78",
        "TOTAL  96,58",
      ]),
      { propios: PROPIOS },
    );
    expect(r).toMatchObject({
      tipo: "albaran",
      proveedor: "DISTRIBUCIONES BEBIDAS ARRIGORRIAGA S.L.",
      cif: "B48123456",
      fecha: "2026-10-14",
      numero: "2026/1543",
      total: 96.58,
      categoria: "bebida",
      iva: [{ tipo: 10, base: 87.8, cuota: 8.78 }],
    });
    expect(r.lineas).toEqual([
      { texto: "COCA COLA 35CL CAJA", cantidad: 6, precio: 12.5, importe: 75, estado: "ok" },
      { texto: "AGUA MINERAL 1,5L PACK", cantidad: 4, precio: 3.2, importe: 12.8, estado: "ok" },
    ]);
  });

  it("ticket de supermercado sin IVA desglosado", () => {
    const r = leerGasto(
      doc([
        "EROSKI CITY",
        "FACTURA SIMPLIFICADA  T-0045-88123",
        "17/10/2026 10:32",
        "LEJIA 2L               1,85",
        "BAYETAS PACK 3         2,40",
        "TOTAL                  4,25",
        "TARJETA                4,25",
      ]),
    );
    expect(r).toMatchObject({ tipo: "ticket", fecha: "2026-10-17", total: 4.25, categoria: "limpieza", numero: "T-0045-88123" });
  });

  it("reconoce al proveedor por la memoria aunque el nombre salga mal", () => {
    const memoria: ProveedorMemoria[] = [{ id: "p1", nombre: "Carnicería Zubiaur", cif: "B48999999", pistas: ["carniceria zubiaur"], categoria: "comida" }];
    const r = leerGasto(doc(["CARN1CERIA ZUBIAUR", "N.I.F. B48999999", "FACTURA 778  03/10/2026", "TOTAL 120,00"]), { memoria });
    expect(r).toMatchObject({ proveedor: "Carnicería Zubiaur", proveedorId: "p1", categoria: "comida", numero: "778", total: 120 });
  });

  it("conserva las filas cuyo nombre no ha leído el OCR si cantidad × precio cuadra", () => {
    const r = leerGasto(doc(["FACTURA 9", "DESCRIPCIÓN  CANT.  PRECIO  IMPORTE", "                   6  12,50  75,00", "VINO RIOJA         4  3,20  12,80", "TOTAL 87,80"]));
    expect(r.lineas).toEqual([
      { texto: "", cantidad: 6, precio: 12.5, importe: 75, estado: "ok" },
      { texto: "VINO RIOJA", cantidad: 4, precio: 3.2, importe: 12.8, estado: "ok" },
    ]);
  });

  it("deduce el precio si solo se leyeron la cantidad y el importe", () => {
    const r = leerGasto(doc(["FACTURA 9", "DESCRIPCIÓN  CANT.  PRECIO  IMPORTE", "CERVEZA BARRIL 30L  2         178,00", "TOTAL 178,00"]));
    expect(r.lineas).toEqual([{ texto: "CERVEZA BARRIL 30L", cantidad: 2, precio: 89, importe: 178, estado: "corregida" }]);
  });

  it("no toma al restaurante como proveedor", () => {
    const r = leerGasto(doc(["RESTAURANTE LA OFI S.L.", "Pescados Mendiola S.L.", "FACTURA 55", "TOTAL 10,00"]), { propios: PROPIOS });
    expect(r.proveedor).toBe("Pescados Mendiola S.L.");
  });
});
