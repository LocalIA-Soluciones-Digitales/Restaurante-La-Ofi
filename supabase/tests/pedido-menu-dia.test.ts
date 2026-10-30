// Menú del día para llevar (29/10/2026): en «Pedir para recoger» el menú de hoy es
// una línea más del pedido, con un plato de cada grupo y al precio del menú.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;
let franja: string | undefined;
let platos: Record<string, string>;

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const pedir = (items: unknown[], extra: Record<string, unknown> = {}) =>
  t
    .one<{ r: { id: string; total_centimos: number } }>("select public.laofi_crear_pedido($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({ tipo: "RECOGIDA", nombre: "Ane", telefono: "600111222", recogida_en: franja, items, ...extra }),
    ])
    .then((x) => x.r);

beforeAll(async () => {
  t = await crearBd();
  // Recogida y horario abiertos todo el día, para que haya franjas sea la hora que sea.
  await t.db.exec(`update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 15, "capacidad": 50, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida'`);
  await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00'`);
  const { id } = await t.one<{ id: string }>("insert into laofi.menus_dia (fecha, precio_centimos) values ($1, 1350) returning id", [hoy()]);
  const { rows } = await t.db.query<{ id: string; nombre: string }>(
    `insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values
       ($1, 'primero', 'Lentejas', 1), ($1, 'primero', 'Ensalada', 2), ($1, 'segundo', 'Merluza', 3), ($1, 'postre', 'Flan', 4)
     returning id, nombre`,
    [id],
  );
  platos = Object.fromEntries(rows.map((r) => [r.nombre, r.id]));
  const { c } = await t.one<{ c: { franjas: { hora: string }[]; menu_hasta: string } }>("select public.laofi_get_config_pedidos($1) as c", [t.laOfi.site_key]);
  franja = c.franjas[0]?.hora;
  expect(c.menu_hasta).toBe("24:00");
}, 60_000);

describe("menú del día en el pedido para llevar", () => {
  it("cobra el precio del menú y guarda los platos elegidos como opciones de la línea", async (ctx) => {
    if (!franja) ctx.skip();
    const r = await pedir([{ menu_dia: true, cantidad: 2, platos: [platos.Lentejas, platos.Merluza, platos.Flan] }]);
    expect(r.total_centimos).toBe(2700);
    const linea = await t.one<{ nombre: string; precio_unitario_centimos: number; producto_id: string | null; modificadores: unknown }>(
      "select nombre, precio_unitario_centimos, producto_id, modificadores from laofi.pedido_items where pedido_id = $1",
      [r.id],
    );
    expect(linea).toMatchObject({ nombre: "Menú del día", precio_unitario_centimos: 1350, producto_id: null });
    expect(linea.modificadores).toEqual([
      { modificador: "Platos", opciones: ["Lentejas", "Merluza", "Flan"].map((nombre) => ({ nombre, precio_extra_centimos: 0 })) },
    ]);
  });

  it("se mezcla con la carta en el mismo pedido", async (ctx) => {
    if (!franja) ctx.skip();
    const { id, precio_centimos } = await t.one<{ id: string; precio_centimos: number }>(
      "select id, precio_centimos from laofi.productos where disponible and precio_centimos is not null limit 1",
    );
    const r = await pedir([{ menu_dia: true, platos: [platos.Ensalada, platos.Merluza] }, { producto_id: id, cantidad: 1 }]);
    expect(r.total_centimos).toBe(1350 + precio_centimos);
  });

  it("rechaza dos platos del mismo grupo o platos que no son del menú", async (ctx) => {
    if (!franja) ctx.skip();
    await expect(pedir([{ menu_dia: true, platos: [platos.Lentejas, platos.Ensalada] }])).rejects.toThrow(/un plato de cada grupo/);
    await expect(pedir([{ menu_dia: true, platos: [platos.Lentejas, "00000000-0000-4000-8000-000000000999"] }])).rejects.toThrow(/un plato de cada grupo/);
    await expect(pedir([{ menu_dia: true, platos: [] }])).rejects.toThrow(/Elige los platos/);
  });

  it("fuera de la franja del menú no se puede pedir", async (ctx) => {
    if (!franja) ctx.skip();
    await t.db.exec(`update laofi.ajustes set valor = '{"desde": "00:00", "hasta": "00:01"}' where clave = 'menu_dia'`);
    try {
      if (new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()) >= "00:01") {
        await expect(pedir([{ menu_dia: true, platos: [platos.Lentejas] }])).rejects.toThrow(/se puede pedir de 00:00 a 00:01/);
      }
    } finally {
      await t.db.exec(`update laofi.ajustes set valor = '{"desde": "00:00", "hasta": "24:00"}' where clave = 'menu_dia'`);
    }
  });
});

describe("reversión", () => {
  it("vuelve a rechazar líneas sin producto", async () => {
    await revertirHasta(t.db, "20261030100000");
    const { c } = await t.one<{ c: Record<string, unknown> }>("select public.laofi_get_config_pedidos($1) as c", [t.laOfi.site_key]);
    expect(c).not.toHaveProperty("menu_hasta");
  });
});
