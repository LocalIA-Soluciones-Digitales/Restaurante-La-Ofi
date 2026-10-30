import { describe, expect, it } from "vitest";
import { cartaItem } from "@/lib/carta";
import { clasePlato, conFotosDePlato } from "@/lib/carta-fotos";
import type { CartaSeccion } from "@/lib/restaurant/types";

const seccion = (slug: string, nombres: string[]): CartaSeccion => ({
  id: slug,
  slug,
  nombre: slug,
  items: nombres.map((nombre, i) => cartaItem({ id: `${slug}-${i}`, nombre, fuente: "supabase" })),
});

describe("fotos de plato", () => {
  it("asigna la foto real solo al plato y la sección que le corresponden", () => {
    const [desayunos, brasa] = conFotosDePlato([seccion("desayunos", ["Burrata", "Clásica"]), seccion("brasa", ["Burrata"])]);
    expect(desayunos!.items[0]!.imagen).not.toBeNull();
    expect(desayunos!.items[1]!.imagen).toBeNull();
    // Mismo nombre en otra sección: no es el mismo plato.
    expect(brasa!.items[0]!.imagen).toBeNull();
  });

  it("el salmón ya no lleva la foto de Instagram (la pone su ficha, carta-fichas.ts)", () => {
    const [s] = conFotosDePlato([seccion("desayunos", ["Salmón", "Burrata"])]);
    expect(s!.items[0]!.imagen).toBeNull();
    expect(s!.items[1]!.imagen).not.toBeNull();
  });

  it("respeta la foto que suba el restaurante", () => {
    const s = seccion("desayunos", ["Burrata"]);
    const propia = { src: "https://x.supabase.co/storage/v1/object/public/burrata.jpg", alt: "Burrata" };
    s.items[0] = { ...s.items[0]!, imagen: propia, imagenes: [propia] };
    expect(conFotosDePlato([s])[0]!.items[0]!.imagen).toEqual(propia);
  });
});

describe("clase de plato", () => {
  it("deduce el tipo por el nombre y, si no, por la sección", () => {
    expect(clasePlato("Merluza en salsa verde")).toBe("pescado");
    expect(clasePlato("Carrilleras de ternera al PX")).toBe("carne");
    expect(clasePlato("Alubias rojas de Gernika")).toBe("cuchara");
    expect(clasePlato("Arroz con leche")).toBe("postre");
    expect(clasePlato("Ensalada de la casa")).toBe("verdura");
    expect(clasePlato("Pastel vasco", "")).toBe("postre");
    expect(clasePlato("Mar de Frades", "Vinos blancos")).toBe("vino");
    expect(clasePlato("Tostada clásica")).toBe("pan");
    expect(clasePlato("Algo raro", "Nuestros pescados")).toBe("pescado");
    expect(clasePlato("Algo raro")).toBe("otro");
  });
});
