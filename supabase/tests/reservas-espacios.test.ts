// Reservas por espacios (visita a Carlos, 29/10/2026): El Despacho por personas
// hasta su aforo y solo de carta; comedor con menú del día, carta o solo mesa;
// recogida de menús del día; el menú solo se ve el mismo día y en su franja.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;
let menuPlatos: { id: string; nombre: string }[];

const madrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
const hoy = () => madrid().slice(0, 10);
const masDias = (n: number) => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Próximo viernes (abierto de 7:30 a 00:00 en el horario publicado), o el de `semanas` después. */
const viernes = (semanas = 0) => {
  for (let i = 1; i <= 7; i++) {
    const f = masDias(i + semanas * 7);
    if (new Date(`${f}T12:00:00Z`).getUTCDay() === 5) return f;
  }
  throw new Error("imposible");
};
/** Una hora de hoy dentro de 45 minutos (null si ya es tarde para probarlo hoy). */
const horaHoy = () => {
  const [h, m] = madrid().slice(12, 17).split(":").map(Number) as [number, number];
  const min = h * 60 + m + 45;
  return min >= 23 * 60 ? null : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
};

let tel = 622200000;
const reservar = <T = { id: string }>(p: Record<string, unknown>) =>
  t.one<{ r: T }>(`select public.laofi_crear_reserva($1, $2) as r`, [
    t.laOfi.site_key,
    JSON.stringify({ nombre: "Ane", telefono: String(tel++), personas: 2, hora: "13:30", fecha: viernes(), ...p }),
  ]).then((x) => x.r);
const fila = (id: string) => t.one<{ espacio: string; personas: number; comida: { modo: string; lineas: { nombre: string; cantidad: number; precio_centimos?: number }[] } | null }>(
  "select espacio, personas, comida from laofi.reservas where id = $1",
  [id],
);

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`update laofi.ajustes set valor = '{"online": true, "max_personas": 12, "antelacion_dias": 60}' where clave = 'reservas'`);
  // Hoy abierto todo el día, para probar el menú del día sea cual sea el día de la semana.
  await t.db.query("update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00' where dia = extract(isodow from $1::date)", [hoy()]);
  const { id } = await t.one<{ id: string }>("insert into laofi.menus_dia (fecha, precio_centimos) values ($1, 1250) returning id", [hoy()]);
  menuPlatos = (
    await t.db.query<{ id: string; nombre: string }>(
      "insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values ($1, 'primero', 'Lentejas', 1), ($1, 'segundo', 'Merluza', 2) returning id, nombre",
      [id],
    )
  ).rows;
}, 60_000);

describe("El Despacho", () => {
  it("admite reservas por personas hasta el aforo de 30 por turno", async () => {
    const f = viernes();
    await reservar({ espacio: "despacho", personas: 20, fecha: f });
    await reservar({ espacio: "despacho", personas: 10, fecha: f });
    await expect(reservar({ espacio: "despacho", personas: 1, fecha: f })).rejects.toThrow(/completo/);
    // La noche es otro turno.
    await expect(reservar({ espacio: "despacho", personas: 8, fecha: f, hora: "20:30" })).resolves.toBeTruthy();
    const p = await t.one<{ r: { aforo: number; comida: number; noche: number } }>("select public.laofi_plazas_despacho($1, $2) as r", [t.laOfi.site_key, f]);
    expect(p.r).toEqual({ aforo: 30, comida: 0, noche: 22 });
  });

  it("dice cuántas plazas quedan si no caben todos", async () => {
    await reservar({ espacio: "despacho", personas: 26, fecha: viernes(1), hora: "21:00" });
    await expect(reservar({ espacio: "despacho", personas: 6, fecha: viernes(1), hora: "21:30" })).rejects.toThrow(/quedan 4 plazas/);
  });

  it("las canceladas liberan plazas", async () => {
    const f = viernes();
    await t.db.query("update laofi.reservas set estado = 'CANCELADA' where espacio = 'despacho' and fecha = $1 and hora < '17:00' and personas = 10", [f]);
    await expect(reservar({ espacio: "despacho", personas: 10, fecha: f })).resolves.toBeTruthy();
  });

  it("solo es de carta: rechaza el menú del día", async () => {
    await expect(reservar({ espacio: "despacho", personas: 2, comida: { modo: "menu", lineas: [] } })).rejects.toThrow(/carta/);
  });

  it("guarda los platos de carta con nombre y precio copiados", async () => {
    const { id: prod, nombre, precio_centimos } = await t.one<{ id: string; nombre: string; precio_centimos: number }>(
      "select id, nombre, precio_centimos from laofi.productos where disponible and precio_centimos is not null limit 1",
    );
    const { id } = await reservar({ espacio: "despacho", personas: 2, fecha: viernes(2), hora: "19:00", comida: { modo: "carta", lineas: [{ id: prod, cantidad: 2 }, { id: prod, cantidad: 1 }] } });
    expect((await fila(id)).comida).toEqual({ modo: "carta", lineas: [{ id: prod, nombre, precio_centimos, cantidad: 3 }] });
  });
});

