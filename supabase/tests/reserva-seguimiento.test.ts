// Seguimiento de la reserva por el cliente: /reserva/<id> y cancelarla él mismo.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;

interface ReservaPublica {
  id: string;
  nombre: string;
  fecha: string;
  hora: string;
  personas: number;
  estado: string;
  cancelable: boolean;
  evento: { titulo: string; slug: string } | null;
  comida: { modo: string; lineas: { nombre: string; cantidad: number }[] } | null;
}

let tel = 644400000;
const reserva = async (extra: { dias?: number; hora?: string; estado?: string; nombre?: string; espacio?: string } = {}) =>
  (
    await t.one<{ id: string }>(
      `insert into laofi.reservas (nombre, telefono, email, personas, fecha, hora, espacio, estado, origen, notas, comida)
       values ($1, $2, 'ane@example.com', 3, (now() at time zone 'Europe/Madrid')::date + $3::int, $4, $5, $6, 'web', 'Celíaca',
               '{"modo": "carta", "lineas": [{"id": "x", "nombre": "Chuletón", "cantidad": 2, "precio_centimos": 4500}]}')
       returning id`,
      [extra.nombre ?? "Ane Etxeberria", String(tel++), extra.dias ?? 2, extra.hora ?? "14:00", extra.espacio ?? "mesa", extra.estado ?? "PENDIENTE"],
    )
  ).id;

const anon = <T>(sql: string, params: unknown[]) => t.como("anon", "", "", () => t.one<T>(sql, params));
const ver = async (id: string, siteKey = t.laOfi.site_key) =>
  (await anon<{ r: ReservaPublica | null }>("select public.laofi_get_reserva($1, $2) as r", [siteKey, id])).r;
const cancelar = async (id: string) => (await anon<{ r: ReservaPublica }>("select public.laofi_cancelar_reserva($1, $2) as r", [t.laOfi.site_key, id])).r;

beforeAll(async () => {
  t = await crearBd();
  await t.db.query("insert into public.settings (cliente_id, key, value) values ($1, 'push_notify_url', '\"https://push.test/notify\"')", [t.laOfi.id]);
}, 60_000);

describe("ver la reserva", () => {
  it("enseña el estado y lo reservado, sin teléfono, email ni notas", async () => {
    const id = await reserva();
    const r = await ver(id);
    expect(r).toMatchObject({ id, nombre: "Ane", hora: "14:00", personas: 3, estado: "PENDIENTE", cancelable: true, evento: null });
    expect(r!.comida).toEqual({ modo: "carta", lineas: [{ nombre: "Chuletón", cantidad: 2 }] });
    expect(JSON.stringify(r)).not.toMatch(/644|example\.com|Celíaca|precio/);
  });

  it("con la site_key de otro negocio, nada", async () => {
    expect(await ver(await reserva(), t.otro.site_key)).toBeNull();
  });

  it("ni las de hace más de 30 días ni las anonimizadas", async () => {
    expect(await ver(await reserva({ dias: -31 }))).toBeNull();
    expect(await ver(await reserva({ nombre: "Anonimizada" }))).toBeNull();
  });
});

describe("cancelarla", () => {
  it("la cancela, avisa al local y repetirlo no falla", async () => {
    const id = await reserva({ estado: "CONFIRMADA" });
    await t.db.exec("delete from net.peticiones_test");
    expect(await cancelar(id)).toMatchObject({ estado: "CANCELADA", cancelable: false });
    const { body } = await t.one<{ body: { titulo: string; cuerpo: string } }>("select body from net.peticiones_test");
    expect(body.titulo).toBe("Cancelan una reserva");
    expect(body.cuerpo).toMatch(/^Ane Etxeberria · 3 pers\. · .+ a las 14:00$/);
    expect(await cancelar(id)).toMatchObject({ estado: "CANCELADA" });
  });

  it("no deja cancelar las ya pasadas, sentadas o no presentadas", async () => {
    await expect(cancelar(await reserva({ dias: -1 }))).rejects.toThrow(/llámanos/);
    await expect(cancelar(await reserva({ estado: "SENTADA" }))).rejects.toThrow(/llámanos/);
    await expect(cancelar(await reserva({ estado: "NO_SHOW" }))).rejects.toThrow(/llámanos/);
    expect((await ver(await reserva({ dias: -1 })))!.cancelable).toBe(false);
  });

  it("un id que no existe", async () => {
    await expect(cancelar("00000000-0000-4000-8000-00000000dead")).rejects.toThrow(/no encontrada/);
  });
});

describe("reversión", () => {
  it("quita las funciones", async () => {
    await revertirHasta(t.db, "20261102120000");
    const { n } = await t.one<{ n: number }>(
      "select count(*)::int as n from pg_proc where proname in ('laofi_get_reserva', 'laofi_cancelar_reserva', 'reserva_publica_json')",
    );
    expect(n).toBe(0);
  });
});
