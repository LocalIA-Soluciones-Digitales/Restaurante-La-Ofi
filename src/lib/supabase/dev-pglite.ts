import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";

// Backend LOCAL de desarrollo: un Postgres en memoria (PGlite) con la réplica
// mínima de la plataforma (supabase/tests/platform-stub.sql), TODAS las
// migraciones de supabase/migrations y datos de prueba. Permite probar en el
// navegador pedidos, /admin, KDS… sin Docker y sin tocar el Supabase compartido.
//
// Solo se activa con LAOFI_PGLITE=1 (nunca definida en Vercel). Los datos viven
// en memoria del proceso: se pierden al reiniciar el servidor.

export const PGLITE_ACTIVO = process.env.LAOFI_PGLITE === "1";

/** Usuario de staff de pruebas (admin de La Ofi) para /admin en modo local. */
export const DEV_STAFF = { id: "00000000-0000-4000-8000-0000000000d1", email: "encargado@laofi.local" };

interface Estado {
  db: PGlite;
  siteKey: string;
}

// En `next start`, cada grupo de rutas lleva su propio runtime de módulos: el
// estado se guarda en globalThis para que la web pública y /admin compartan la
// MISMA base de datos en memoria dentro del proceso.
const global = globalThis as typeof globalThis & { __laofiPglite?: Promise<Estado> };

const raiz = (...p: string[]) => path.join(process.cwd(), "supabase", ...p);
const leer = (...p: string[]) => readFileSync(raiz(...p), "utf8");

async function crear(): Promise<Estado> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(leer("tests", "platform-stub.sql"));
  for (const f of readdirSync(raiz("migrations")).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(leer("migrations", f));
  }
  await db.exec(leer("seed", "la_ofi_tenant.sql"));
  await db.exec(leer("seed", "la_ofi_contenido_publicado.sql"));
  await db.exec(leer("seed", "la_ofi_carta_enriquecida.sql"));
  try {
    await db.exec(leer("seed", "dev_local.sql"));
  } catch (e) {
    console.warn("[pglite] dev_local.sql:", (e as Error).message);
  }
  const { rows } = await db.query<{ site_key: string; id: string }>("select id, site_key from public.clientes where slug = 'restaurante-la-ofi'");
  await db.query("insert into public.usuarios_negocio (user_id, cliente_id) values ($1, $2) on conflict do nothing", [DEV_STAFF.id, rows[0]!.id]);
  console.warn("[pglite] Backend LOCAL en memoria activo (LAOFI_PGLITE=1). No usar en producción.");
  return { db, siteKey: rows[0]!.site_key };
}

function obtener(): Promise<Estado> {
  global.__laofiPglite ??= crear();
  return global.__laofiPglite;
}

export interface RpcResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Ejecuta una RPC como lo haría PostgREST: argumentos con nombre, resultado en
 * `data`, error con `message` y `code` (SQLSTATE). `rol`: anon (web pública),
 * authenticated (staff de pruebas) o service_role (Stripe).
 */
export async function rpcLocal<T>(fn: string, args: Record<string, unknown>, rol: "anon" | "authenticated" | "service_role" = "anon"): Promise<RpcResult<T>> {
  const { db, siteKey } = await obtener();
  const nombres = Object.keys(args);
  const valores = nombres.map((k) => {
    const v = k === "p_site_key" ? siteKey : args[k];
    return v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v;
  });
  const lista = nombres.map((k, i) => `${k} => $${i + 1}`).join(", ");
  try {
    return await db.transaction(async (tx) => {
      if (rol === "authenticated") {
        await tx.exec(`set local test.uid = '${DEV_STAFF.id}'; set local test.email = '${DEV_STAFF.email}'; set local role authenticated;`);
      } else {
        await tx.exec(`set local role ${rol};`);
      }
      const { rows } = await tx.query<{ r: T }>(`select public.${fn.replace(/[^a-z_]/g, "")}(${lista}) as r`, valores);
      return { data: rows[0]?.r ?? null, error: null };
    });
  } catch (e) {
    const err = e as { message: string; code?: string };
    return { data: null, error: { message: err.message, code: err.code } };
  }
}
