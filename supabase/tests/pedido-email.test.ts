// Pedidos para recoger (04/11/2026): teléfono obligatorio y email opcional.
import { beforeAll, describe, expect, it } from "vitest";
import { STAFF_LAOFI, crearBd, type TestDb } from "./helpers";

let t: TestDb;
let producto: { id: string };
let hora: string;

const pedir = (extra: Record<string, unknown>) =>
  t
    .one<{ r: { id: string } }>("select public.laofi_crear_pedido($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({ tipo: "RECOGIDA", nombre: "Ane", recogida_en: hora, items: [{ producto_id: producto.id, cantidad: 1 }], ...extra }),
    ])
    .then((x) => x.r);

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 30, "capacidad": 20, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida'`);
  await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00'`);
  producto = await t.one("select id from laofi.productos where disponible and precio_centimos is not null limit 1");
  const c = await t.one<{ c: { proximas: { hora: string; libres: number }[] } }>("select public.laofi_get_config_pedidos($1) as c", [t.laOfi.site_key]);
  hora = c.c.proximas.find((f) => f.libres > 0)!.hora;
}, 60_000);

describe("pedido para recoger: teléfono y email", () => {
  it("sin teléfono (o incompleto) no se puede pedir", async () => {
    await expect(pedir({})).rejects.toThrow(/Falta el teléfono/);
    await expect(pedir({ telefono: "600 11" })).rejects.toThrow(/Falta el teléfono/);
  });

  it("con teléfono y sin email, se pide", async () => {
    const r = await pedir({ telefono: "600 111 222" });
    const fila = await t.one<{ telefono: string; email: string | null }>("select telefono, email from laofi.pedidos where id = $1", [r.id]);
    expect(fila).toEqual({ telefono: "600 111 222", email: null });
  });

  it("guarda el email en minúsculas y lo enseña en el panel", async () => {
    const r = await pedir({ telefono: "600111222", email: "  Ane@Ejemplo.com " });
    const fila = await t.one<{ email: string }>("select email from laofi.pedidos where id = $1", [r.id]);
    expect(fila.email).toBe("ane@ejemplo.com");
    const kds = await t.como("authenticated", STAFF_LAOFI, "staff@laofi.test", () =>
      t.one<{ j: { email: string } }>("select laofi.pedido_kds_json(p) as j from laofi.pedidos p where id = $1", [r.id]),
    );
    expect(kds.j.email).toBe("ane@ejemplo.com");
  });

  it("rechaza un email mal escrito", async () => {
    await expect(pedir({ telefono: "600111222", email: "ane@ejemplo" })).rejects.toThrow(/email no es válido/);
  });
});
