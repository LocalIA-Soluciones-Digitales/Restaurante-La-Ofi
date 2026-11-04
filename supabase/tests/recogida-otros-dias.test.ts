// Recogida otros días (04/11/2026): aunque hoy no queden horas, el pedido se puede
// dejar encargado para una hora de los próximos días. Cuenta en su día y no sale en
// cocina hasta entonces.
import { beforeAll, describe, expect, it } from "vitest";
import { STAFF_LAOFI, crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;
let producto: { id: string; precio_centimos: number };

const dia = (offset: number) => {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const enMadrid = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));

const config = () =>
  t
    .one<{ c: { recogida_activa: boolean; franjas: { hora: string }[]; proximas: { hora: string; libres: number }[] } }>(
      "select public.laofi_get_config_pedidos($1) as c",
      [t.laOfi.site_key],
    )
    .then((x) => x.c);

const pedir = (recogida_en: string | undefined, items: unknown[] = [{ producto_id: producto.id, cantidad: 1 }]) =>
  t
    .one<{ r: { id: string; numero_dia: number } }>("select public.laofi_crear_pedido($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({ tipo: "RECOGIDA", nombre: "Jon", telefono: "600111222", recogida_en, items }),
    ])
    .then((x) => x.r);

const cocina = () =>
  t.como("authenticated", STAFF_LAOFI, "staff@laofi.test", () =>
    t.one<{ r: { id: string }[] }>("select public.laofi_admin_cocina(false) as r").then((x) => x.r.map((p) => p.id)),
  );
const proximos = () =>
  t.como("authenticated", STAFF_LAOFI, "staff@laofi.test", () =>
    t.one<{ r: { id: string }[] }>("select public.laofi_admin_pedidos_proximos() as r").then((x) => x.r.map((p) => p.id)),
  );

beforeAll(async () => {
  t = await crearBd();
  // Recogida todos los días de 00:00 a 23:59 y local abierto todo el día.
  await t.db.exec(`update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 30, "capacidad": 2, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida'`);
  await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00'`);
  producto = await t.one("select id, precio_centimos from laofi.productos where disponible and precio_centimos is not null limit 1");
}, 60_000);

describe("recogida otros días", () => {
  it("la config ofrece las franjas de hoy y de los 6 días siguientes", async () => {
    const c = await config();
    const dias = new Set(c.proximas.map((f) => enMadrid(f.hora)));
    expect(dias.has(dia(1))).toBe(true);
    expect(dias.has(dia(6))).toBe(true);
    expect(dias.has(dia(7))).toBe(false);
    // «franjas» sigue siendo solo de hoy.
    expect(c.franjas.every((f) => enMadrid(f.hora) === dia(0))).toBe(true);
  });

  it("un pedido para mañana cuenta en mañana y no sale en cocina hasta entonces", async () => {
    const c = await config();
    const manana = c.proximas.find((f) => enMadrid(f.hora) === dia(1))!;
    const r = await pedir(manana.hora);
    const fila = await t.one<{ fecha_servicio: string }>("select fecha_servicio::text from laofi.pedidos where id = $1", [r.id]);
    expect(fila.fecha_servicio).toBe(dia(1));
    expect(r.numero_dia).toBe(1);
    expect(await cocina()).not.toContain(r.id);
    expect(await proximos()).toContain(r.id);
    // Ocupa su franja: quedan menos plazas.
    const despues = (await config()).proximas.find((f) => f.hora === manana.hora)!;
    expect(despues.libres).toBe(manana.libres - 1);
  });

  it("los de hoy siguen saliendo en cocina como siempre", async (ctx) => {
    const c = await config();
    if (c.franjas.length === 0) ctx.skip();
    const r = await pedir(c.franjas[c.franjas.length - 1]!.hora);
    expect(await cocina()).toContain(r.id);
    expect(await proximos()).not.toContain(r.id);
  });

  it("no acepta horas de dentro de una semana ni horas que no son franja", async () => {
    await expect(pedir(`${dia(7)}T11:00:00Z`)).rejects.toThrow(/Franja de recogida no disponible/);
    await expect(pedir(`${dia(1)}T11:07:00Z`)).rejects.toThrow(/Franja de recogida no disponible/);
  });

  it("el menú del día solo para recoger hoy", async () => {
    const { id } = await t.one<{ id: string }>("insert into laofi.menus_dia (fecha, precio_centimos) values ($1, 1350) returning id", [dia(0)]);
    const { id: plato } = await t.one<{ id: string }>("insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values ($1, 'plato', 'Lentejas', 1) returning id", [id]);
    const manana = (await config()).proximas.find((f) => enMadrid(f.hora) === dia(2))!;
    await expect(pedir(manana.hora, [{ menu_dia: true, platos: [plato] }])).rejects.toThrow(/solo se puede pedir para recoger hoy/);
  });
});

describe("reversión", () => {
  it("vuelve a las funciones anteriores y quita las nuevas", async () => {
    await revertirHasta(t.db, "20261104200000");
    const { n } = await t.one<{ n: number }>(
      "select count(*)::int as n from pg_proc where proname in ('franjas_recogida', 'laofi_admin_pedidos_proximos') or (proname = 'siguiente_numero_dia' and pronargs = 1)",
    );
    expect(n).toBe(0);
    const c = await config();
    expect(c).not.toHaveProperty("proximas");
  });
});
