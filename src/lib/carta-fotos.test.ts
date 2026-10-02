import { describe, expect, it } from "vitest";
import { cartaItem } from "@/lib/carta";
import { conFotosDePlato } from "@/lib/carta-fotos";
import type { CartaSeccion } from "@/lib/restaurant/types";

const seccion = (slug: string, nombres: string[]): CartaSeccion => ({
  id: slug,
  slug,
  nombre: slug,
  items: nombres.map((nombre, i) => cartaItem({ id: `${slug}-${i}`, nombre, fuente: "supabase" })),
});

describe("fotos de plato", () => {
  it("asigna la foto real solo al plato y la sección que le corresponden", () => {
    const [desayunos, brasa] = conFotosDePlato([seccion("desayunos", ["Salmón", "Clásica"]), seccion("brasa", ["Salmón"])]);
    expect(desayunos!.items[0]!.imagen).not.toBeNull();
    expect(desayunos!.items[1]!.imagen).toBeNull();
    // Mismo nombre en otra sección: no es el mismo plato.
    expect(brasa!.items[0]!.imagen).toBeNull();
  });

  it("respeta la foto que suba el restaurante", () => {
    const s = seccion("desayunos", ["Burrata"]);
    const propia = { src: "https://x.supabase.co/storage/v1/object/public/burrata.jpg", alt: "Burrata" };
    s.items[0] = { ...s.items[0]!, imagen: propia, imagenes: [propia] };
    expect(conFotosDePlato([s])[0]!.items[0]!.imagen).toEqual(propia);
  });
});
