// /admin: roles, CRUD con lista blanca, salón, TPV, cobros (cuenta dividida),
// cocina por estación y cierre de caja.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, revertirHasta, STAFF_LAOFI, STAFF_OTRO, type TestDb } from "./helpers";

const CAMARERO = "00000000-0000-4000-8000-0000000000c1";
const COCINA = "00000000-0000-4000-8000-0000000000c2";

let t: TestDb;
let mesa: string;
const prod: Record<string, string> = {};

type Quien = "admin" | "camarero" | "cocina" | "otro" | "anon";
const usuarios: Record<Exclude<Quien, "anon">, [string, string]> = {
  admin: [STAFF_LAOFI, "dueno@laofi.test"],
  camarero: [CAMARERO, "camarero@laofi.test"],
  cocina: [COCINA, "cocina@laofi.test"],
  otro: [STAFF_OTRO, "staff@otro.test"],
};

async function como<T>(quien: Quien, fn: string, ...args: unknown[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `select public.${fn}(${ph}) as r`;
  const run = async () => (await t.db.query<{ r: T }>(sql, args)).rows[0]!.r;
  if (quien === "anon") return t.como("anon", "", "", run);
  const [id, email] = usuarios[quien];
  return t.como("authenticated", id, email, run);
}

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(read("seed/la_ofi_carta_enriquecida.sql"));
  await t.db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $3), ($2, $3)", [CAMARERO, COCINA, t.laOfi.id]);
  await t.db.query("insert into laofi.staff (user_id, nombre, rol) values ($1, 'Unai', 'camarero'), ($2, 'Nerea', 'cocina')", [CAMARERO, COCINA]);
  const { rows } = await t.db.query<{ nombre: string; id: string }>("select nombre, id from laofi.productos");
  for (const r of rows) prod[r.nombre] = r.id;
  // Una bebida (estación barra) para probar pedidos mixtos.
  await t.db.query("update laofi.productos set estacion = 'barra', precio_centimos = 250 where nombre = 'Bowl de yogur'");
  // Precio de prueba para un plato de cocina (en la carta publicada no tiene precio).
  await t.db.query("update laofi.productos set precio_centimos = 900 where nombre = 'Croquetas variadas'");
  ({ id: mesa } = await t.one<{ id: string }>("insert into laofi.mesas (numero) values ('12') returning id"));
}, 60_000);

describe("roles", () => {
  it("cada usuario recibe su rol; el staff de otro proyecto y anon, ninguno", async () => {
    expect(await como<{ rol: string }>("admin", "laofi_admin_yo")).toMatchObject({ rol: "admin" });
    expect(await como<{ rol: string; nombre: string }>("camarero", "laofi_admin_yo")).toEqual({ rol: "camarero", nombre: "Unai" });
    expect(await como<{ rol: string | null }>("otro", "laofi_admin_yo")).toMatchObject({ rol: null });
    await expect(como("anon", "laofi_admin_yo")).rejects.toThrow(/permission denied/);
  });

  it("un camarero no puede tocar la carta; un encargado/admin sí", async () => {
    await expect(como("camarero", "laofi_admin_guardar", "productos", JSON.stringify({ id: prod["Ibérico"], precio_centimos: 1 }))).rejects.toThrow(
      /NO_AUTORIZADO/,
    );
    const r = await como<{ precio_centimos: number; nombre: string }>("admin", "laofi_admin_guardar", "productos", JSON.stringify({ id: prod["Ibérico"], precio_centimos: 400 }));
    expect(r).toMatchObject({ precio_centimos: 400, nombre: "Ibérico" });
  });

  it("el staff de otro proyecto no puede usar el admin de La Ofi", async () => {
    await expect(como("otro", "laofi_admin_listar", "productos")).rejects.toThrow(/NO_AUTORIZADO/);
    await expect(como("otro", "laofi_admin_cocina")).resolves.toEqual([]);
  });
});

