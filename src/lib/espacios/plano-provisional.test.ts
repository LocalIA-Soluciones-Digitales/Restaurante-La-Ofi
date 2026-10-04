import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FILAS_MESAS, ZONAS_PROVISIONALES } from "@/lib/espacios/plano-provisional";

const seed = readFileSync(path.join(process.cwd(), "supabase/seed/la_ofi_salon_provisional.sql"), "utf8");

describe("plano provisional de la web", () => {
  it("tiene las mismas zonas que el seed del salón", () => {
    const zonas = [...seed.matchAll(/\('([\w-]+)', '([^']+)', '(\w+)', ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), (\d+)\)/g)].map((m) => ({
      slug: m[1],
      nombre: m[2],
      tipo: m[3],
      x: Number(m[4]),
      y: Number(m[5]),
      ancho: Number(m[6]),
      alto: Number(m[7]),
    }));
    expect(ZONAS_PROVISIONALES.map(({ slug, nombre, tipo, x, y, ancho, alto }) => ({ slug, nombre, tipo, x, y, ancho, alto }))).toEqual(zonas);
  });

  it("tiene las mismas mesas que el seed del salón", () => {
    const mesas = [...seed.matchAll(/\('([\w-]+)', '(\w+)', (\d+), '(\w+)', ([\d.]+), ([\d.]+)\)/g)].map((m) => [
      m[1],
      m[2],
      Number(m[3]),
      m[4],
      Number(m[5]),
      Number(m[6]),
    ]);
    expect(FILAS_MESAS).toEqual(mesas);
  });
});
