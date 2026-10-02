// Verificación de las migraciones de La Ofi contra un Postgres real en memoria
// (PGlite), sin Docker ni tocar el proyecto Supabase compartido. Reproduce el
// núcleo de la plataforma (platform-stub.sql) y comprueba el aislamiento del
// schema laofi frente a otros tenants, RLS, permisos, RPC públicas y seeds.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const migrations = readdirSync(path.join(ROOT, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const STAFF_LAOFI = "00000000-0000-4000-8000-000000000001";
const STAFF_OTRO = "00000000-0000-4000-8000-000000000002";

let db: PGlite;
let laOfi: { id: string; site_key: string };
let otro: { id: string; site_key: string };

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<T>(sql, params);
  return rows[0]!;
}

async function como<T>(rol: "anon" | "authenticated", userId: string, email: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${userId}'; set test.email = '${email}'; set role ${rol};`);
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
  await db.exec(read("seed/la_ofi_contenido_publicado.sql"));
  laOfi = await one("select id, site_key from public.clientes where slug = 'restaurante-la-ofi'");
  otro = await one("insert into public.clientes (nombre_negocio, slug) values ('Otro bar', 'otro-bar') returning id, site_key");
  await db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $2), ($3, $4)", [STAFF_LAOFI, laOfi.id, STAFF_OTRO, otro.id]);
}, 60_000);

describe("seeds", () => {
  it("dan de alta La Ofi y cargan la carta y el horario publicados, de forma idempotente", async () => {
    await db.exec(read("seed/la_ofi_tenant.sql"));
    await db.exec(read("seed/la_ofi_contenido_publicado.sql"));
    const r = await one<{ clientes: number; categorias: number; productos: number; horario: number; con_alergenos: number }>(
      `select (select count(*)::int from public.clientes where slug = 'restaurante-la-ofi') as clientes,
              (select count(*)::int from laofi.categorias) as categorias,
              (select count(*)::int from laofi.productos) as productos,
              (select count(*)::int from laofi.horario) as horario,
              (select count(*)::int from laofi.productos where alergenos <> '{}') as con_alergenos`,
    );
    expect(r).toEqual({ clientes: 1, categorias: 3, productos: 25, horario: 7, con_alergenos: 0 });
  });
});

describe("carta", () => {
  it("devuelve las categorías con sus productos en una sola llamada", async () => {
    const { c } = await one<{ c: { slug: string; descripcion: string; productos: { precio_centimos: number | null }[] }[] }>(
      "select public.laofi_get_carta($1) as c",
      [laOfi.site_key],
    );
    expect(c.map((x) => x.slug)).toEqual(["desayunos", "para-picotear", "brasa"]);
    expect(c[0]!.productos).toHaveLength(9);
    expect(c[0]!.descripcion).toMatch(/Instagram/);
    expect(c[1]!.productos.every((p) => p.precio_centimos === null)).toBe(true);
  });

  it("no devuelve nada con la site_key de otro proyecto ni con una inventada", async () => {
    for (const key of [otro.site_key, "00000000-0000-4000-8000-0000000000ff"]) {
      const { c } = await one<{ c: unknown[] }>("select public.laofi_get_carta($1) as c", [key]);
      expect(c).toEqual([]);
    }
  });

  it("no devuelve nada si el tenant está pausado", async () => {
    await db.query("update public.clientes set estado = 'pausado' where id = $1", [laOfi.id]);
    const { c } = await one<{ c: unknown[] }>("select public.laofi_get_carta($1) as c", [laOfi.site_key]);
    await db.query("update public.clientes set estado = 'activo' where id = $1", [laOfi.id]);
    expect(c).toEqual([]);
  });

  it("solo acepta los 14 alérgenos del Reglamento UE como claves", async () => {
    const { id } = await one<{ id: string }>("select id from laofi.categorias where slug = 'brasa'");
    await expect(
      db.query("insert into laofi.productos (categoria_id, nombre, alergenos) values ($1, 'X', '{picante}')", [id]),
    ).rejects.toThrow();
    await db.query(
      "insert into laofi.productos (categoria_id, nombre, alergenos, disponible) values ($1, 'Prueba', '{gluten,frutos_cascara}', false)",
      [id],
    );
  });

  it("oculta los productos no disponibles", async () => {
    const { c } = await one<{ c: { productos: { nombre: string }[] }[] }>("select public.laofi_get_carta($1) as c", [laOfi.site_key]);
    expect(c.flatMap((x) => x.productos).some((p) => p.nombre === "Prueba")).toBe(false);
  });
});

