// Programa de un evento: varias partes el mismo día (actuación a mediodía, DJ por la tarde).
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, type TestDb } from "./helpers";

let t: TestDb;

beforeAll(async () => {
  t = await crearBd();
}, 60_000);

const PROGRAMA = [
  { hora: "13:00", hora_fin: null, titulo: "La Mara en directo", descripcion: null, imagen: null },
  { hora: "17:00", hora_fin: "23:30", titulo: "Tardeo 80's y 90's", descripcion: "The Art DJ's", imagen: null },
];

describe("programa", () => {
  it("lo devuelve la API pública, en orden", async () => {
    await t.db.query("insert into laofi.eventos (slug, titulo, fecha, publicado, programa) values ('fiesta-test', 'Fiesta', current_date + 5, true, $1)", [
      JSON.stringify(PROGRAMA),
    ]);
    const { e } = await t.one<{ e: { programa: typeof PROGRAMA } }>("select public.laofi_get_evento($1, 'fiesta-test') as e", [t.laOfi.site_key]);
    expect(e.programa.map((p) => p.titulo)).toEqual(["La Mara en directo", "Tardeo 80's y 90's"]);
  });

  it("vacío por defecto", async () => {
    await t.db.query("insert into laofi.eventos (slug, titulo, fecha, publicado) values ('sin-programa', 'X', current_date + 5, true)");
    const { e } = await t.one<{ e: { programa: unknown[] } }>("select public.laofi_get_evento($1, 'sin-programa') as e", [t.laOfi.site_key]);
    expect(e.programa).toEqual([]);
  });

  it("solo admite una lista", async () => {
    await expect(t.db.query("insert into laofi.eventos (slug, titulo, fecha, programa) values ('mal', 'X', current_date, '{}')")).rejects.toThrow();
  });
});

describe("reversión", () => {
  it("quita la columna", async () => {
    await revertirHasta(t.db, "20261031100000");
    const { n } = await t.one<{ n: number }>(
      "select count(*)::int as n from information_schema.columns where table_schema = 'laofi' and table_name = 'eventos' and column_name = 'programa'",
    );
    expect(n).toBe(0);
  });
});
