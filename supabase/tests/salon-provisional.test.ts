// Distribución provisional del salón (seed/la_ofi_salon_provisional.sql):
// idempotente, cada mesa dentro de su zona y sin solapes (ni con los mástiles
// de la carpa que dibuja el plano 3D).
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, type TestDb } from "./helpers";

let t: TestDb;

interface Fila {
  numero: string;
  forma: string;
  capacidad: number;
  x: number;
  y: number;
  zx: number;
  zy: number;
  zw: number;
  zh: number;
  tipo: string;
}

const filas = async () =>
  (
    await t.db.query<Fila>(
      `select m.numero, m.forma, m.capacidad, m.pos_x::float8 as x, m.pos_y::float8 as y,
              z.x::float8 as zx, z.y::float8 as zy, z.ancho::float8 as zw, z.alto::float8 as zh, z.tipo
       from laofi.mesas m join laofi.zonas z on z.id = m.zona_id`,
    )
  ).rows;

// El lienzo es 1000×620: pasar % a unidades proporcionales para medir distancias reales.
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot((a.x - b.x) * 10, (a.y - b.y) * 6.2);

beforeAll(async () => {
  t = await crearBd();
  for (let i = 0; i < 2; i++) await t.db.exec(read("seed/la_ofi_salon_provisional.sql"));
}, 60_000);

describe("salón provisional", () => {
  it("se puede aplicar dos veces sin duplicar nada", async () => {
    const { z, m } = await t.one<{ z: number; m: number }>("select (select count(*)::int from laofi.zonas) as z, (select count(*)::int from laofi.mesas) as m");
    expect(z).toBe(5);
    expect(m).toBe(31);
  });

  it("cada mesa tiene QR propio y cae dentro de su zona", async () => {
    const { sin } = await t.one<{ sin: number }>("select count(*)::int as sin from laofi.mesas where token is null or length(token) < 8");
    expect(sin).toBe(0);
    for (const f of await filas()) {
      expect(f.x, f.numero).toBeGreaterThan(f.zx);
      expect(f.x, f.numero).toBeLessThan(f.zx + f.zw);
      expect(f.y, f.numero).toBeGreaterThan(f.zy);
      expect(f.y, f.numero).toBeLessThan(f.zy + f.zh);
    }
  });

  it("ninguna mesa se solapa con otra (con sus sillas)", async () => {
    const lista = await filas();
    for (let i = 0; i < lista.length; i++)
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i]!;
        const b = lista[j]!;
        // Radio aproximado con sillas (lienzo de 1000 de ancho = 20 m de escena):
        // mesa alta con taburetes ~32, mesa de 4 ~55, mesa larga ~110.
        const radio = (f: Fila) => (f.forma === "rectangular" ? 110 : f.forma === "taburete" ? 32 : 55);
        expect(dist(a, b), `${a.numero}–${b.numero}`).toBeGreaterThan(Math.min(radio(a), radio(b)) * 1.4);
      }
  });

  it("las mesas de la terraza dejan libres los mástiles interiores de la carpa", async () => {
    const lista = (await filas()).filter((f) => f.tipo === "terraza");
    const z = lista[0]!;
    const cy = z.zy + z.zh / 2;
    for (const mx of [z.zx + z.zw / 4, z.zx + (3 * z.zw) / 4])
      for (const f of lista) expect(dist(f, { x: mx, y: cy }), f.numero).toBeGreaterThan(55);
  });
});