describe("menú del día", () => {
  beforeAll(async () => {
    const { id } = await one<{ id: string }>(
      "insert into laofi.menus_dia (fecha, precio_centimos, pan_incluido, bebida_incluida, postre_o_cafe) values ((now() at time zone 'Europe/Madrid')::date, 890, true, true, true) returning id",
    );
    await db.query(
      `insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden) values
        ($1, 'plato', 'Secreto con patatas', 1), ($1, 'plato', 'Arroz caldoso', 2), ($1, 'postre', 'Flan', 1)`,
      [id],
    );
  });

  it("devuelve el menú de hoy con sus platos", async () => {
    const { m } = await one<{ m: { precio_centimos: number; platos: unknown[] } }>("select public.laofi_get_menu_dia($1) as m", [laOfi.site_key]);
    expect(m.precio_centimos).toBe(890);
    expect(m.platos).toHaveLength(3);
  });

  it("no lo devuelve con la site_key de otro proyecto", async () => {
    const { m } = await one<{ m: unknown }>("select public.laofi_get_menu_dia($1) as m", [otro.site_key]);
    expect(m).toBeNull();
  });

  it("rechaza tipos desconocidos y dos menús el mismo día", async () => {
    const { id } = await one<{ id: string }>("select id from laofi.menus_dia limit 1");
    await expect(db.query("insert into laofi.menu_dia_platos (menu_id, tipo, nombre) values ($1, 'cafe', 'X')", [id])).rejects.toThrow();
    await expect(db.query("insert into laofi.menus_dia (fecha) values ((now() at time zone 'Europe/Madrid')::date)")).rejects.toThrow();
  });
});

describe("eventos", () => {
  beforeAll(async () => {
    await db.exec(
      `insert into laofi.eventos (titulo, slug, fecha, publicado) values
        ('Tardeo', 'tardeo-octubre', current_date + 10, true),
        ('Borrador', 'borrador', current_date + 5, false),
        ('Pasado', 'pasado', current_date - 10, true)`,
    );
  });

  it("lista solo los publicados y futuros", async () => {
    const { e } = await one<{ e: { slug: string }[] }>("select public.laofi_get_eventos($1) as e", [laOfi.site_key]);
    expect(e.map((x) => x.slug)).toEqual(["tardeo-octubre"]);
  });

  it("incluye los pasados bajo demanda, marcados como finalizados", async () => {
    const { e } = await one<{ e: { slug: string; estado: string }[] }>("select public.laofi_get_eventos($1, true) as e", [laOfi.site_key]);
    expect(e.find((x) => x.slug === "pasado")?.estado).toBe("finalizado");
  });

  it("no expone borradores, campos internos ni datos a otras site_key", async () => {
    const { e } = await one<{ e: Record<string, unknown> }>("select public.laofi_get_evento($1, 'tardeo-octubre') as e", [laOfi.site_key]);
    expect(e).not.toHaveProperty("publicado");
    const { b } = await one<{ b: unknown }>("select public.laofi_get_evento($1, 'borrador') as b", [laOfi.site_key]);
    expect(b).toBeNull();
    const { x } = await one<{ x: unknown }>("select public.laofi_get_evento($1, 'tardeo-octubre') as x", [otro.site_key]);
    expect(x).toBeNull();
  });

  it("valida slug, estado y enlace de reserva", async () => {
    for (const sql of [
      "insert into laofi.eventos (titulo, slug, fecha) values ('X', 'Con Espacios', current_date)",
      "insert into laofi.eventos (titulo, slug, fecha, estado) values ('X', 'x', current_date, 'aplazado')",
      "insert into laofi.eventos (titulo, slug, fecha, enlace_reserva) values ('X', 'y', current_date, 'http://inseguro')",
    ]) {
      await expect(db.query(sql)).rejects.toThrow();
    }
  });
});

