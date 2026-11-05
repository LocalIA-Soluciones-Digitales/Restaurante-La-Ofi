// Encargos de vino para llevar desde /vinos: se encarga, el local lo prepara y se paga al recogerlo.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, revertirHasta, STAFF_LAOFI, type TestDb } from "./helpers";

let t: TestDb;

interface EncargoPublico {
  id: string;
  numero: number;
  nombre: string;
  lineas: { nombre: string; detalle: string | null; cantidad: number; precio_centimos: number }[];
  botellas: number;
  total_centimos: number;
  estado: string;
  cancelable: boolean;
}

const vinos: Record<string, string> = {};

/** AAAA-MM-DD en Madrid, `n` días después de hoy. */
const dia = (n: number) => {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const d = new Date(`${hoy}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const MANANA = dia(1);
let tel = 655500000;

const anon = <T>(sql: string, params: unknown[]) => t.como("anon", "", "", () => t.one<T>(sql, params));
const crear = async (extra: Record<string, unknown> = {}) =>
  (
    await anon<{ r: { id: string; numero: number } }>("select public.laofi_crear_encargo_vino($1, $2) as r", [
      t.laOfi.site_key,
      JSON.stringify({
        nombre: "Ane Etxeberria",
        telefono: String(tel++),
        email: "ane@example.com",
        notas: "Para regalo",
        mayor_edad: true,
        recogida_fecha: MANANA,
        recogida_hora: "12:00",
        lineas: [
          { id: vinos.rioja, cantidad: 6 },
          { id: vinos.cava, cantidad: 2 },
        ],
        ...extra,
      }),
    ])
  ).r;
const ver = async (id: string, siteKey = t.laOfi.site_key) =>
  (await anon<{ r: EncargoPublico | null }>("select public.laofi_get_encargo_vino($1, $2) as r", [siteKey, id])).r;
const anular = async (id: string) => (await anon<{ r: EncargoPublico }>("select public.laofi_cancelar_encargo_vino($1, $2) as r", [t.laOfi.site_key, id])).r;
const comoStaff = <T>(fn: () => Promise<T>) => t.como("authenticated", STAFF_LAOFI, "staff@laofi.test", fn);

beforeAll(async () => {
  t = await crearBd();
  // Abierto todos los días de 10:00 a 20:00 (las recogidas se validan contra el horario).
  await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '10:00', hasta = '20:00'`);
  await t.db.query("insert into public.settings (cliente_id, key, value) values ($1, 'push_notify_url', '\"https://push.test/notify\"')", [t.laOfi.id]);
  await t.db.exec(`
    insert into laofi.categorias (slug, nombre, tipo, orden) values ('vinos-tintos', 'Vinos tintos', 'bebida', 20), ('cavas-champagnes', 'Cavas', 'bebida', 21)
    on conflict (slug) do nothing;`);
  const prod = async (cat: string, nombre: string, precio: number | null, disponible = true) =>
    (
      await t.one<{ id: string }>(
        `insert into laofi.productos (categoria_id, nombre, descripcion, precio_centimos, disponible)
         select id, $2, 'D.O. Rioja · Tempranillo', $3, $4 from laofi.categorias where slug = $1 returning id`,
        [cat, nombre, precio, disponible],
      )
    ).id;
  vinos.rioja = await prod("vinos-tintos", "Viña Ardanza", 3200);
  vinos.cava = await prod("cavas-champagnes", "Gramona", 2500);
  vinos.sinPrecio = await prod("vinos-tintos", "Vega Sicilia", null);
  vinos.agotado = await prod("vinos-tintos", "Pingus", 9000, false);
  const { id } = await t.one<{ id: string }>("select p.id from laofi.productos p join laofi.categorias c on c.id = p.categoria_id where c.slug !~ '^(vinos|cavas)-' limit 1");
  vinos.plato = id;
}, 60_000);

