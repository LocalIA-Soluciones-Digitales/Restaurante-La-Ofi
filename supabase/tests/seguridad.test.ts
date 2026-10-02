// Auditoría de seguridad automatizada (equivalente a Palomita §12 + get_advisors):
// si alguien añade una tabla sin RLS, una RPC ejecutable por anon que no debería o
// una función SECURITY DEFINER sin search_path, este test falla.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, type TestDb } from "./helpers";

let t: TestDb;

/** Las ÚNICAS RPC que puede ejecutar el navegador (anon), todas con site_key. */
const PUBLICAS_ANON = [
  "laofi_asumir_reparto",
  "laofi_avisar",
  "laofi_crear_grupo",
  "laofi_crear_pedido",
  "laofi_crear_resena",
  "laofi_crear_reserva",
  "laofi_get_carta",
  "laofi_get_config_pedidos",
  "laofi_get_config_reservas",
  "laofi_get_evento",
  "laofi_get_eventos",
  "laofi_get_grupo",
  "laofi_get_horario",
  "laofi_get_menu_dia",
  "laofi_get_pedido",
  "laofi_get_resenas",
  "laofi_get_sesion",
  "laofi_iniciar_sesion_mesa",
  "laofi_unirse_sesion",
  "laofi_validar_mesa",
].sort();

/** Solo service_role (pagos, registro fiscal, alta de staff). */
const SOLO_SERVICIO = [
  "laofi_get_pedido_para_pago",
  "laofi_get_reparto_para_pago",
  "laofi_marcar_pedido_pagado",
  "laofi_marcar_repartos_pagados",
  "laofi_tbai_actualizar",
  "laofi_tbai_buscar",
  "laofi_tbai_crear",
  "laofi_tbai_lineas",
  "laofi_vincular_staff",
].sort();

beforeAll(async () => {
  t = await crearBd();
}, 60_000);

const filas = async <T,>(sql: string) => (await t.db.query<T>(sql)).rows;

describe("auditoría de seguridad", () => {
  it("todas las tablas de laofi tienen RLS activo", async () => {
    const sinRls = await filas<{ tabla: string }>(
      "select c.relname as tabla from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'laofi' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(sinRls).toEqual([]);
  });

  it("anon no tiene USAGE sobre laofi ni privilegios en ninguna tabla", async () => {
    const [fila] = await filas<{ usage: boolean }>("select has_schema_privilege('anon', 'laofi', 'USAGE') as usage");
    expect(fila?.usage).toBe(false);
    const priv = await filas<{ tabla: string }>(
      "select table_name as tabla from information_schema.role_table_grants where table_schema = 'laofi' and grantee in ('anon', 'PUBLIC')",
    );
    expect(priv).toEqual([]);
  });

  it("anon solo puede ejecutar las RPC públicas previstas", async () => {
    const r = await filas<{ f: string }>(
      `select p.proname as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'laofi\\_%' and has_function_privilege('anon', p.oid, 'EXECUTE')
       order by 1`,
    );
    expect([...new Set(r.map((x) => x.f))].sort()).toEqual(PUBLICAS_ANON);
  });

  it("pagos, TicketBAI y alta de staff: ni anon ni authenticated", async () => {
    for (const f of SOLO_SERVICIO) {
      const r = await filas<{ anon: boolean; auth: boolean; svc: boolean }>(
        `select bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon,
                bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as auth,
                bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE')) as svc
         from pg_proc p where p.proname = '${f}'`,
      );
      expect({ f, ...r[0] }).toEqual({ f, anon: false, auth: false, svc: true });
    }
  });

  it("las RPC de admin no las puede ejecutar anon", async () => {
    const r = await filas<{ f: string }>(
      `select p.proname as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'laofi\\_admin\\_%' and has_function_privilege('anon', p.oid, 'EXECUTE')`,
    );
    expect(r).toEqual([]);
  });

  it("toda función SECURITY DEFINER de La Ofi fija su search_path", async () => {
    const r = await filas<{ f: string }>(
      `select n.nspname || '.' || p.proname as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where p.prosecdef and (n.nspname = 'laofi' or p.proname like 'laofi\\_%')
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
    );
    expect(r).toEqual([]);
  });

  it("las RPC de admin son SECURITY INVOKER (la RLS sigue aplicando)", async () => {
    const r = await filas<{ f: string }>(
      `select p.proname as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like 'laofi\\_admin\\_%' and p.prosecdef`,
    );
    expect(r).toEqual([]);
  });
});
