// Carta extendida: nutrición solo con procedencia, alérgenos confirmados,
// modificadores, etiquetas y la RPC pública ampliada.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, STAFF_OTRO, type TestDb } from "./helpers";

let t: TestDb;
let brasa: string;

interface ProductoRpc {
  nombre: string;
  nutricion: { calorias: number | null; fuente: string } | null;
  alergenos_confirmados: boolean;
  modificadores: { nombre: string; opciones: { nombre: string; precio_extra_centimos: number }[] }[];
  estacion: string;
}

async function carta() {
  const { c } = await t.one<{ c: { slug: string; productos: ProductoRpc[] }[] }>("select public.laofi_get_carta($1) as c", [t.laOfi.site_key]);
  return c.flatMap((x) => x.productos);
}

beforeAll(async () => {
  t = await crearBd();
  ({ id: brasa } = await t.one<{ id: string }>("select id from laofi.categorias where slug = 'brasa'"));
}, 60_000);

describe("nutrición", () => {
  it("los productos publicados no traen nutrición inventada (null, nunca 0 kcal)", async () => {
    const productos = await carta();
    expect(productos.length).toBeGreaterThan(0);
    expect(productos.every((p) => p.nutricion === null)).toBe(true);
  });

  it("exige la procedencia si hay cualquier dato nutricional", async () => {
    await expect(
      t.db.query("insert into laofi.productos (categoria_id, nombre, calorias) values ($1, 'Sin fuente', 300)", [brasa]),
    ).rejects.toThrow(/productos_nutricion_con_fuente/);
  });

  it("devuelve la nutrición con su procedencia cuando la hay", async () => {
    await t.db.query(
      `insert into laofi.productos (categoria_id, nombre, calorias, proteinas_g, carbohidratos_g, grasas_g, nutricion_fuente)
       values ($1, 'Con nutrición', 420, 30, 10, 25, 'restaurante')`,
      [brasa],
    );
    const p = (await carta()).find((x) => x.nombre === "Con nutrición")!;
    expect(p.nutricion).toMatchObject({ calorias: 420, fuente: "restaurante" });
  });
});

describe("alérgenos y etiquetas", () => {
  it("la etiqueta sin_gluten solo vale con alérgenos confirmados y sin gluten", async () => {
    await expect(
      t.db.query("insert into laofi.productos (categoria_id, nombre, etiquetas) values ($1, 'X', '{sin_gluten}')", [brasa]),
    ).rejects.toThrow(/sin_gluten/);
    await expect(
      t.db.query(
        "insert into laofi.productos (categoria_id, nombre, etiquetas, alergenos, alergenos_confirmados) values ($1, 'X', '{sin_gluten}', '{gluten}', true)",
        [brasa],
      ),
    ).rejects.toThrow(/sin_gluten/);
    await t.db.query(
      "insert into laofi.productos (categoria_id, nombre, etiquetas, alergenos, alergenos_confirmados) values ($1, 'Sin gluten ok', '{sin_gluten,brasa}', '{pescado}', true)",
      [brasa],
    );
  });

  it("rechaza etiquetas, momentos, estaciones y vídeos no válidos", async () => {
    for (const sql of [
      "insert into laofi.productos (categoria_id, nombre, etiquetas) values ($1, 'X', '{gourmet}')",
      "insert into laofi.productos (categoria_id, nombre, momento) values ($1, 'X', '{cena}')",
      "insert into laofi.productos (categoria_id, nombre, estacion) values ($1, 'X', 'terraza')",
      "insert into laofi.productos (categoria_id, nombre, video_url) values ($1, 'X', 'http://inseguro/v.mp4')",
    ]) {
      await expect(t.db.query(sql, [brasa])).rejects.toThrow();
    }
  });
});