describe("encargar", () => {
  it("copia nombre y precio de la carta, suma el total y avisa al local", async () => {
    await t.db.exec("delete from net.peticiones_test");
    const { id, numero } = await crear({ lineas: [{ id: vinos.rioja, cantidad: 6, precio_centimos: 1 }, { id: vinos.cava, cantidad: 2 }] });
    const e = await ver(id);
    expect(e).toMatchObject({ id, numero, nombre: "Ane", botellas: 8, total_centimos: 6 * 3200 + 2 * 2500, estado: "PENDIENTE", cancelable: true });
    expect(e!.lineas[0]).toEqual({ nombre: "Viña Ardanza", detalle: "D.O. Rioja · Tempranillo", cantidad: 6, precio_centimos: 3200 });
    expect(JSON.stringify(e)).not.toMatch(/655|example\.com|regalo/);
    const { body } = await t.one<{ body: { titulo: string; cuerpo: string; url: string } }>("select body from net.peticiones_test");
    expect(body).toMatchObject({ titulo: `Encargo de vino nº ${numero}`, cuerpo: `Ane Etxeberria · 8 botellas · 242,00 € · recoge ${MANANA.slice(8, 10)}/${MANANA.slice(5, 7)} 12:00`, url: "/admin/encargos" });
  });

  it("guarda el día y la hora de recogida y el cliente los ve", async () => {
    const { id } = await crear({ recogida_fecha: MANANA, recogida_hora: "18:30" });
    const e = (await ver(id)) as EncargoPublico & { recogida_en: string };
    const madrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }).format(new Date(e.recogida_en));
    expect(madrid).toBe(`${MANANA} 18:30`);
  });

  it("la recogida, un día y una hora con el local abierto", async () => {
    await expect(crear({ recogida_fecha: undefined, recogida_hora: undefined })).rejects.toThrow(/Elige el día y la hora/);
    await expect(crear({ recogida_hora: "21:30" })).rejects.toThrow(/A esa hora estamos cerrados: ese día abrimos de 10:00 a 20:00/);
    await expect(crear({ recogida_hora: "09:00" })).rejects.toThrow(/A esa hora estamos cerrados/);
    await expect(crear({ recogida_fecha: dia(-1) })).rejects.toThrow(/media hora de margen/);
    await expect(crear({ recogida_fecha: dia(61) })).rejects.toThrow(/dos meses/);
    await expect(crear({ recogida_fecha: "2026-02-31" })).rejects.toThrow(/Revisa el día/);
    // Cierre puntual y día cerrado en el horario.
    await t.db.exec(`update laofi.ajustes set valor = jsonb_build_object('fechas', jsonb_build_array(jsonb_build_object('fecha', '${dia(2)}', 'motivo', 'Fiesta'))) where clave = 'cierres'`);
    await t.db.exec(`insert into laofi.ajustes (clave, valor) select 'cierres', jsonb_build_object('fechas', jsonb_build_array(jsonb_build_object('fecha', '${dia(2)}'))) where not exists (select 1 from laofi.ajustes where clave = 'cierres')`);
    await expect(crear({ recogida_fecha: dia(2) })).rejects.toThrow(/Ese día estamos cerrados/);
    const isodow = ((new Date(`${dia(3)}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    await t.db.exec(`update laofi.horario set estado = 'cerrado' where dia = ${isodow}`);
    await expect(crear({ recogida_fecha: dia(3) })).rejects.toThrow(/Ese día estamos cerrados/);
    await t.db.exec(`update laofi.horario set estado = 'abierto', desde = '10:00', hasta = '20:00'; update laofi.ajustes set valor = '{"fechas": []}' where clave = 'cierres'`);
  });

  it("solo vinos de la carta, disponibles y con precio", async () => {
    await expect(crear({ lineas: [{ id: vinos.plato, cantidad: 1 }] })).rejects.toThrow(/ya no está en la carta/);
    await expect(crear({ lineas: [{ id: vinos.agotado, cantidad: 1 }] })).rejects.toThrow(/ya no está en la carta/);
    await expect(crear({ lineas: [{ id: vinos.sinPrecio, cantidad: 1 }] })).rejects.toThrow(/Vega Sicilia.*llámanos/);
    await expect(crear({ lineas: [{ id: vinos.rioja, cantidad: 1 }, { id: vinos.rioja, cantidad: 2 }] })).rejects.toThrow(/repetido/);
  });

  it("valida cantidades, datos, mayoría de edad y el campo trampa", async () => {
    await expect(crear({ lineas: [] })).rejects.toThrow(/al menos un vino/);
    await expect(crear({ lineas: null })).rejects.toThrow(/al menos un vino/);
    await expect(crear({ lineas: [{ id: vinos.rioja, cantidad: 0 }] })).rejects.toThrow(/entre 1 y 48/);
    await expect(crear({ lineas: [{ id: vinos.rioja, cantidad: 49 }] })).rejects.toThrow(/entre 1 y 48/);
    await expect(crear({ mayor_edad: false })).rejects.toThrow(/mayor de edad/);
    await expect(crear({ telefono: "123" })).rejects.toThrow(/Teléfono/);
    await expect(crear({ nombre: " " })).rejects.toThrow(/nombre/);
    await expect(crear({ web: "http://spam" })).rejects.toThrow(/no válida/);
  });

  it("frena muchos encargos seguidos desde la misma conexión", async () => {
    const ip_hash = "a".repeat(64);
    for (let i = 0; i < 5; i++) await crear({ ip_hash });
    await expect(crear({ ip_hash })).rejects.toThrow(/Demasiados/);
  });

  it("con la site_key de otro negocio, nada", async () => {
    const { id } = await crear();
    expect(await ver(id, t.otro.site_key)).toBeNull();
    await expect(
      t.como("anon", "", "", () => t.one("select public.laofi_crear_encargo_vino($1, $2)", [t.otro.site_key, JSON.stringify({})])),
    ).rejects.toThrow(/site_key/);
  });
});

describe("anularlo el cliente", () => {
  it("mientras no esté listo; luego, llamar", async () => {
    const { id } = await crear();
    expect(await anular(id)).toMatchObject({ estado: "CANCELADO", cancelable: false });
    expect(await anular(id)).toMatchObject({ estado: "CANCELADO" });
    const otro = await crear();
    await comoStaff(() => t.one("select public.laofi_admin_encargo_vino_estado($1, 'LISTO')", [otro.id]));
    await expect(anular(otro.id)).rejects.toThrow(/llámanos/);
  });
});

describe("panel", () => {
  it("lista los encargos en curso con los datos de contacto y avanza el paso", async () => {
    const { id } = await crear();
    const lista = await comoStaff(() => t.one<{ r: { id: string; telefono: string; ip_hash?: string }[] }>("select public.laofi_admin_encargos_vino() as r"));
    const e = lista.r.find((x) => x.id === id)!;
    expect(e.telefono).toMatch(/^655/);
    expect(e).not.toHaveProperty("ip_hash");
    const r = await comoStaff(() => t.one<{ r: { estado: string } }>("select public.laofi_admin_encargo_vino_estado($1, 'CONFIRMADO') as r", [id]));
    expect(r.r.estado).toBe("CONFIRMADO");
    await comoStaff(() => t.one("select public.laofi_admin_encargo_vino_estado($1, 'ENTREGADO')", [id]));
    const enCurso = await comoStaff(() => t.one<{ r: { id: string }[] }>("select public.laofi_admin_encargos_vino() as r"));
    expect(enCurso.r.some((x) => x.id === id)).toBe(false);
    const todos = await comoStaff(() => t.one<{ r: { id: string }[] }>("select public.laofi_admin_encargos_vino(true) as r"));
    expect(todos.r.some((x) => x.id === id)).toBe(true);
  });

  it("anon no lee la tabla ni las RPC del panel", async () => {
    await expect(t.como("anon", "", "", () => t.one("select public.laofi_admin_encargos_vino()"))).rejects.toThrow();
    await expect(t.como("anon", "", "", () => t.one("select count(*) from laofi.encargos_vino"))).rejects.toThrow();
  });

  it("el aviso se puede apagar como los demás", async () => {
    const { tipos } = await t.one<{ tipos: string[] }>("select laofi.tipos_aviso() as tipos");
    expect(tipos).toContain("encargos_vino");
    const { v } = await t.one<{ v: boolean }>("select (valor ->> 'encargos_vino')::boolean as v from laofi.ajustes where clave = 'avisos_push'");
    expect(v).toBe(true);
  });
});

describe("privacidad", () => {
  it("anonimiza a los 12 meses y deja de enseñarlo", async () => {
    const { id } = await crear();
    await t.db.query("update laofi.encargos_vino set created_at = now() - interval '13 months' where id = $1", [id]);
    await t.db.exec("select laofi.purgar_encargos_vino()");
    const r = await t.one<{ nombre: string; email: string | null }>("select nombre, email from laofi.encargos_vino where id = $1", [id]);
    expect(r).toEqual({ nombre: "Anonimizado", email: null });
    expect(await ver(id)).toBeNull();
  });
});

describe("cobrar", () => {
  it("cobra el encargo, lo da por entregado y entra en la caja", async () => {
    const { id } = await crear();
    const antes = await comoStaff(() => t.one<{ c: { ventas_centimos: number; efectivo_centimos: number } }>("select public.laofi_admin_caja() as c", []));
    const { r } = await comoStaff(() => t.one<{ r: { estado: string; cobrado_metodo: string; total_centimos: number } }>("select public.laofi_admin_encargo_vino_cobrar($1, 'EFECTIVO') as r", [id]));
    expect(r).toMatchObject({ estado: "ENTREGADO", cobrado_metodo: "EFECTIVO", total_centimos: 6 * 3200 + 2 * 2500 });
    const despues = await comoStaff(() => t.one<{ c: { ventas_centimos: number; efectivo_centimos: number } }>("select public.laofi_admin_caja() as c", []));
    expect(despues.c.efectivo_centimos - antes.c.efectivo_centimos).toBe(r.total_centimos);
    expect(despues.c.ventas_centimos - antes.c.ventas_centimos).toBe(r.total_centimos);
    // No se cobra dos veces, ni uno anulado.
    await expect(comoStaff(() => t.one("select public.laofi_admin_encargo_vino_cobrar($1, 'TARJETA')", [id]))).rejects.toThrow(/ya está cobrado/);
    const otro = await crear();
    await anular(otro.id);
    await expect(comoStaff(() => t.one("select public.laofi_admin_encargo_vino_cobrar($1, 'TARJETA')", [otro.id]))).rejects.toThrow(/anulado/);
    // Al borrarlo (sin cierre de caja de por medio), su cobro sale de la caja.
    await comoStaff(() => t.one("select public.laofi_admin_encargo_vino_borrar($1)", [id]));
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.pagos where encargo_vino_id = $1", [id]);
    expect(n).toBe(0);
  });
});

describe("reversión", () => {
  it("quita la tabla, las funciones y el tipo de aviso", async () => {
    await revertirHasta(t.db, "20261102140000");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from pg_proc where proname like '%encargo%vino%'");
    expect(n).toBe(0);
    const { tabla } = await t.one<{ tabla: string | null }>("select to_regclass('laofi.encargos_vino')::text as tabla");
    expect(tabla).toBeNull();
    const { tipos } = await t.one<{ tipos: string[] }>("select laofi.tipos_aviso() as tipos");
    expect(tipos).not.toContain("encargos_vino");
  });
});
