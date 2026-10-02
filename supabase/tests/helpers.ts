// Utilidades comunes a los tests de base de datos: levanta un Postgres en memoria
// (PGlite) con la réplica mínima de la plataforma, TODAS las migraciones en orden
// y los seeds de La Ofi, más un segundo tenant ("otro bar") para probar el
// aislamiento. Cada fichero de test crea su propia base de datos.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
export const MIGRACIONES = readdirSync(path.join(ROOT, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

export const STAFF_LAOFI = "00000000-0000-4000-8000-000000000001";
export const STAFF_OTRO = "00000000-0000-4000-8000-000000000002";
export const LOCALIA = "00000000-0000-4000-8000-0000000000aa";

export const REVERSIONES = readdirSync(path.join(ROOT, "rollback"))
  .filter((f) => f.endsWith(".down.sql"))
  .sort()
  .reverse();

/** Aplica, de la más nueva a la más antigua, las reversiones hasta `desde` incluida (como se haría en producción). */
export async function revertirHasta(db: PGlite, desde: string) {
  for (const f of REVERSIONES.filter((x) => x >= desde)) await db.exec(read(`rollback/${f}`));
}

export interface Tenant {
  id: string;
  site_key: string;
}

export type Rol = "anon" | "authenticated" | "service_role";

export interface TestDb {
  db: PGlite;
  laOfi: Tenant;
  otro: Tenant;
  one: <T>(sql: string, params?: unknown[]) => Promise<T>;
  /** Ejecuta `fn` con el rol y el usuario indicados (auth.uid/auth.jwt simulados). */
  como: <T>(rol: Rol, userId: string, email: string, fn: () => Promise<T>) => Promise<T>;
}

export async function crearBd(): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(read("tests/platform-stub.sql"));
  for (const file of MIGRACIONES) await db.exec(read(`migrations/${file}`));
  await db.exec(read("seed/la_ofi_tenant.sql"));
  await db.exec(read("seed/la_ofi_contenido_publicado.sql"));

  async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
    const { rows } = await db.query<T>(sql, params);
    return rows[0]!;
  }
  async function como<T>(rol: Rol, userId: string, email: string, fn: () => Promise<T>): Promise<T> {
    await db.exec(`set test.uid = '${userId}'; set test.email = '${email}'; set role ${rol};`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role; reset test.uid; reset test.email;");
    }
  }

  const laOfi = await one<Tenant>("select id, site_key from public.clientes where slug = 'restaurante-la-ofi'");
  const otro = await one<Tenant>("insert into public.clientes (nombre_negocio, slug) values ('Otro bar', 'otro-bar') returning id, site_key");
  await db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $2), ($3, $4)", [STAFF_LAOFI, laOfi.id, STAFF_OTRO, otro.id]);

  return { db, laOfi, otro, one, como };
}