describe("modificadores", () => {
  it("se devuelven con sus opciones disponibles y ordenadas", async () => {
    const { id: producto } = await t.one<{ id: string }>(
      "insert into laofi.productos (categoria_id, nombre, precio_centimos) values ($1, 'Entrecot', 2200) returning id",
      [brasa],
    );
    const { id: punto } = await t.one<{ id: string }>(
      "insert into laofi.modificadores (producto_id, nombre, tipo, obligatorio) values ($1, 'Punto', 'unico', true) returning id",
      [producto],
    );
    await t.db.query(
      `insert into laofi.modificador_opciones (modificador_id, nombre, orden, disponible, precio_extra_centimos) values
       ($1, 'Poco hecho', 1, true, 0), ($1, 'Al punto', 2, true, 0), ($1, 'Agotada', 3, false, 0)`,
      [punto],
    );
    const p = (await carta()).find((x) => x.nombre === "Entrecot")!;
    expect(p.modificadores[0]!.opciones.map((o) => o.nombre)).toEqual(["Poco hecho", "Al punto"]);
    expect(p.estacion).toBe("cocina");
  });

  it("no admite suplementos negativos", async () => {
    const { id } = await t.one<{ id: string }>("select id from laofi.modificadores limit 1");
    await expect(
      t.db.query("insert into laofi.modificador_opciones (modificador_id, nombre, precio_extra_centimos) values ($1, 'X', -50)", [id]),
    ).rejects.toThrow();
  });

  it("el staff de otro proyecto no ve los modificadores de La Ofi", async () => {
    const n = await t.como("authenticated", STAFF_OTRO, "staff@otro.test", async () => (await t.db.query("select * from laofi.modificadores")).rows.length);
    expect(n).toBe(0);
  });
});

describe("menú del día: marca de actualización", () => {
  it("editar un plato actualiza updated_at del menú y la RPC lo devuelve", async () => {
    const { id } = await t.one<{ id: string }>(
      "insert into laofi.menus_dia (fecha) values ((now() at time zone 'Europe/Madrid')::date) returning id",
    );
    await t.db.query("update laofi.menus_dia set updated_at = '2020-01-01' where id = $1", [id]);
    await t.db.query("insert into laofi.menu_dia_platos (menu_id, tipo, nombre) values ($1, 'plato', 'Lentejas')", [id]);
    const { m } = await t.one<{ m: { updated_at: string } }>("select public.laofi_get_menu_dia($1) as m", [t.laOfi.site_key]);
    expect(new Date(m.updated_at).getFullYear()).toBeGreaterThan(2020);
  });
});

describe("seed opcional de carta enriquecida", () => {
  it("solo añade datos derivados de lo publicado y es idempotente", async () => {
    for (let i = 0; i < 2; i++) await t.db.exec(read("seed/la_ofi_carta_enriquecida.sql"));
    const r = await t.one<{ fotos: number; desayuno: number; brasa: number; mods: number; opciones: number; nutricion: number }>(
      `select (select count(*)::int from laofi.productos where imagen_url like '/images/%') as fotos,
              (select count(*)::int from laofi.productos where momento = '{desayuno}') as desayuno,
              (select count(*)::int from laofi.productos where 'brasa' = any (etiquetas)) as brasa,
              (select count(*)::int from laofi.modificadores m join laofi.productos p on p.id = m.producto_id where p.nombre = 'Clásica') as mods,
              (select count(*)::int from laofi.modificador_opciones o join laofi.modificadores m on m.id = o.modificador_id join laofi.productos p on p.id = m.producto_id where p.nombre = 'Clásica') as opciones,
              (select count(*)::int from laofi.productos where nutricion_fuente is not null and nombre not in ('Con nutrición')) as nutricion`,
    );
    expect(r).toMatchObject({ fotos: 4, desayuno: 9, mods: 1, opciones: 4, nutricion: 0 });
    expect(r.brasa).toBeGreaterThanOrEqual(10);
  });
});

describe("reversión", () => {
  it("quita lo añadido y deja la carta como antes", async () => {
    await t.db.exec(read("rollback/20261002100000_laofi_carta_extendida.down.sql"));
    const { cols } = await t.one<{ cols: number }>(
      "select count(*)::int as cols from information_schema.columns where table_schema = 'laofi' and table_name = 'productos' and column_name = 'calorias'",
    );
    expect(cols).toBe(0);
    const { c } = await t.one<{ c: { productos: Record<string, unknown>[] }[] }>("select public.laofi_get_carta($1) as c", [t.laOfi.site_key]);
    expect(c[0]!.productos[0]).not.toHaveProperty("nutricion");
  });
});
