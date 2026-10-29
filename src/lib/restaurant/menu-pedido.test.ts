import { describe, expect, it } from "vitest";
import { cartaItem } from "@/lib/carta";
import { conFichas } from "@/lib/carta-fichas";
import { PREFIJO_MENU_DIA, seccionMenuDia } from "@/lib/restaurant/menu-pedido";
import type { MenuDiaView } from "@/lib/restaurant/types";

const plato = (id: string, nombre: string, alergenos: string[] = []) => ({ id, tipo: "plato" as const, nombre, descripcion: null, alergenos, orden: 1 });

const menu = (m: Partial<MenuDiaView>): MenuDiaView => ({
  fecha: "2026-10-29",
  precioCentimos: 1350,
  incluye: ["Pan", "Bebida"],
  notas: null,
  actualizadoEn: null,
  platos: [plato("a1", "Secreto con patatas", ["sulfitos"]), plato("a2", "Arroz caldoso")],
  primeros: [],
  segundos: [],
  postres: [],
  fuente: "supabase",
  ...m,
});

describe("menú del día para pedir", () => {
  it("cada opción es una línea al precio del menú, con el prefijo que la distingue de la carta", () => {
    const s = seccionMenuDia(menu({}))!;
    expect(s.slug).toBe("menu-del-dia");
    expect(s.nota).toBe("Plato del día a elegir. Incluye pan, bebida.");
    expect(s.items.map((i) => [i.id, i.nombre, i.precioCentimos])).toEqual([
      [`${PREFIJO_MENU_DIA}a1`, "Secreto con patatas", 1350],
      [`${PREFIJO_MENU_DIA}a2`, "Arroz caldoso", 1350],
    ]);
    // Alérgenos marcados por el encargado: confirmados; sin ninguno, «sin confirmar».
    expect(s.items.map((i) => i.alergenosConfirmados)).toEqual([true, false]);
  });

  it("sin precio o sin plato único a elegir no se puede pedir", () => {
    expect(seccionMenuDia(menu({ precioCentimos: null }))).toBeNull();
    expect(seccionMenuDia(menu({ platos: [], primeros: [plato("p1", "Lentejas")] }))).toBeNull();
  });
});

describe("alérgenos de la ficha", () => {
  const seccion = (items: ReturnType<typeof cartaItem>[]) => conFichas([{ id: "s", slug: "entrantes", nombre: "Entrantes", items }])[0]!.items[0]!;

  it("rellenan el plato sin alérgenos y quedan sin confirmar", () => {
    const i = seccion([cartaItem({ id: "x", nombre: "Gambas al ajillo", fuente: "supabase" })]);
    expect(i.alergenos).toEqual(["crustaceos"]);
    expect(i.alergenosConfirmados).toBe(false);
  });

  it("los vinos sin ficha llevan sulfitos", () => {
    const [vino] = conFichas([{ id: "v", slug: "vinos-blancos", nombre: "Vinos blancos", items: [cartaItem({ id: "w", nombre: "Txakoli", fuente: "supabase" })] }])[0]!.items;
    expect(vino!.alergenos).toEqual(["sulfitos"]);
  });

  it("no pisan lo que el restaurante haya confirmado, aunque sea «ninguno»", () => {
    const i = seccion([cartaItem({ id: "x", nombre: "Gambas al ajillo", fuente: "supabase", alergenos: [], alergenosConfirmados: true })]);
    expect(i.alergenos).toEqual([]);
  });
});
