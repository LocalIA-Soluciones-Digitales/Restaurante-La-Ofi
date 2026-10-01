import { describe, expect, it } from "vitest";
import { ALERGENOS, normalizarAlergeno, normalizarAlergenos } from "@/lib/allergens";

describe("alérgenos", () => {
  it("define exactamente los 14 alérgenos del Reglamento UE 1169/2011", () => {
    expect(ALERGENOS).toHaveLength(14);
    expect(new Set(ALERGENOS.map((a) => a.key)).size).toBe(14);
  });

  it("acepta los valores que ya existen en el schema compartido", () => {
    for (const valor of ["crustáceos", "frutos de cáscara", "gluten", "huevo", "lácteos", "moluscos", "pescado", "sésamo", "soja"]) {
      expect(normalizarAlergeno(valor)).not.toBeNull();
    }
  });

  it("normaliza sinónimos, mayúsculas y acentos", () => {
    expect(normalizarAlergeno("Leche")).toBe("lacteos");
    expect(normalizarAlergeno("  FRUTOS SECOS ")).toBe("frutos_cascara");
    expect(normalizarAlergeno("Dióxido de azufre y sulfitos")).toBe("sulfitos");
  });

  it("descarta valores desconocidos, deduplica y ordena según el anexo II", () => {
    expect(normalizarAlergenos(["sésamo", "gluten", "Gluten", "picante"])).toEqual(["gluten", "sesamo"]);
  });
});
