// Verificación de las migraciones de La Ofi contra un Postgres real en memoria
// (PGlite), sin Docker ni tocar el proyecto Supabase compartido. Reproduce el
// núcleo de la plataforma (platform-stub.sql) y comprueba aislamiento entre
// tenants, RLS, permisos y RPC públicas.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const migrations = readdirSync(path.join(ROOT, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

let db: PGlite;
let laOfi: { id: string; site_key: string };
let otro: { id: string; site_key: string };

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<T>(sql, params);
  return rows[0]!;
}

async function comoUsuario<T>(userId: string | null, email: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${userId ?? ""}'; set test.email = '${email ?? ""}'; set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; reset test.uid; reset test.email;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("tests/platform-stub.sql"));
  for (const file of migrations) await db.exec(read(`migrations/${file}`));
  await db.exec(read("seed/la_ofi_tenant.sql"));
  laOfi = await one("select id, site_key from public.clientes where slug = 'restaurante-la-ofi'");
  otro = await one(
    "insert into public.clientes (nombre_negocio, slug) values ('Otro bar', 'otro-bar') returning id, site_key",
  );
}, 60_000);

describe("seed del tenant", () => {
  it("da de alta La Ofi activa y es idempotente", async () => {
    await db.exec(read("seed/la_ofi_tenant.sql"));
    const { n } = await one<{ n: number }>("select count(*)::int as n from public.clientes where slug = 'restaurante-la-ofi'");
    expect(n).toBe(1);
    expect(laOfi.site_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("la carta publicada opcional inserta 19 platos sin alérgenos inventados y no duplica", async () => {
    await db.exec(read("seed/la_ofi_carta_publicada.sql"));
    await db.exec(read("seed/la_ofi_carta_publicada.sql"));
    const r = await one<{ n: number; sin_alergenos: boolean }>(
      "select count(*)::int as n, bool_and(alergenos = '{}') as sin_alergenos from restaurant.productos where cliente_id = $1",
      [laOfi.id],
    );
    expect(r).toEqual({ n: 19, sin_alergenos: true });
  });
});

describe("menú del día", () => {
  beforeAll(async () => {
    const hoy = "(now() at time zone 'Europe/Madrid')::date";
    const { id } = await one<{ id: string }>(
      `insert into restaurant.menus_dia (cliente_id, fecha, precio_centimos, pan_incluido) values ($1, ${hoy}, 1450, true) returning id`,
      [laOfi.id],
    );
    await db.query(
      `insert into restaurant.menu_dia_platos (cliente_id, menu_id, tipo, nombre, alergenos, orden) values
        ($1, $2, 'primero', 'Ensalada', '{}', 1), ($1, $2, 'segundo', 'Merluza', '{pescado}', 1), ($1, $2, 'postre', 'Flan', '{huevo,lácteos}', 1),
        ($1, $2, 'plato', 'Secreto con patatas', '{}', 1)`,
      [laOfi.id, id],
    );
    await db.query(`insert into restaurant.menus_dia (cliente_id, fecha, precio_centimos) values ($1, ${hoy}, 999)`, [otro.id]);
  });

  it("devuelve el menú de hoy del tenant con sus platos (incluido el plato del día a elegir)", async () => {
    const { m } = await one<{ m: { precio_centimos: number; platos: unknown[] } }>(
      "select public.get_menu_dia_publico($1) as m",
      [laOfi.site_key],
    );
    expect(m.precio_centimos).toBe(1450);
    expect(m.platos).toHaveLength(4);
  });

  it("no devuelve nada con una site_key inventada", async () => {
    const { m } = await one<{ m: unknown }>("select public.get_menu_dia_publico(gen_random_uuid()) as m");
    expect(m).toBeNull();
  });

  it("no devuelve nada si el tenant está pausado", async () => {
    await db.query("update public.clientes set estado = 'pausado' where id = $1", [laOfi.id]);
    const { m } = await one<{ m: unknown }>("select public.get_menu_dia_publico($1) as m", [laOfi.site_key]);
    await db.query("update public.clientes set estado = 'activo' where id = $1", [laOfi.id]);
    expect(m).toBeNull();
  });

  it("impide colgar un plato de un menú de otro tenant (FK compuesta)", async () => {
    const { id } = await one<{ id: string }>("select id from restaurant.menus_dia where cliente_id = $1", [laOfi.id]);
    await expect(
      db.query("insert into restaurant.menu_dia_platos (cliente_id, menu_id, tipo, nombre) values ($1, $2, 'primero', 'X')", [otro.id, id]),
    ).rejects.toThrow();
  });

  it("rechaza tipos de plato desconocidos y menús duplicados para la misma fecha", async () => {
    const { id } = await one<{ id: string }>("select id from restaurant.menus_dia where cliente_id = $1", [laOfi.id]);
    await expect(
      db.query("insert into restaurant.menu_dia_platos (cliente_id, menu_id, tipo, nombre) values ($1, $2, 'cafe', 'X')", [laOfi.id, id]),
    ).rejects.toThrow();
    await expect(
      db.query("insert into restaurant.menus_dia (cliente_id, fecha) values ($1, (now() at time zone 'Europe/Madrid')::date)", [laOfi.id]),
    ).rejects.toThrow();
  });
});

describe("eventos", () => {
  beforeAll(async () => {
    await db.query(
      `insert into restaurant.eventos (cliente_id, titulo, slug, fecha, estado, publicado) values
        ($1, 'Tardeo', 'tardeo-octubre', current_date + 10, 'proximo', true),
        ($1, 'Borrador', 'borrador', current_date + 5, 'proximo', false),
        ($1, 'Pasado', 'pasado', current_date - 10, 'proximo', true),
        ($2, 'De otro', 'de-otro', current_date + 3, 'proximo', true)`,
      [laOfi.id, otro.id],
    );
  });

  it("lista solo los publicados y futuros del tenant", async () => {
    const { e } = await one<{ e: { slug: string }[] }>("select public.get_eventos_publicos($1) as e", [laOfi.site_key]);
    expect(e.map((x) => x.slug)).toEqual(["tardeo-octubre"]);
  });

  it("incluye los pasados bajo demanda y los marca como finalizados", async () => {
    const { e } = await one<{ e: { slug: string; estado: string }[] }>("select public.get_eventos_publicos($1, true) as e", [laOfi.site_key]);
    expect(e.find((x) => x.slug === "pasado")?.estado).toBe("finalizado");
  });

  it("no expone cliente_id ni borradores", async () => {
    const { e } = await one<{ e: Record<string, unknown> | null }>("select public.get_evento_publico($1, 'tardeo-octubre') as e", [laOfi.site_key]);
    expect(e).not.toHaveProperty("cliente_id");
    expect(e).not.toHaveProperty("publicado");
    const { b } = await one<{ b: unknown }>("select public.get_evento_publico($1, 'borrador') as b", [laOfi.site_key]);
    expect(b).toBeNull();
  });

  it("no devuelve eventos de otro tenant aunque se conozca el slug", async () => {
    const { e } = await one<{ e: unknown }>("select public.get_evento_publico($1, 'de-otro') as e", [laOfi.site_key]);
    expect(e).toBeNull();
  });

  it("valida slug, estado y enlace de reserva", async () => {
    const bad = [
      "insert into restaurant.eventos (cliente_id, titulo, slug, fecha) values ($1, 'X', 'Con Espacios', current_date)",
      "insert into restaurant.eventos (cliente_id, titulo, slug, fecha, estado) values ($1, 'X', 'x', current_date, 'aplazado')",
      "insert into restaurant.eventos (cliente_id, titulo, slug, fecha, enlace_reserva) values ($1, 'X', 'y', current_date, 'http://inseguro')",
    ];
    for (const sql of bad) await expect(db.query(sql, [laOfi.id])).rejects.toThrow();
  });
});

describe("RLS y permisos", () => {
  it("anon no puede leer las tablas directamente", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from restaurant.eventos")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("anon sí puede usar las RPC públicas", async () => {
    await db.exec("set role anon");
    const { e } = await one<{ e: unknown[] }>("select public.get_eventos_publicos($1) as e", [laOfi.site_key]);
    await db.exec("reset role");
    expect(e).toHaveLength(1);
  });

  it("un usuario del tenant solo ve y edita sus filas", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $2)", [userId, laOfi.id]);
    const vistos = await comoUsuario(userId, "staff@laofi.test", async () => {
      const { rows } = await db.query<{ cliente_id: string }>("select distinct cliente_id from restaurant.eventos");
      return rows.map((r) => r.cliente_id);
    });
    expect(vistos).toEqual([laOfi.id]);

    await expect(
      comoUsuario(userId, "staff@laofi.test", () =>
        db.query("insert into restaurant.eventos (cliente_id, titulo, slug, fecha) values ($1, 'Intruso', 'intruso', current_date)", [otro.id]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un usuario autenticado sin tenant no ve nada", async () => {
    const n = await comoUsuario("00000000-0000-4000-8000-000000000099", "nadie@test", async () => {
      const { rows } = await db.query("select * from restaurant.menus_dia");
      return rows.length;
    });
    expect(n).toBe(0);
  });

  it("el helper interno no es invocable por anon", async () => {
    await db.exec("set role anon");
    await expect(db.query("select restaurant.evento_publico_json(e) from restaurant.eventos e")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});

describe("reversión", () => {
  it("los scripts down se ejecutan limpios y en orden", async () => {
    for (const file of [...migrations].reverse()) {
      await db.exec(read(`rollback/${file.replace(/\.sql$/, ".down.sql")}`));
    }
    const { n } = await one<{ n: number }>(
      "select count(*)::int as n from information_schema.tables where table_schema = 'restaurant' and table_name in ('menus_dia', 'menu_dia_platos', 'eventos')",
    );
    expect(n).toBe(0);
  });
});
