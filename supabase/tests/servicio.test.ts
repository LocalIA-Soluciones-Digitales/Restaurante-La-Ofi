// Servicio de sala (migración 20261002140000): camarero por zona/mesa, platos
// listos para servir, limpieza en bloque e historial de ocupaciones.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, revertirHasta, STAFF_LAOFI, STAFF_OTRO, type TestDb } from "./helpers";

const CAMARERO = "00000000-0000-4000-8000-0000000000c1";
const COCINA = "00000000-0000-4000-8000-0000000000c2";

let t: TestDb;
let mesa: string;
let zona: string;
let croquetas: string;

type Quien = "admin" | "camarero" | "cocina" | "otro";
const usuarios: Record<Quien, [string, string]> = {
  admin: [STAFF_LAOFI, "dueno@laofi.test"],
  camarero: [CAMARERO, "camarero@laofi.test"],
  cocina: [COCINA, "cocina@laofi.test"],
  otro: [STAFF_OTRO, "staff@otro.test"],
};

async function como<T>(quien: Quien, fn: string, ...args: unknown[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  const [id, email] = usuarios[quien];
  return t.como("authenticated", id, email, async () => (await t.db.query<{ r: T }>(`select public.${fn}(${ph}) as r`, args)).rows[0]!.r);
}

interface MesaSalon {
  id: string;
  listos: number;
  camarero_id: string | null;
  camarero: string | null;
  por_limpiar: boolean;
}
const mesaDelSalon = async () => (await como<{ mesas: MesaSalon[] }>("camarero", "laofi_admin_salon")).mesas.find((m) => m.id === mesa)!;

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(read("seed/la_ofi_carta_enriquecida.sql"));
  await t.db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $3), ($2, $3)", [CAMARERO, COCINA, t.laOfi.id]);
  await t.db.query("insert into laofi.staff (user_id, nombre, rol) values ($1, 'Unai', 'camarero'), ($2, 'Nerea', 'cocina')", [CAMARERO, COCINA]);
  ({ id: croquetas } = await t.one<{ id: string }>("update laofi.productos set precio_centimos = 900 where nombre = 'Croquetas variadas' returning id"));
  ({ id: zona } = await t.one<{ id: string }>("insert into laofi.zonas (slug, nombre, tipo) values ('comedor', 'Comedor', 'comedor') returning id"));
  ({ id: mesa } = await t.one<{ id: string }>("insert into laofi.mesas (numero, zona_id, capacidad) values ('7', $1, 4) returning id", [zona]));
}, 60_000);

describe("camarero asignado", () => {
  it("la mesa hereda el camarero de su zona y puede tener uno propio", async () => {
    expect((await mesaDelSalon()).camarero_id).toBeNull();
    await como("admin", "laofi_admin_guardar", "zonas", JSON.stringify({ id: zona, camarero_id: CAMARERO }));
    expect(await mesaDelSalon()).toMatchObject({ camarero_id: CAMARERO, camarero: "Unai" });
    await como("admin", "laofi_admin_guardar", "mesas", JSON.stringify({ id: mesa, camarero_id: COCINA }));
    expect((await mesaDelSalon()).camarero_id).toBe(COCINA);
    await como("admin", "laofi_admin_guardar", "mesas", JSON.stringify({ id: mesa, camarero_id: null }));
    expect((await mesaDelSalon()).camarero_id).toBe(CAMARERO);
  });
});

describe("platos listos para servir", () => {
  let pedido: string;

  it("el salón cuenta los platos listos de la ocupación actual", async () => {
    await como("camarero", "laofi_admin_mesa", mesa, "sentar", JSON.stringify({ comensales: 3 }));
    const p = await como<{ id: string }>("camarero", "laofi_admin_crear_pedido", JSON.stringify({ tipo: "MESA", mesa_id: mesa, items: [{ producto_id: croquetas, cantidad: 2 }] }));
    pedido = p.id;
    expect((await mesaDelSalon()).listos).toBe(0);
    await como("cocina", "laofi_admin_avanzar", pedido, "READY", null);
    expect((await mesaDelSalon()).listos).toBe(2);
  });

  it("servir pasa los platos listos a servidos y el pedido con ellos", async () => {
    expect(await como<number>("camarero", "laofi_admin_servir_mesa", mesa)).toBe(2);
    expect((await mesaDelSalon()).listos).toBe(0);
    const { estado } = await t.one<{ estado: string }>("select estado from laofi.pedidos where id = $1", [pedido]);
    expect(estado).toBe("DELIVERED");
    expect(await como<number>("camarero", "laofi_admin_servir_mesa", mesa)).toBe(0);
  });

  it("cocina no puede servir mesas", async () => {
    await expect(como("cocina", "laofi_admin_servir_mesa", mesa)).rejects.toThrow(/NO_AUTORIZADO/);
  });
});

describe("ocupaciones y fin de servicio", () => {
  it("liberar guarda la ocupación con comensales e importe", async () => {
    await como("camarero", "laofi_admin_mesa", mesa, "liberar", JSON.stringify({ forzar: true }));
    const o = await t.one<{ comensales: number; importe_centimos: number; zona_id: string }>("select comensales, importe_centimos, zona_id from laofi.ocupaciones");
    expect(o).toEqual({ comensales: 3, importe_centimos: 1800, zona_id: zona });
    expect((await mesaDelSalon()).por_limpiar).toBe(true);
  });

  it("el informe de ocupación da rotación y medias por zona (solo admin/encargado)", async () => {
    const hoy = (await t.one<{ d: string }>("select to_char((now() at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD') as d")).d;
    const r = await como<{ resumen: { ocupaciones: number; comensales: number }; por_zona: { zona: string; mesas: number; ocupaciones: number; rotacion: number; importe_medio_centimos: number }[] }>(
      "admin", "laofi_admin_ocupacion", hoy, hoy,
    );
    expect(r.resumen).toMatchObject({ ocupaciones: 1, comensales: 3 });
    expect(r.por_zona).toEqual([expect.objectContaining({ zona: "Comedor", mesas: 1, ocupaciones: 1, rotacion: 1, importe_medio_centimos: 1800 })]);
    expect(await como("camarero", "laofi_admin_ocupacion", hoy, hoy)).toBeNull();
  });

  it("marcar todas como limpias deja las mesas libres listas", async () => {
    expect(await como<number>("camarero", "laofi_admin_limpiar_todas")).toBe(1);
    expect((await mesaDelSalon()).por_limpiar).toBe(false);
  });

  it("el staff de otro proyecto no ve ni toca nada", async () => {
    await expect(como("otro", "laofi_admin_limpiar_todas")).rejects.toThrow(/NO_AUTORIZADO/);
    expect((await t.como("authenticated", STAFF_OTRO, "staff@otro.test", async () => (await t.db.query("select * from laofi.ocupaciones")).rows)).length).toBe(0);
  });
});

describe("reversión", () => {
  it("deja el salón como en la migración anterior", async () => {
    const otra = await crearBd();
    await revertirHasta(otra.db, "20261002140000");
    const { cols } = await otra.one<{ cols: number }>(
      "select count(*)::int as cols from information_schema.columns where table_schema = 'laofi' and column_name = 'camarero_id'",
    );
    expect(cols).toBe(0);
    const { f } = await otra.one<{ f: number }>("select count(*)::int as f from pg_proc where proname in ('laofi_admin_servir_mesa', 'laofi_admin_ocupacion')");
    expect(f).toBe(0);
    await expect(otra.db.query("select public.laofi_admin_salon()")).resolves.toBeTruthy();
  });
});
