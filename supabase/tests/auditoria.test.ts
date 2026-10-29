// Auditoría QA (28/10/2026): cierres puntuales, titular publicado desde el panel,
// sábado «consultar» acotado y solicitudes de presupuesto de grupo.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;

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
let tel = 600100000;
const reservar = (p: Record<string, unknown>) =>
  pub<{ id: string; estado: string }>("laofi_crear_reserva", JSON.stringify({ nombre: "Ane", telefono: String(tel++), personas: 2, hora: "13:30", ...p }));

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`update laofi.ajustes set valor = '{"online": true, "max_personas": 12, "antelacion_dias": 60}' where clave = 'reservas'`);
}, 60_000);

describe("cierres puntuales", () => {
  it("se publican de hoy en adelante y bloquean las reservas de ese día", async () => {
    const festivo = proximo(2);
    await t.db.query(`update laofi.ajustes set valor = $1 where clave = 'cierres'`, [
      JSON.stringify({ fechas: [{ fecha: festivo, motivo: "Festivo" }, { fecha: "2020-01-01", motivo: "Pasado" }] }),
    ]);
    expect(await pub("laofi_get_cierres")).toEqual([{ fecha: festivo, motivo: "Festivo" }]);
    await expect(reservar({ fecha: festivo })).rejects.toThrow(/cerrados/);
    expect(await reservar({ fecha: proximo(3) })).toMatchObject({ estado: "PENDIENTE" });
  });

  it("un día de cierre no ofrece franjas de recogida", async () => {
    await t.db.exec(
      `update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 15, "capacidad": 5, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida';
       update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00';`,
    );
    const hayFranjas = async () => (await t.one<{ n: number }>("select count(*)::int as n from laofi.franjas_recogida_hoy()")).n > 0;
    // Muy cerca de medianoche no quedan franjas aunque el día esté abierto.
    const casiMedianoche = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }) > "23:40";
    if (!casiMedianoche) expect(await hayFranjas()).toBe(true);
    await t.db.query(`update laofi.ajustes set valor = $1 where clave = 'cierres'`, [JSON.stringify({ fechas: [{ fecha: hoy() }] })]);
    expect(await hayFranjas()).toBe(false);
    await t.db.exec(
      `update laofi.ajustes set valor = '{"fechas": []}' where clave = 'cierres';
       update laofi.horario set estado = 'abierto', desde = '07:30', hasta = case when dia = 5 then '00:00'::time else '17:00'::time end where dia <= 5;
       update laofi.horario set estado = 'consultar', desde = null, hasta = null where dia = 6;
       update laofi.horario set estado = 'cerrado', desde = null, hasta = null where dia = 7;`,
    );
  });
});

describe("sábado sin horario confirmado", () => {
  it("acepta horas dentro del horario más amplio de la semana y rechaza la madrugada", async () => {
    await expect(reservar({ fecha: proximo(6), hora: "03:00" })).rejects.toThrow(/fuera del horario \(07:30 a 23:59\)/);
    expect(await reservar({ fecha: proximo(6), hora: "21:00" })).toMatchObject({ estado: "PENDIENTE" });
  });
});

describe("presupuesto de grupo", () => {
  it("admite grupos grandes y días cerrados, y se guarda como pendiente", async () => {
    const domingo = proximo(7);
    await expect(reservar({ fecha: domingo, personas: 40 })).rejects.toThrow(/más de 12/);
    const r = await reservar({ fecha: domingo, personas: 40, espacio: "presupuesto", notas: "Empresa: Acme · Comida de empresa" });
    const fila = await t.one<{ espacio: string; personas: number; estado: string }>("select espacio, personas, estado from laofi.reservas where id = $1", [r.id]);
    expect(fila).toEqual({ espacio: "presupuesto", personas: 40, estado: "PENDIENTE" });
    await expect(reservar({ fecha: domingo, personas: 221, espacio: "presupuesto" })).rejects.toThrow(/más de 220/);
  });

  it("da un error claro con datos que no se pueden leer", async () => {
    await expect(reservar({ fecha: "mañana" })).rejects.toThrow(/Revisa el día/);
  });
});

describe("titular", () => {
  it("publica solo los datos legales del ajuste fiscal", async () => {
    expect(await pub("laofi_get_titular")).toEqual({ razon_social: null, nif: null, domicilio: null, registro: null, email: null });
    await t.db.exec(`update laofi.ajustes set valor = '{"razon_social": "La Ofi SL", "nif": "B00000000", "email": "hola@laofi.test", "otro": "x"}' where clave = 'fiscal'`);
    expect(await pub("laofi_get_titular")).toEqual({ razon_social: "La Ofi SL", nif: "B00000000", domicilio: null, registro: null, email: "hola@laofi.test" });
  });
});

describe("reversión", () => {
  it("deja las reservas y las funciones como antes", async () => {
    await revertirHasta(t.db, "20261028100000");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.reservas where espacio = 'presupuesto'");
    expect(n).toBe(0);
    await expect(t.one("select public.laofi_get_cierres($1)", [t.laOfi.site_key])).rejects.toThrow();
  });
});
