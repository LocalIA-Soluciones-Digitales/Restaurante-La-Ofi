// Gastos: alta y edición, memoria de proveedores (lo que «aprende» el lector),
// duplicados, permisos y reversión.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, STAFF_LAOFI, STAFF_OTRO, type TestDb } from "./helpers";

let t: TestDb;

async function admin<T>(fn: string, ...args: unknown[]): Promise<T> {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  return t.como("authenticated", STAFF_LAOFI, "dueno@laofi.test", async () => (await t.one<{ r: T }>(`select public.${fn}(${ph}) as r`, args)).r);
}
const guardar = (p: Record<string, unknown>) => admin<{ id: string; proveedor: string; proveedor_id: string; cif: string | null }>("laofi_admin_guardar_gasto", JSON.stringify(p));
const proveedores = async () => (await admin<{ proveedores: { nombre: string; cif: string | null; pistas: string[]; categoria: string; veces: number }[] }>("laofi_admin_gastos", "2000-01-01", "2100-01-01")).proveedores;

beforeAll(async () => {
  t = await crearBd();
}, 60_000);

describe("gastos", () => {
  it("guarda un gasto y da de alta el proveedor con su pista", async () => {
    const g = await guardar({
      fecha: "2026-10-20", tipo: "albaran", proveedor: "Makro Autoservicio Mayorista, S.A.", cif: "a-28647451", numero: "A 123",
      categoria: "comida", total_centimos: 12100, base_centimos: 11000, iva_centimos: 1100,
      iva: [{ tipo: 10, base_centimos: 11000, cuota_centimos: 1100 }], proveedor_leido: "MAKR0 AUTOSERVICIO",
    });
    expect(g).toMatchObject({ proveedor: "Makro Autoservicio Mayorista, S.A.", cif: "A28647451" });
    expect(await proveedores()).toEqual([
      expect.objectContaining({ nombre: "Makro Autoservicio Mayorista, S.A.", cif: "A28647451", pistas: ["makr0 autoservicio"], categoria: "comida", veces: 1 }),
    ]);
  });

  it("reconoce al proveedor por el CIF aunque el nombre llegue distinto, y aprende la corrección", async () => {
    const g = await guardar({ fecha: "2026-10-21", proveedor: "Makro", cif: "A28647451", numero: "A 124", categoria: "bebida", total_centimos: 500, proveedor_leido: "MAKRO CASH" });
    const [p] = await proveedores();
    expect(p).toMatchObject({ nombre: "Makro", veces: 2, categoria: "bebida", pistas: ["makr0 autoservicio", "makro cash"] });
    expect(g.proveedor).toBe("Makro");
  });

  it("no deja apuntar dos veces el mismo documento", async () => {
    await expect(guardar({ proveedor: "Makro", cif: "A28647451", numero: "a 124", total_centimos: 500 })).rejects.toThrow(/ya está apuntado/);
  });

  it("edita sin volver a contar el proveedor y borra devolviendo la ruta del documento", async () => {
    const g = await guardar({ proveedor: "Frutas Txomin", total_centimos: 3000, documento_path: "2026/x.jpg" });
    await guardar({ id: g.id, proveedor: "Frutas Txomin", total_centimos: 3200 });
    const p = (await proveedores()).find((x) => x.nombre === "Frutas Txomin");
    expect(p?.veces).toBe(1);
    expect(await admin<string>("laofi_admin_borrar_gasto", g.id)).toBe("2026/x.jpg");
  });

  it("exige rol de gestión y aísla a otros negocios", async () => {
    await t.db.exec(`insert into laofi.staff (user_id, nombre, rol) values ('${STAFF_LAOFI}', 'Dueño', 'admin') on conflict (user_id) do nothing`);
    await expect(
      t.como("authenticated", STAFF_OTRO, "otro@bar.test", () => t.one("select public.laofi_admin_gastos('2000-01-01', '2100-01-01')")),
    ).rejects.toThrow(/NO_AUTORIZADO/);
    await expect(t.como("anon", STAFF_OTRO, "", () => t.one("select count(*) from laofi.gastos"))).rejects.toThrow(/permission denied/);
  });

  it("se revierte limpia", async () => {
    await revertirHasta(t.db, "20261022100000");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'laofi' and c.relname like 'gastos%'");
    expect(n).toBe(0);
  });
});