describe("comedor", () => {
  it("se puede reservar solo la mesa, sin elegir comida", async () => {
    const { id } = await reservar({ espacio: "mesa", comida: { modo: "nada" } });
    expect((await fila(id)).comida).toBeNull();
  });

  it("el menú del día solo se reserva para hoy", async () => {
    await expect(reservar({ espacio: "mesa", comida: { modo: "menu", lineas: [] } })).rejects.toThrow(/mismo día/);
  });

  it.skipIf(horaHoy() === null)("con menú del día guarda los platos elegidos de hoy e ignora los que no son del menú", async () => {
    const [lentejas] = menuPlatos;
    const { id } = await reservar({
      espacio: "mesa",
      fecha: hoy(),
      hora: horaHoy(),
      comida: { modo: "menu", lineas: [{ id: lentejas!.id, cantidad: 2 }, { id: "00000000-0000-4000-8000-000000000999", cantidad: 1 }] },
    });
    expect((await fila(id)).comida).toMatchObject({ modo: "menu", lineas: [{ nombre: "Lentejas", cantidad: 2 }] });
  });

  it("rechaza ids de plato con formato no válido", async () => {
    await expect(reservar({ espacio: "mesa", comida: { modo: "carta", lineas: [{ id: "x", cantidad: 1 }] } })).rejects.toThrow(/Revisa los platos/);
  });
});

describe("recogida de menús del día", () => {
  it.skipIf(horaHoy() === null)("exige elegir platos del menú de hoy", async () => {
    await expect(reservar({ espacio: "recogida", fecha: hoy(), hora: horaHoy(), personas: 2, comida: { modo: "menu", lineas: [] } })).rejects.toThrow(/Elige los platos/);
    const { id } = await reservar({
      espacio: "recogida",
      fecha: hoy(),
      hora: horaHoy(),
      personas: 2,
      comida: { modo: "menu", lineas: menuPlatos.map((p) => ({ id: p.id, cantidad: 2 })) },
    });
    expect(await fila(id)).toMatchObject({ espacio: "recogida", personas: 2 });
  });

  it("no admite carta", async () => {
    await expect(reservar({ espacio: "recogida", comida: { modo: "carta", lineas: [] } })).rejects.toThrow(/menú del día/);
  });
});

describe("franja del menú del día", () => {
  it("fuera de la franja la web no ve el menú ni se puede reservar con él", async () => {
    const ver = () => t.one<{ m: unknown }>("select public.laofi_get_menu_dia($1) as m", [t.laOfi.site_key]).then((x) => x.m);
    expect(await ver()).not.toBeNull();
    // Una franja que ya ha pasado o aún no ha llegado (de 00:00 a 00:01).
    await t.db.exec(`update laofi.ajustes set valor = '{"desde": "00:00", "hasta": "00:01"}' where clave = 'menu_dia'`);
    try {
      if (madrid().slice(12, 17) >= "00:01") {
        expect(await ver()).toBeNull();
        await expect(reservar({ espacio: "mesa", fecha: hoy(), hora: horaHoy() ?? "23:30", comida: { modo: "menu", lineas: [] } })).rejects.toThrow(/se puede pedir de 00:00 a 00:01/);
      }
      const cfg = await t.one<{ c: { menu_desde: string; menu_hasta: string; aforo_despacho: number } }>("select public.laofi_get_config_reservas($1) as c", [t.laOfi.site_key]);
      expect(cfg.c).toMatchObject({ menu_desde: "00:00", menu_hasta: "00:01", aforo_despacho: 30 });
    } finally {
      await t.db.exec(`update laofi.ajustes set valor = '{"desde": "00:00", "hasta": "24:00"}' where clave = 'menu_dia'`);
    }
  });

  it("no enseña el menú de mañana aunque ya esté cargado", async () => {
    await t.db.query("insert into laofi.menus_dia (fecha, precio_centimos) values ($1, 1250)", [masDias(1)]);
    const { m } = await t.one<{ m: unknown }>("select public.laofi_get_menu_dia($1, $2) as m", [t.laOfi.site_key, masDias(1)]);
    expect(m).toBeNull();
  });
});

describe("eventos", () => {
  it("devuelven aviso_web (por defecto, sí)", async () => {
    await t.db.query("insert into laofi.eventos (slug, titulo, fecha, publicado) values ('tardeo-test', 'Tardeo', $1, true)", [masDias(3)]);
    const { e } = await t.one<{ e: { aviso_web: boolean }[] }>("select public.laofi_get_eventos($1) as e", [t.laOfi.site_key]);
    expect(e.find((x) => (x as unknown as { slug: string }).slug === "tardeo-test")?.aviso_web).toBe(true);
  });
});

describe("reversión", () => {
  it("vuelve al esquema anterior", async () => {
    await revertirHasta(t.db, "20261029100000");
    const { n } = await t.one<{ n: number }>(
      "select count(*)::int as n from information_schema.columns where table_schema = 'laofi' and ((table_name = 'reservas' and column_name = 'comida') or (table_name = 'eventos' and column_name = 'aviso_web'))",
    );
    expect(n).toBe(0);
  });
});