describe("horario", () => {
  it("devuelve los 7 días con el sábado como consultar", async () => {
    const { h } = await one<{ h: { dia: number; estado: string; desde: string | null; hasta: string | null }[] }>(
      "select public.laofi_get_horario($1) as h",
      [laOfi.site_key],
    );
    expect(h).toHaveLength(7);
    expect(h[0]).toEqual({ dia: 1, estado: "abierto", desde: "07:30", hasta: "17:00" });
    expect(h[5]).toEqual({ dia: 6, estado: "consultar", desde: null, hasta: null });
  });

  it("exige horas cuando el día está abierto", async () => {
    await expect(db.query("update laofi.horario set desde = null where dia = 1")).rejects.toThrow();
  });
});

describe("aislamiento y permisos", () => {
  it("anon no tiene acceso al schema laofi", async () => {
    await expect(como("anon", "", "", () => db.query("select * from laofi.productos"))).rejects.toThrow(/permission denied/);
  });

  it("anon sí puede usar las RPC públicas de La Ofi", async () => {
    const { c } = await como("anon", "", "", () => one<{ c: unknown[] }>("select public.laofi_get_carta($1) as c", [laOfi.site_key]));
    expect(c).toHaveLength(3);
  });

  it("anon no puede ejecutar los helpers internos", async () => {
    await expect(como("anon", "", "", () => db.query("select laofi.cliente_id()"))).rejects.toThrow(/permission denied/);
  });

  it("el staff de La Ofi lee y edita sus datos", async () => {
    const n = await como("authenticated", STAFF_LAOFI, "staff@laofi.test", async () => {
      await db.query("update laofi.horario set estado = 'consultar' where dia = 6");
      const { rows } = await db.query("select * from laofi.productos");
      return rows.length;
    });
    expect(n).toBeGreaterThan(0);
  });

  it("el staff de otro proyecto no ve ni puede escribir nada de La Ofi", async () => {
    const vistos = await como("authenticated", STAFF_OTRO, "staff@otro.test", async () => {
      const { rows } = await db.query("select * from laofi.productos");
      return rows.length;
    });
    expect(vistos).toBe(0);
    await expect(
      como("authenticated", STAFF_OTRO, "staff@otro.test", () =>
        db.query("insert into laofi.eventos (titulo, slug, fecha) values ('Intruso', 'intruso', current_date)"),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("LocalIA (is_developer) puede gestionar La Ofi", async () => {
    const n = await como("authenticated", "00000000-0000-4000-8000-0000000000aa", "admin@developers.local", async () => {
      const { rows } = await db.query("select * from laofi.eventos");
      return rows.length;
    });
    expect(n).toBe(3);
  });
});

describe("reversión", () => {
  it("elimina todo lo de La Ofi sin tocar el registro de tenants", async () => {
    for (const f of readdirSync(path.join(ROOT, "rollback")).filter((x) => x.endsWith(".down.sql")).sort().reverse()) await db.exec(read(`rollback/${f}`));
    const r = await one<{ schema: number; rpc: number; clientes: number }>(
      `select (select count(*)::int from pg_namespace where nspname = 'laofi') as schema,
              (select count(*)::int from pg_proc where proname like 'laofi\\_%') as rpc,
              (select count(*)::int from public.clientes) as clientes`,
    );
    expect(r).toEqual({ schema: 0, rpc: 0, clientes: 2 });
  });
});