describe("CRUD con lista blanca", () => {
  it("rechaza tablas fuera de la lista", async () => {
    await expect(como("admin", "laofi_admin_listar", "pagos")).rejects.toThrow(/no permitida/);
    await expect(como("admin", "laofi_admin_guardar", "pedidos", "{}")).rejects.toThrow(/no permitida/);
  });

  it("al crear respeta los valores por defecto y al editar solo cambia lo enviado", async () => {
    const { id: cat } = await t.one<{ id: string }>("select id from laofi.categorias where slug = 'brasa'");
    const nuevo = await como<{ id: string; alergenos: string[]; disponible: boolean; orden: number }>(
      "admin", "laofi_admin_guardar", "productos", JSON.stringify({ categoria_id: cat, nombre: "Chuletón", precio_centimos: 4500 }),
    );
    expect(nuevo).toMatchObject({ alergenos: [], disponible: true, orden: 0 });
    const editado = await como<{ nombre: string; precio_centimos: number; disponible: boolean }>(
      "admin", "laofi_admin_guardar", "productos", JSON.stringify({ id: nuevo.id, disponible: false }),
    );
    expect(editado).toMatchObject({ nombre: "Chuletón", precio_centimos: 4500, disponible: false });
    await como("admin", "laofi_admin_borrar", "productos", nuevo.id);
  });

  it("las validaciones de la tabla siguen aplicando (alérgenos UE)", async () => {
    await expect(
      como("admin", "laofi_admin_guardar", "productos", JSON.stringify({ id: prod["Ibérico"], alergenos: ["picante"] })),
    ).rejects.toThrow();
  });
});

describe("salón, TPV y cobro dividido", () => {
  let pedido: { id: string; total_centimos: number };

  it("una comanda de TPV sienta la mesa, aplica invitaciones y exige precio en 'según mercado'", async () => {
    await expect(
      como("camarero", "laofi_admin_crear_pedido", JSON.stringify({ tipo: "MESA", mesa_id: mesa, items: [{ producto_id: prod["Pescado del día a la parrilla"] }] })),
    ).rejects.toThrow(/necesita precio/);
    pedido = await como("camarero", "laofi_admin_crear_pedido", JSON.stringify({
      tipo: "MESA",
      mesa_id: mesa,
      items: [
        { producto_id: prod["Pescado del día a la parrilla"], precio_manual_centimos: 2400 },
        { producto_id: prod["Ibérico"], cantidad: 2 },
        { producto_id: prod["Bowl de yogur"], invitacion: true },
      ],
    }));
    expect(pedido.total_centimos).toBe(2400 + 2 * 400);
    const salon = await como<{ mesas: { id: string; ocupada: boolean; pendiente_centimos: number }[] }>("camarero", "laofi_admin_salon");
    expect(salon.mesas.find((m) => m.id === mesa)).toMatchObject({ ocupada: true, pendiente_centimos: 3200 });
  });

  it("solo encargado/admin puede aplicar descuentos", async () => {
    await expect(
      como("camarero", "laofi_admin_crear_pedido", JSON.stringify({ tipo: "BARRA", descuento_centimos: 100, items: [{ producto_id: prod["Ibérico"] }] })),
    ).rejects.toThrow(/NO_AUTORIZADO/);
  });

  it("la cuenta de la mesa lista las líneas (invitación incluida) y lo pendiente", async () => {
    const c = await como<{ lineas: { nombre: string; invitacion: boolean }[]; pendiente_centimos: number }>("camarero", "laofi_admin_cuenta_mesa", mesa);
    expect(c.lineas).toHaveLength(3);
    expect(c.lineas.find((l) => l.invitacion)?.nombre).toBe("Bowl de yogur");
    expect(c.pendiente_centimos).toBe(3200);
  });

  it("cobro dividido: no deja liberar con pendiente y marca pagado al completar", async () => {
    await como("camarero", "laofi_admin_cobrar", JSON.stringify({ mesa_id: mesa, metodo: "TARJETA", importe_centimos: 1600 }));
    await expect(como("camarero", "laofi_admin_mesa", mesa, "liberar", "{}")).rejects.toThrow(/pendiente/);
    await expect(
      como("camarero", "laofi_admin_cobrar", JSON.stringify({ mesa_id: mesa, metodo: "EFECTIVO", importe_centimos: 9999 })),
    ).rejects.toThrow(/supera/);
    const r = await como<{ pendiente_centimos: number }>("camarero", "laofi_admin_cobrar", JSON.stringify({ mesa_id: mesa, metodo: "EFECTIVO", importe_centimos: 1600 }));
    expect(r.pendiente_centimos).toBe(0);
    const { payment_status } = await t.one<{ payment_status: string }>("select payment_status from laofi.pedidos where id = $1", [pedido.id]);
    expect(payment_status).toBe("PAID");
    await como("camarero", "laofi_admin_mesa", mesa, "liberar", "{}");
    const m = await t.one<{ ocupada: boolean; por_limpiar: boolean }>("select ocupada, por_limpiar from laofi.mesas where id = $1", [mesa]);
    expect(m).toEqual({ ocupada: false, por_limpiar: true });
  });

  it("regenerar el QR cambia el token (y solo lo hace encargado/admin)", async () => {
    const antes = await t.one<{ token: string }>("select token from laofi.mesas where id = $1", [mesa]);
    await expect(como("camarero", "laofi_admin_mesa", mesa, "regenerar_qr", "{}")).rejects.toThrow(/NO_AUTORIZADO/);
    await como("admin", "laofi_admin_mesa", mesa, "regenerar_qr", "{}");
    const despues = await t.one<{ token: string }>("select token from laofi.mesas where id = $1", [mesa]);
    expect(despues.token).not.toBe(antes.token);
  });
});

