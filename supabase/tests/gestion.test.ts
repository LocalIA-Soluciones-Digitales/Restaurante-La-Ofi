// Gestión: reservas (pública y admin), menú del día en una operación, ventas,
// fidelización y reseñas apagadas por defecto y TicketBAI solo para service_role.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, STAFF_LAOFI, type TestDb } from "./helpers";

let t: TestDb;
let mesa: string;

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const masDias = (n: number) => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Próxima fecha (a partir de mañana) con ese día ISO (1 = lunes … 7 = domingo). */
const proximo = (isodow: number) => {
  for (let i = 1; i <= 7; i++) {
    const f = masDias(i);
    const dow = ((new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    if (dow === isodow) return f;
  }
  throw new Error("imposible");
};

async function pub<T>(fn: string, ...args: unknown[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 2}`).join(", ");
  const { r } = await t.one<{ r: T }>(`select public.${fn}($1${ph ? `, ${ph}` : ""}) as r`, [t.laOfi.site_key, ...args]);
  return r;
}
async function admin<T>(fn: string, ...args: unknown[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  return t.como("authenticated", STAFF_LAOFI, "dueno@laofi.test", async () => (await t.one<{ r: T }>(`select public.${fn}(${ph}) as r`, args)).r);
}
const reservar = (p: Record<string, unknown>) =>
  pub<{ id: string; estado: string }>("laofi_crear_reserva", JSON.stringify({ nombre: "Ane", telefono: "600111222", personas: 2, hora: "13:30", ...p }));

beforeAll(async () => {
  t = await crearBd();
  ({ id: mesa } = await t.one<{ id: string }>("insert into laofi.mesas (numero, capacidad) values ('20', 4) returning id"));
}, 60_000);

describe("reservas online", () => {
  it("están desactivadas por defecto", async () => {
    await expect(reservar({ fecha: proximo(2) })).rejects.toThrow(/no están activas/);
  });

  it("validan horario, día cerrado, tamaño de grupo y el campo trampa", async () => {
    await t.db.exec(`update laofi.ajustes set valor = '{"online": true, "max_personas": 8, "antelacion_dias": 60}' where clave = 'reservas'`);
    await expect(reservar({ fecha: proximo(7) })).rejects.toThrow(/cerrados/);
    await expect(reservar({ fecha: proximo(2), hora: "18:00" })).rejects.toThrow(/fuera del horario/);
    await expect(reservar({ fecha: proximo(2), personas: 9 })).rejects.toThrow(/más de 8/);
    await expect(reservar({ fecha: proximo(2), web: "http://spam" })).rejects.toThrow(/no válida/);
    await expect(reservar({ fecha: masDias(90) })).rejects.toThrow(/periodo/);
  });

  it("crea la reserva como PENDIENTE y frena abusos por teléfono", async () => {
    const f = proximo(3);
    expect(await reservar({ fecha: f })).toMatchObject({ estado: "PENDIENTE" });
    await reservar({ fecha: f, hora: "14:00" });
    await expect(reservar({ fecha: f, hora: "14:30" })).rejects.toThrow(/Ya tienes reservas/);
  });
});

describe("reservas en el panel", () => {
  it("asigna mesas, la sienta al cambiar a SENTADA y el salón ve las reservas próximas", async () => {
    const ahora = new Date(Date.now() + 40 * 60_000).toLocaleTimeString("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
    const r = await admin<{ id: string; mesas: { id: string }[] }>(
      "laofi_admin_guardar_reserva",
      JSON.stringify({ nombre: "Comida de empresa", telefono: "944000000", personas: 6, fecha: hoy(), hora: ahora, mesas: [mesa] }),
    );
    expect(r.mesas.map((m) => m.id)).toEqual([mesa]);
    const salon = await admin<{ mesas: { id: string; reserva: { nombre: string } | null }[] }>("laofi_admin_salon");
    // Muy cerca de medianoche la hora "en 40 min" cae en el día siguiente: no se comprueba.
    if (ahora > "00:40") expect(salon.mesas.find((m) => m.id === mesa)?.reserva?.nombre).toBe("Comida de empresa");
    await admin("laofi_admin_reserva_estado", r.id, "SENTADA");
    const m = await t.one<{ ocupada: boolean; comensales: number }>("select ocupada, comensales from laofi.mesas where id = $1", [mesa]);
    expect(m).toEqual({ ocupada: true, comensales: 6 });
  });
});

describe("fidelización (apagada por defecto)", () => {
  it("sin activar no guarda comensales; activada concede el premio al cumplir la regla", async () => {
    const f = proximo(4);
    const a = await admin<{ id: string; comensal_id: string | null }>("laofi_admin_guardar_reserva", JSON.stringify({ nombre: "Jon", telefono: "611 222 333", personas: 2, fecha: f, hora: "13:00" }));
    expect(a.comensal_id).toBeNull();

    await t.db.exec(`update laofi.ajustes set valor = '{"activa": true}' where clave = 'fidelizacion'`);
    await t.db.exec(`insert into laofi.reglas_promocion (nombre, visitas_requeridas, premio) values ('Cada 2 comidas', 2, 'Café gratis')`);
    const b = await admin<{ id: string }>("laofi_admin_guardar_reserva", JSON.stringify({ nombre: "Jon", telefono: "611222333", personas: 2, fecha: f, hora: "13:30" }));
    const c = await admin<{ id: string }>("laofi_admin_guardar_reserva", JSON.stringify({ nombre: "Jon", telefono: "+34 611 222 333", personas: 2, fecha: f, hora: "14:00" }));
    await admin("laofi_admin_reserva_estado", b.id, "SENTADA");
    await admin("laofi_admin_reserva_estado", c.id, "SENTADA");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.premios_otorgados");
    expect(n).toBe(1);
  });
});

describe("reseñas (apagadas por defecto)", () => {
  it("no se aceptan ni se publican hasta activarlas, y solo salen las aprobadas", async () => {
    await expect(pub("laofi_crear_resena", JSON.stringify({ nombre: "Ana", puntuacion: 5, texto: "Muy buen menú del día" }))).rejects.toThrow(/no están activas/);
    await t.db.exec(`update laofi.ajustes set valor = '{"activa": true}' where clave = 'resenas'`);
    await pub("laofi_crear_resena", JSON.stringify({ nombre: "Ana", puntuacion: 5, texto: "Muy buen menú del día" }));
    expect(await pub<unknown[]>("laofi_get_resenas")).toEqual([]);
    await t.db.exec(`update laofi.resenas set estado = 'APROBADA'`);
    expect(await pub<unknown[]>("laofi_get_resenas")).toHaveLength(1);
  });
});

describe("menú del día en una operación", () => {
  it("guarda el menú y sustituye sus platos; la web lo ve al momento", async () => {
    const menu = (platos: string[]) =>
      admin("laofi_admin_guardar_menu_dia", JSON.stringify({ fecha: hoy(), precio_centimos: 1250, pan_incluido: true, platos: platos.map((nombre) => ({ tipo: "plato", nombre })) }));
    await menu(["Lentejas", "Merluza"]);
    await menu(["Alubias", "Carrilleras", "Ensalada"]);
    const m = await pub<{ precio_centimos: number; platos: { nombre: string }[] }>("laofi_get_menu_dia");
    expect(m.precio_centimos).toBe(1250);
    expect(m.platos.map((p) => p.nombre)).toEqual(["Alubias", "Carrilleras", "Ensalada"]);
  });
});

describe("ventas", () => {
  it("agrega ventas por día, hora, producto, camarero y tipo", async () => {
    const { id: prod } = await t.one<{ id: string }>("select id from laofi.productos where precio_centimos is not null limit 1");
    await admin("laofi_admin_crear_pedido", JSON.stringify({ tipo: "BARRA", items: [{ producto_id: prod, cantidad: 3 }] }));
    const v = await admin<{ resumen: { pedidos: number; productos_vendidos: number }; por_producto: unknown[]; por_hora: unknown[]; por_tipo: { tipo: string }[] }>(
      "laofi_admin_ventas",
      hoy(),
      hoy(),
    );
    expect(v.resumen).toMatchObject({ pedidos: 1, productos_vendidos: 3 });
    expect(v.por_producto).toHaveLength(1);
    expect(v.por_tipo[0]!.tipo).toBe("BARRA");
  });
});

describe("TicketBAI", () => {
  it("solo service_role escribe; la numeración es correlativa y un borrador no firmado no deja hueco", async () => {
    const datos = JSON.stringify({ pedido_ids: [], serie: "WEB", nif_emisor: "B00000000", razon_social_emisor: "X", importe_total_centimos: 100, desglose_iva: [], lineas: [] });
    await expect(admin("laofi_tbai_crear", datos)).rejects.toThrow(/permission denied/);
    const rpc = (sql: string, args: unknown[]) => t.como("service_role", "", "", async () => (await t.one<{ r: { id: string; numero: number } }>(sql, args)).r);
    const a = await rpc("select public.laofi_tbai_crear($1) as r", [datos]);
    expect(a.numero).toBe(1);
    // La firma falló (sigue en BORRADOR): el reintento vuelve a ser el nº 1.
    const b = await rpc("select public.laofi_tbai_crear($1) as r", [datos]);
    expect(b.numero).toBe(1);
    await rpc("select public.laofi_tbai_actualizar($1, $2) as r", [b.id, JSON.stringify({ estado: "FIRMADA", signature_value: "x".repeat(120) })]);
    const c = await rpc("select public.laofi_tbai_crear($1) as r", [datos]);
    expect(c.numero).toBe(2);
    const { enc } = await t.one<{ enc: number }>("select encadenamiento_numero_anterior as enc from laofi.ticketbai_facturas where id = $1", [c.id]);
    expect(enc).toBe(1);
  });
});

describe("alta de staff", () => {
  it("solo service_role vincula una cuenta nueva a La Ofi con su rol", async () => {
    const nuevo = "00000000-0000-4000-8000-0000000000e1";
    await expect(admin("laofi_vincular_staff", nuevo, "Iratxe", "camarero")).rejects.toThrow(/permission denied/);
    await t.como("service_role", "", "", () => t.db.query("select public.laofi_vincular_staff($1, 'Iratxe', 'camarero')", [nuevo]));
    const yo = await t.como("authenticated", nuevo, "iratxe@laofi.test", async () => (await t.one<{ r: { rol: string } }>("select public.laofi_admin_yo() as r")).r);
    expect(yo.rol).toBe("camarero");
  });
});

describe("reversión", () => {
  it("elimina la gestión y restaura las funciones anteriores del salón", async () => {
    await revertirHasta(t.db, "20261002130000");
    const r = await t.one<{ reservas: number; salon: string }>(
      `select (select count(*)::int from pg_tables where schemaname = 'laofi' and tablename = 'reservas') as reservas,
              (select prosrc from pg_proc where proname = 'laofi_admin_salon') as salon`,
    );
    expect(r.reservas).toBe(0);
    expect(r.salon).not.toContain("reserva_proxima");
  });
});
