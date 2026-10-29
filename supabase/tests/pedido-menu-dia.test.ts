// Pedido del menú del día (29/10/2026): una opción del plato del día de hoy entra
// en el pedido al precio del menú guardado; el de otro día, el no publicado o el
// que no tiene precio, no.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, type TestDb } from "./helpers";

let t: TestDb;
let mesaToken: string;

const HOY = "(now() at time zone 'Europe/Madrid')::date";

const crearPedido = (p: Record<string, unknown>) =>
  t.one<{ r: { id: string; total_centimos: number } }>("select public.laofi_crear_pedido($1, $2) as r", [t.laOfi.site_key, JSON.stringify(p)]).then((x) => x.r);

const enMesa = (items: unknown[], extra: Record<string, unknown> = {}) => crearPedido({ tipo: "MESA", mesa_token: mesaToken, payment_method: "LOCAL", items, ...extra });

async function menu(fecha: string, precio: number | null, disponible = true) {
  const { id } = await t.one<{ id: string }>(`insert into laofi.menus_dia (fecha, precio_centimos, disponible) values (${fecha}, $1, $2) returning id`, [precio, disponible]);
  const { rows } = await t.db.query<{ id: string }>(
    "insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values ($1, 'plato', 'Secreto con patatas', 1), ($1, 'plato', 'Arroz caldoso', 2) returning id",
    [id],
  );
  return { id, platos: rows.map((r) => r.id) };
}

beforeAll(async () => {
  t = await crearBd();
  const { id: zona } = await t.one<{ id: string }>("insert into laofi.zonas (slug, nombre, tipo) values ('comedor', 'Comedor', 'comedor') returning id");
  ({ token: mesaToken } = await t.one<{ token: string }>("insert into laofi.mesas (zona_id, numero) values ($1, '1') returning token", [zona]));
}, 60_000);

describe("menú del día en el pedido", () => {
  it("cobra el precio del menú de hoy y guarda «Menú del día · plato» para cocina", async () => {
    const hoy = await menu(HOY, 1350);
    const r = await enMesa([{ menu_plato_id: hoy.platos[1], cantidad: 2, notas: "Sin pan" }], { total_esperado_centimos: 2700 });
    expect(r.total_centimos).toBe(2700);
    const linea = await t.one<{ nombre: string; producto_id: string | null; precio_unitario_centimos: number; estacion: string; notas: string }>(
      "select nombre, producto_id, precio_unitario_centimos, estacion, notas from laofi.pedido_items where pedido_id = $1",
      [r.id],
    );
    expect(linea).toEqual({ nombre: "Menú del día · Arroz caldoso", producto_id: null, precio_unitario_centimos: 1350, estacion: "cocina", notas: "Sin pan" });
  });

  it("el precio lo pone la base de datos: un total manipulado no pasa", async () => {
    const { rows } = await t.db.query<{ id: string }>(
      `select mp.id from laofi.menu_dia_platos mp join laofi.menus_dia m on m.id = mp.menu_id where m.fecha = ${HOY} and m.precio_centimos = 1350 limit 1`,
    );
    await expect(enMesa([{ menu_plato_id: rows[0]!.id, cantidad: 1 }], { total_esperado_centimos: 100 })).rejects.toThrow(/PRECIO_CAMBIADO/);
  });

  it("no admite el menú de otro día, uno sin publicar ni uno sin precio", async () => {
    const ayer = await menu(`${HOY} - 1`, 1200);
    await expect(enMesa([{ menu_plato_id: ayer.platos[0], cantidad: 1 }])).rejects.toThrow(/AGOTADO/);

    await t.db.exec(`delete from laofi.menus_dia where fecha = ${HOY}`);
    const oculto = await menu(HOY, 1350, false);
    await expect(enMesa([{ menu_plato_id: oculto.platos[0], cantidad: 1 }])).rejects.toThrow(/AGOTADO/);

    await t.db.exec(`delete from laofi.menus_dia where fecha = ${HOY}`);
    const sinPrecio = await menu(HOY, null);
    await expect(enMesa([{ menu_plato_id: sinPrecio.platos[0], cantidad: 1 }])).rejects.toThrow(/precio en el local/);
  });
});
