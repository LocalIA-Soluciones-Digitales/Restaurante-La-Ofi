import { describe, expect, it } from "vitest";
import {
  cartaItem,
  esSinGluten,
  filtrarCarta,
  itemDesdeRpc,
  precioConModificadores,
  repartoMacros,
  resumenModificadores,
  SIN_FILTROS,
  validarSeleccion,
  type FiltrosCarta,
} from "@/lib/carta";
import type { CartaSeccion } from "@/lib/restaurant/types";

const pulpo = cartaItem({
  id: "1",
  nombre: "Pulpo a la brasa",
  fuente: "supabase",
  alergenos: ["moluscos"],
  alergenosConfirmados: true,
  etiquetas: ["brasa"],
  momento: ["mediodia", "tarde"],
  ingredientes: ["Pulpo", "Pimentón"],
});
const tostada = cartaItem({ id: "2", nombre: "Tostada clásica", fuente: "instagram", momento: ["desayuno"] });
const ensalada = cartaItem({
  id: "3",
  nombre: "Ensalada de temporada",
  fuente: "supabase",
  alergenos: [],
  alergenosConfirmados: true,
  etiquetas: ["vegetariano"],
});
const secciones: CartaSeccion[] = [{ id: "s", slug: "s", nombre: "S", items: [pulpo, tostada, ensalada] }];

const f = (over: Partial<FiltrosCarta>): FiltrosCarta => ({ ...SIN_FILTROS, ...over });
const nombres = (r: ReturnType<typeof filtrarCarta>) => r.secciones.flatMap((s) => s.items.map((i) => i.nombre));

describe("filtrarCarta", () => {
  it("sin filtros devuelve todo", () => {
    expect(nombres(filtrarCarta(secciones, SIN_FILTROS))).toHaveLength(3);
  });

  it("busca sin acentos en nombre e ingredientes", () => {
    expect(nombres(filtrarCarta(secciones, f({ texto: "pimenton" })))).toEqual(["Pulpo a la brasa"]);
  });

  it("filtra por momento; los platos sin momento se sirven todo el día", () => {
    expect(nombres(filtrarCarta(secciones, f({ momento: "desayuno" })))).toEqual(["Tostada clásica", "Ensalada de temporada"]);
  });

  it("al excluir un alérgeno oculta también los platos sin alérgenos confirmados y lo cuenta", () => {
    const r = filtrarCarta(secciones, f({ sinAlergenos: new Set(["moluscos"]) }));
    expect(nombres(r)).toEqual(["Ensalada de temporada"]);
    expect(r.ocultosSinConfirmar).toBe(1);
  });

  it("filtros rápidos por etiqueta", () => {
    expect(nombres(filtrarCarta(secciones, f({ rapidos: new Set(["brasa"]) })))).toEqual(["Pulpo a la brasa"]);
    expect(nombres(filtrarCarta(secciones, f({ rapidos: new Set(["vegetariano"]) })))).toEqual(["Ensalada de temporada"]);
  });
});

describe("esSinGluten", () => {
  it("nunca afirma 'sin gluten' de un plato con alérgenos sin confirmar", () => {
    expect(esSinGluten(tostada)).toBe(false);
    expect(esSinGluten(ensalada)).toBe(true);
  });
});

describe("repartoMacros", () => {
  it("reparte las kcal 4/4/9 en enteros que suman 100", () => {
    const r = repartoMacros({ calorias: 420, proteinas: 30, carbohidratos: 10, grasas: 25, fuente: "restaurante" });
    expect(r.reduce((a, b) => a + b.pct, 0)).toBe(100);
    expect(r.find((x) => x.key === "grasas")!.pct).toBeGreaterThan(50);
  });

  it("sin datos completos no inventa nada", () => {
    expect(repartoMacros(null)).toEqual([]);
    expect(repartoMacros({ calorias: 300, proteinas: null, carbohidratos: 10, grasas: 5, fuente: "restaurante" })).toEqual([]);
  });
});

describe("modificadores", () => {
  const entrecot = cartaItem({
    id: "e",
    nombre: "Entrecot",
    fuente: "supabase",
    precioCentimos: 2200,
    modificadores: [
      { id: "p", nombre: "Punto", tipo: "unico", obligatorio: true, max_opciones: null, opciones: [{ id: "a", nombre: "Al punto", precio_extra_centimos: 0 }] },
      { id: "x", nombre: "Extras", tipo: "multiple", obligatorio: false, max_opciones: 2, opciones: [{ id: "q", nombre: "Queso azul", precio_extra_centimos: 150 }] },
    ],
  });

  it("exige los obligatorios", () => {
    expect(validarSeleccion(entrecot, [])).toEqual(["Elige punto"]);
    expect(validarSeleccion(entrecot, [{ modificadorId: "p", opcionIds: ["a"] }])).toEqual([]);
  });

  it("suma los suplementos y resume la selección", () => {
    const sel = [
      { modificadorId: "p", opcionIds: ["a"] },
      { modificadorId: "x", opcionIds: ["q"] },
    ];
    expect(precioConModificadores(entrecot, sel)).toBe(2350);
    expect(resumenModificadores(entrecot, sel)).toBe("Punto: al punto · Extras: queso azul");
  });
});

describe("itemDesdeRpc", () => {
  it("funciona con la RPC antigua y no inventa nutrición", () => {
    const i = itemDesdeRpc({ id: "z", nombre: "Z", descripcion: null, precio_centimos: 500, imagen_url: null, alergenos: [], destacado: false });
    expect(i.nutricion).toBeNull();
    expect(i.alergenosConfirmados).toBe(false);
  });

  it("descarta una nutrición sin ningún valor", () => {
    const i = itemDesdeRpc({
      id: "z",
      nombre: "Z",
      descripcion: null,
      precio_centimos: 500,
      imagen_url: "/a.webp",
      imagenes: ["/a.webp", "/b.webp"],
      alergenos: [],
      destacado: false,
      nutricion: { calorias: null, proteinas_g: null, carbohidratos_g: null, grasas_g: null, fuente: "restaurante" },
    });
    expect(i.nutricion).toBeNull();
    expect(i.imagenes.map((x) => x.src)).toEqual(["/a.webp", "/b.webp"]);
  });
});
