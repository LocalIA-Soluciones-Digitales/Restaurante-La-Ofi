// Carta oficial del restaurante (seed/la_ofi_carta_oficial.sql): sustituye las
// secciones reconstruidas desde internet por las de El Despacho, con precios.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, type TestDb } from "./helpers";

let t: TestDb;

interface SeccionRpc {
  slug: string;
  productos: { nombre: string; precio_centimos: number | null }[];
}

async function carta() {
  const { c } = await t.one<{ c: SeccionRpc[] }>("select public.laofi_get_carta($1) as c", [t.laOfi.site_key]);
  return c;
}

beforeAll(async () => {
  t = await crearBd();
  for (let i = 0; i < 2; i++) await t.db.exec(read("seed/la_ofi_carta_oficial.sql"));
}, 60_000);

describe("seed de la carta oficial", () => {
  it("deja las secciones de la carta en su orden y es idempotente", async () => {
    const c = await carta();
    expect(c.map((s) => s.slug)).toEqual([
      "desayunos",
      "entrantes",
      "entrantes-brasa",
      "ensaladas",
      "carnes",
      "pescados",
      "postres",
      "vinos-dulces",
    ]);
    expect(c.map((s) => s.productos.length)).toEqual([9, 7, 6, 5, 8, 2, 5, 4]);
  });

  it("carga los precios de la carta y deja sin precio lo que no es por ración", async () => {
    const precio = Object.fromEntries((await carta()).flatMap((s) => s.productos.map((p) => [p.nombre, p.precio_centimos])));
    expect(precio).toMatchObject({
      "Croquetas de la casa": 230,
      Pulpo: 2300,
      "Carrilleras de ternera al PX": 2000,
      "Tarta de queso": 900,
      "Finca Antigua": 300,
      "Chuleta de ganado mayor": null,
      "Pescado de temporada a la brasa": null,
    });
  });

  it("los vinos dulces van con IVA de alcohol", async () => {
    const { n } = await t.one<{ n: number }>(
      "select count(*)::int as n from laofi.productos p join laofi.categorias c on c.id = p.categoria_id where c.slug = 'vinos-dulces' and p.iva_pct = 21",
    );
    expect(n).toBe(4);
  });
});

describe("seed de la carta de vinos", () => {
  it("añade blancos, rosados y cavas antes de los dulces, con precio de botella, de forma idempotente", async () => {
    for (let i = 0; i < 2; i++) await t.db.exec(read("seed/la_ofi_carta_vinos.sql"));
    const c = await carta();
    expect(c.map((s) => s.slug).slice(-4)).toEqual(["vinos-blancos", "vinos-rosados", "cavas-champagnes", "vinos-dulces"]);
    expect(c.slice(-4).map((s) => s.productos.length)).toEqual([27, 4, 7, 4]);
    const precio = Object.fromEntries(c.flatMap((s) => s.productos.map((p) => [`${s.slug}/${p.nombre}`, p.precio_centimos])));
    expect(precio["vinos-blancos/200 Monges Reserva"]).toBe(5000);
    expect(precio["vinos-rosados/Flamingo"]).toBe(2900);
    expect(precio["cavas-champagnes/Ayala Blanc de Blancs"]).toBe(9600);
  });
});
