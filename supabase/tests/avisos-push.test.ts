// Avisos al móvil (Web Push) de reservas y pedidos nuevos, con cada tipo encendible.
import { beforeAll, describe, expect, it } from "vitest";
import { STAFF_LAOFI, STAFF_OTRO, crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;

const peticiones = async () =>
  (await t.db.query<{ body: { titulo: string; cuerpo: string; url: string; cliente_id: string } }>("select body from net.peticiones_test order by id")).rows.map((r) => r.body);
const limpiar = () => t.db.exec("delete from net.peticiones_test");

let tel = 633300000;
const reserva = (espacio: string, extra: Record<string, unknown> = {}) =>
  t.db.query(
    `insert into laofi.reservas (nombre, telefono, personas, fecha, hora, espacio, estado, origen, evento_id, comida)
     values ($1, $2, $3, (now() at time zone 'Europe/Madrid')::date + 1, '14:00', $4, 'PENDIENTE', $5, $6, $7)`,
    [extra.nombre ?? "Ane", String(tel++), extra.personas ?? 4, espacio, extra.origen ?? "web", extra.evento_id ?? null, extra.comida ?? null],
  );

const admin = <T>(sql: string, params: unknown[] = []) => t.como("authenticated", STAFF_LAOFI, "duena@laofi.test", () => t.one<T>(sql, params));

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`insert into laofi.staff (user_id, nombre, rol) values ('${STAFF_LAOFI}', 'Carlos', 'encargado') on conflict (user_id) do nothing`);
  await t.db.query("insert into public.settings (cliente_id, key, value) values ($1, 'push_notify_url', '\"https://push.test/notify\"'), ($1, 'push_notify_secret', '\"s3cr3t\"')", [
    t.laOfi.id,
  ]);
}, 60_000);

describe("reservas", () => {
  it("avisa de cada tipo con su texto", async () => {
    await limpiar();
    const { id: evento } = await t.one<{ id: string }>(
      "insert into laofi.eventos (slug, titulo, fecha, publicado) values ('tardeo-push', 'Vermuteo y tardeo', current_date + 10, true) returning id",
    );
    await reserva("mesa", { comida: { modo: "menu", lineas: [] } });
    await reserva("despacho", { personas: 12 });
    await reserva("recogida", { personas: 3 });
    await reserva("evento", { evento_id: evento });
    await reserva("presupuesto", { personas: 40 });
    const p = await peticiones();
    expect(p.map((x) => x.titulo)).toEqual([
      "Reserva en el comedor",
      "Reserva en El Despacho",
      "Menú del día para recoger",
      "Se apuntan a «Vermuteo y tardeo»",
      "Petición de presupuesto",
    ]);
    expect(p[0]!.cuerpo).toBe("Ane · 4 pers. · mañana a las 14:00 · menú del día");
    expect(p[2]!.cuerpo).toContain("3 menús");
    expect(p.every((x) => x.url === "/admin/reservas" && x.cliente_id === t.laOfi.id)).toBe(true);
  });

  it("no avisa de las que apunta el propio local", async () => {
    await limpiar();
    await reserva("mesa", { origen: "telefono" });
    expect(await peticiones()).toEqual([]);
  });

  it("respeta los tipos apagados", async () => {
    await admin("select public.laofi_admin_avisos_guardar($1)", [JSON.stringify({ reservas_despacho: false, inventado: true, eventos: "no" })]);
    await limpiar();
    await reserva("despacho");
    await reserva("mesa");
    expect((await peticiones()).map((x) => x.titulo)).toEqual(["Reserva en el comedor"]);
    const { r } = await admin<{ r: { tipos: Record<string, boolean>; configurado: boolean } }>("select public.laofi_admin_avisos() as r");
    expect(r.tipos.reservas_despacho).toBe(false);
    expect(r.tipos.eventos).toBe(true);
    expect("inventado" in r.tipos).toBe(false);
    expect(r.configurado).toBe(true);
  });

  it("sin la Edge Function configurada no envía nada y la reserva entra igual", async () => {
    await t.db.query("delete from public.settings where cliente_id = $1", [t.laOfi.id]);
    await limpiar();
    await reserva("mesa", { nombre: "Sin aviso" });
    expect(await peticiones()).toEqual([]);
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.reservas where nombre = 'Sin aviso'");
    expect(n).toBe(1);
    await t.db.query("insert into public.settings (cliente_id, key, value) values ($1, 'push_notify_url', '\"https://push.test/notify\"')", [t.laOfi.id]);
  });
});

describe("pedidos", () => {
  it("avisa del pedido para recoger con el total final (al cerrar la transacción)", async () => {
    await limpiar();
    // Como laofi_crear_pedido: se crea el pedido y el total se pone después, en la misma transacción.
    await t.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into laofi.pedidos (numero_dia, tipo, nombre_cliente, recogida_en, payment_method)
         values (901, 'RECOGIDA', 'Mikel', date_trunc('day', now() at time zone 'Europe/Madrid') + interval '13 hours 30 minutes', 'LOCAL') returning id`,
      );
      await tx.query("update laofi.pedidos set total_centimos = 2350 where id = $1", [rows[0]!.id]);
    });
    const [p] = await peticiones();
    expect(p?.titulo).toBe("Pedido para recoger nº 901");
    expect(p?.cuerpo).toMatch(/^Mikel · 23,50 € · recoge a las \d\d:\d\d$/);
    expect(p?.url).toBe("/admin/cocina");
  });

  it("los pedidos en mesa vienen apagados", async () => {
    const { r } = await admin<{ r: { tipos: Record<string, boolean> } }>("select public.laofi_admin_avisos() as r");
    expect(r.tipos.pedidos_mesa).toBe(false);
  });
});

describe("dispositivos", () => {
  it("suscribe, manda la prueba y da de baja", async () => {
    await admin("select public.laofi_admin_push_suscribir('https://push.example/abc', 'p256', 'auth', 'Pixel')");
    const { r } = await admin<{ r: { dispositivos: number } }>("select public.laofi_admin_avisos() as r");
    expect(r.dispositivos).toBe(1);
    await limpiar();
    await admin("select public.laofi_admin_push_prueba()");
    expect((await peticiones())[0]?.titulo).toBe("Avisos de La Ofi activados");
    await admin("select public.laofi_admin_push_baja('https://push.example/abc')");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from public.push_suscripciones");
    expect(n).toBe(0);
  });

  it("rechaza suscripciones raras, a otros negocios y a anon", async () => {
    await expect(admin("select public.laofi_admin_push_suscribir('http://inseguro', 'a', 'b', null)")).rejects.toThrow(/no válida/);
    await expect(
      t.como("authenticated", STAFF_OTRO, "otro@bar.test", () => t.one("select public.laofi_admin_avisos_guardar('{}')")),
    ).rejects.toThrow(/NO_AUTORIZADO/);
    await expect(t.como("anon", STAFF_OTRO, "", () => t.one("select public.laofi_admin_push_prueba()"))).rejects.toThrow(/permission denied/);
  });
});

describe("reversión", () => {
  it("quita los disparadores y deja de avisar", async () => {
    await revertirHasta(t.db, "20261101100000");
    await limpiar();
    await reserva("mesa");
    expect(await peticiones()).toEqual([]);
  });
});
