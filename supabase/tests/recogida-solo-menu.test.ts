// Para llevar, solo el menú del día (05/11/2026): se encarga de 9:00 a 12:00, se recoge
// ese mismo día de 13:00 a 15:00 y no entra nada de la carta.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, type TestDb } from "./helpers";

let t: TestDb;
let platos: string[];
let producto: string;

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const enMadrid = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));

type Config = { solo_menu_dia: boolean; pedir_desde: string; pedir_hasta: string; recogida_activa: boolean; franjas: { hora: string }[]; proximas: { hora: string }[] };
const config = () => t.one<{ c: Config }>("select public.laofi_get_config_pedidos($1) as c", [t.laOfi.site_key]).then((x) => x.c);

/** Recogida todo el día y todos los días; la hora de encargar, la que se diga. */
const ajustar = (pedirDesde: string, pedirHasta: string) =>
  t.db.exec(
    `update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 30, "capacidad": 50, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7], "solo_menu_dia": true, "pedir_desde": "${pedirDesde}", "pedir_hasta": "${pedirHasta}"}' where clave = 'recogida'`,
  );

const pedir = (recogida_en: string | undefined, items: unknown[]) =>
  t
    .one<{ r: { id: string; total_centimos: number } }>("select public.laofi_crear_pedido($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({ tipo: "RECOGIDA", nombre: "Jon", telefono: "600111222", recogida_en, items }),
    ])
    .then((x) => x.r);

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00'`);
  const { id } = await t.one<{ id: string }>("insert into laofi.menus_dia (fecha, precio_centimos) values ($1, 1350) returning id", [hoy()]);
  const { rows } = await t.db.query<{ id: string }>(
    `insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values ($1, 'primero', 'Lentejas', 1), ($1, 'segundo', 'Merluza', 2) returning id`,
    [id],
  );
  platos = rows.map((r) => r.id);
  producto = (await t.one<{ id: string }>("select id from laofi.productos where disponible and precio_centimos is not null limit 1")).id;
}, 60_000);

describe("para llevar, solo menú del día", () => {
  it("la migración deja la recogida de 13:00 a 15:00 y el encargo de 9:00 a 12:00", async () => {
    const fresca = await crearBd();
    const { v } = await fresca.one<{ v: Record<string, unknown> }>("select valor as v from laofi.ajustes where clave = 'recogida'");
    expect(v).toMatchObject({ desde: "13:00", hasta: "15:00", solo_menu_dia: true, pedir_desde: "09:00", pedir_hasta: "12:00" });
  });

  it("dentro de la hora de encargar: franjas solo de hoy y se acepta el menú", async () => {
    await ajustar("00:00", "23:59");
    const c = await config();
    expect(c).toMatchObject({ solo_menu_dia: true, pedir_desde: "00:00", pedir_hasta: "23:59" });
    expect(c.proximas.every((f) => enMadrid(f.hora) === hoy())).toBe(true);
    if (c.franjas.length === 0) return; // a las 23:30 pasadas ya no queda ninguna franja hoy
    const r = await pedir(c.franjas[0]!.hora, [{ menu_dia: true, platos }]);
    expect(r.total_centimos).toBe(1350);
  });

  it("no acepta nada de la carta, ni solo ni junto al menú", async () => {
    await ajustar("00:00", "23:59");
    const c = await config();
    const hora = c.franjas[0]?.hora ?? `${hoy()}T12:00:00Z`;
    await expect(pedir(hora, [{ producto_id: producto, cantidad: 1 }])).rejects.toThrow(/solo se puede encargar el menú del día/);
    await expect(pedir(hora, [{ menu_dia: true, platos }, { producto_id: producto, cantidad: 1 }])).rejects.toThrow(/solo se puede encargar el menú del día/);
  });

  it("fuera de la hora de encargar no hay franjas y no se acepta", async () => {
    // Una ventana de un minuto que ya ha pasado (o que no ha llegado).
    const ahora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" }).format(new Date());
    const [desde, hasta] = ahora >= "12:00" ? ["00:00", "00:01"] : ["23:58", "23:59"];
    await ajustar(desde, hasta);
    const c = await config();
    expect(c.recogida_activa).toBe(false);
    expect(c.franjas).toEqual([]);
    expect(c.proximas).toEqual([]);
    await expect(pedir(`${hoy()}T12:00:00Z`, [{ menu_dia: true, platos }])).rejects.toThrow(/Los encargos de comida se hacen de/);
    await expect(
      t.one("select public.laofi_crear_grupo($1, 'Equipo', 'Ane', $2)", [t.laOfi.site_key, `${hoy()}T12:00:00Z`]),
    ).rejects.toThrow(/Los encargos de comida se hacen de/);
  });

  it("sin «solo_menu_dia» todo sigue como antes", async () => {
    await t.db.exec(`update laofi.ajustes set valor = valor - 'solo_menu_dia' where clave = 'recogida'`);
    const c = await config();
    expect(c.solo_menu_dia).toBe(false);
    if (c.franjas.length === 0) return;
    await expect(pedir(c.franjas[0]!.hora, [{ producto_id: producto, cantidad: 1 }])).resolves.toBeTruthy();
  });
});
