// Privacidad de las reservas (auditoría legal 28/10/2026): límite por conexión
// (ip_hash) y conservación (laofi.purgar_reservas).
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, type TestDb } from "./helpers";

let t: TestDb;

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const masDias = (n: number) => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

let tel = 611100000;
const reservar = (p: Record<string, unknown>) =>
  t.one<{ r: { id: string } }>(`select public.laofi_crear_reserva($1, $2) as r`, [
    t.laOfi.site_key,
    JSON.stringify({ nombre: "Ane", telefono: String(tel++), personas: 2, hora: "13:30", espacio: "presupuesto", fecha: masDias(10), ...p }),
  ]);

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(`update laofi.ajustes set valor = '{"online": true, "max_personas": 12, "antelacion_dias": 60}' where clave = 'reservas'`);
}, 60_000);

describe("límite por conexión", () => {
  it("admite 5 solicitudes por hora desde la misma IP y rechaza la sexta", async () => {
    const ip = "a".repeat(64);
    for (let i = 0; i < 5; i++) await reservar({ ip_hash: ip });
    await expect(reservar({ ip_hash: ip })).rejects.toThrow(/Demasiadas solicitudes/);
    await expect(reservar({ ip_hash: "b".repeat(64) })).resolves.toBeTruthy();
  });

  it("ignora un ip_hash con formato no válido", async () => {
    const { r } = await reservar({ ip_hash: "no-es-un-hash" });
    const { ip_hash } = await t.one<{ ip_hash: string | null }>(`select ip_hash from laofi.reservas where id = $1`, [r.id]);
    expect(ip_hash).toBeNull();
  });
});

describe("conservación", () => {
  it("borra las notas pasadas, el ip_hash antiguo y anonimiza lo de hace más de un año", async () => {
    const { r: pasada } = await reservar({ notas: "Alergia al marisco" });
    const { r: vieja } = await reservar({ notas: "Celíaco", email: "ane@example.com" });
    const { r: futura } = await reservar({ notas: "Trona", ip_hash: "c".repeat(64) });
    await t.db.query(`update laofi.reservas set fecha = current_date - 2 where id = $1`, [pasada.id]);
    await t.db.query(`update laofi.reservas set fecha = current_date - interval '13 months', created_at = now() - interval '13 months' where id = $1`, [vieja.id]);
    await t.db.query(`update laofi.reservas set ip_hash = $2, created_at = now() - interval '31 days' where id = $1`, [pasada.id, "d".repeat(64)]);

    await t.db.exec(`select laofi.purgar_reservas()`);

    const fila = (id: string) =>
      t.one<{ nombre: string; telefono: string; email: string | null; notas: string | null; ip_hash: string | null }>(
        `select nombre, telefono, email, notas, ip_hash from laofi.reservas where id = $1`,
        [id],
      );
    expect(await fila(pasada.id)).toMatchObject({ nombre: "Ane", notas: null, ip_hash: null });
    expect(await fila(vieja.id)).toMatchObject({ nombre: "Anonimizada", telefono: "0000 0000", email: null, notas: null });
    expect(await fila(futura.id)).toMatchObject({ nombre: "Ane", notas: "Trona", ip_hash: "c".repeat(64) });
  });

  it("solo la puede ejecutar el sistema, no los visitantes", async () => {
    await expect(t.db.exec(`set role anon; select laofi.purgar_reservas();`)).rejects.toThrow();
    await t.db.exec(`reset role`);
  });
});
