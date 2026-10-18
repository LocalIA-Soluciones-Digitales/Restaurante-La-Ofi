import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cartaItem } from "@/lib/carta";
import { conFichas, fichaDe, FOTOS_FICHA, kcalDeFicha } from "@/lib/carta-fichas";
import { DEMO_CARTA } from "@/lib/restaurant/demo-content";
import type { CartaSeccion } from "@/lib/restaurant/types";

const seccion = (slug: string, nombres: string[]): CartaSeccion => ({
  id: slug,
  slug,
  nombre: slug,
  items: nombres.map((n, i) => cartaItem({ id: `${slug}-${i}`, nombre: n, fuente: "supabase" })),
});

describe("fichas de la carta", () => {
  it("cubren todos los platos de la carta oficial", () => {
    const sinFicha = DEMO_CARTA.flatMap((s) => s.items.filter((i) => !fichaDe(s.slug, i.nombre)).map((i) => `${s.slug}/${i.nombre}`));
    expect(sinFicha).toEqual([]);
  });

  it("cada foto de ficha existe en public/", () => {
    const faltan = FOTOS_FICHA.filter((f) => !existsSync(path.join(process.cwd(), "public/images/platos", `${f}.webp`)));
    expect(faltan).toEqual([]);
  });

  it("completa foto, ingredientes y nutrición estimada (kcal de los macros)", () => {
    const [s] = conFichas([seccion("carnes", ["Carrilleras de ternera al PX"])]);
    const item = s!.items[0]!;
    expect(item.imagen?.src).toBe("/images/platos/carrilleras.webp");
    expect(item.ingredientes).toContain("Carrillera de ternera");
    expect(item.nutricion).toMatchObject({ fuente: "estimacion", proteinas: 45, carbohidratos: 35, grasas: 30, calorias: 590 });
  });

  it("no pisa lo que ya trae el restaurante", () => {
    const base = seccion("carnes", ["Presa ibérica"]);
    base.items[0] = { ...base.items[0]!, ingredientes: ["Presa"], nutricion: { calorias: 300, proteinas: 30, carbohidratos: 0, grasas: 20, fuente: "restaurante" } };
    const [s] = conFichas([base]);
    expect(s!.items[0]!.ingredientes).toEqual(["Presa"]);
    expect(s!.items[0]!.nutricion?.fuente).toBe("restaurante");
  });

  it("en los vinos las kcal incluyen el alcohol", () => {
    expect(kcalDeFicha(fichaDe("vinos-dulces", "Harveys")!)).toBe(150);
  });
});