describe("cocina por estación", () => {
  it("un pedido mixto no avanza hasta que cocina y barra aceptan", async () => {
    const p = await como<{ id: string }>("camarero", "laofi_admin_crear_pedido", JSON.stringify({
      tipo: "BARRA",
      items: [{ producto_id: prod["Croquetas variadas"] }, { producto_id: prod["Bowl de yogur"] }],
    }));
    const r1 = await como<{ estado: string }>("cocina", "laofi_admin_avanzar", p.id, "PREPARING", "cocina");
    expect(r1.estado).toBe("RECEIVED");
    const r2 = await como<{ estado: string; items: { estacion: string; estado: string }[] }>("cocina", "laofi_admin_avanzar", p.id, "READY", "barra");
    expect(r2.estado).toBe("PREPARING");
    const r3 = await como<{ estado: string }>("cocina", "laofi_admin_avanzar", p.id, "READY", "cocina");
    expect(r3.estado).toBe("READY");
    const r4 = await como<{ estado: string }>("camarero", "laofi_admin_avanzar", p.id, "DELIVERED", null);
    expect(r4.estado).toBe("DELIVERED");
    const historial = await como<{ id: string }[]>("cocina", "laofi_admin_cocina", true);
    expect(historial.map((x) => x.id)).toContain(p.id);
  });

  it("no enseña a cocina pedidos online sin pagar", async () => {
    await t.db.exec(`update laofi.ajustes set valor = '{"online": true, "en_local": true}' where clave = 'pagos'`);
    const { id: zona } = await t.one<{ id: string }>("insert into laofi.zonas (slug, nombre) values ('test', 'Test') returning id");
    const { token } = await t.one<{ token: string }>("insert into laofi.mesas (zona_id, numero) values ($1, '99') returning token", [zona]);
    const { r } = await t.one<{ r: { id: string } }>("select public.laofi_crear_pedido($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({ tipo: "MESA", mesa_token: token, payment_method: "ONLINE", items: [{ producto_id: prod["Ibérico"] }] }),
    ]);
    const cola = await como<{ id: string }[]>("cocina", "laofi_admin_cocina");
    expect(cola.map((x) => x.id)).not.toContain(r.id);
  });
});

describe("cierre de caja", () => {
  it("resume cobros por método y calcula el descuadre del efectivo contado", async () => {
    const caja = await como<{ efectivo_centimos: number; tarjeta_centimos: number; invitaciones_centimos: number }>("admin", "laofi_admin_caja");
    expect(caja).toMatchObject({ efectivo_centimos: 1600, tarjeta_centimos: 1600 });
    expect(caja.invitaciones_centimos).toBeGreaterThan(0);
    await expect(como("camarero", "laofi_admin_cerrar_caja", 10000, 11500, null)).rejects.toThrow(/NO_AUTORIZADO/);
    const cierre = await como<{ efectivo_esperado_centimos: number; descuadre_centimos: number }>("admin", "laofi_admin_cerrar_caja", 10000, 11500, "Prueba");
    expect(cierre).toMatchObject({ efectivo_esperado_centimos: 11600, descuadre_centimos: -100 });
    const despues = await como<{ efectivo_centimos: number }>("admin", "laofi_admin_caja");
    expect(despues.efectivo_centimos).toBe(0);
  });
});

describe("reversión", () => {
  it("elimina el admin sin tocar pedidos ni carta", async () => {
    await revertirHasta(t.db, "20261002120000");
    const r = await t.one<{ staff: number; pedidos: number }>(
      `select (select count(*)::int from pg_tables where schemaname = 'laofi' and tablename = 'staff') as staff,
              (select count(*)::int from laofi.pedidos) as pedidos`,
    );
    expect(r.staff).toBe(0);
    expect(r.pedidos).toBeGreaterThan(0);
  });
});
