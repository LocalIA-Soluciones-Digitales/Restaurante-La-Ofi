// Salón y pedidos: mesas/QR, sesión de mesa (juntos / cada uno lo suyo),
// pedido con precios y modificadores validados en servidor, recogida por franja,
// pedido de grupo, avisos, pagos solo por service_role y transiciones de estado.
import { beforeAll, describe, expect, it } from "vitest";
import { crearBd, read, STAFF_LAOFI, type TestDb } from "./helpers";

let t: TestDb;
let mesaToken: string;
const precios: Record<string, { id: string; precio: number }> = {};

const rpc = async <T,>(fn: string, ...args: unknown[]) => {
  const ph = args.map((_, i) => `$${i + 1}`).join(", ");
  const { r } = await t.one<{ r: T }>(`select public.${fn}(${ph}) as r`, args);
  return r;
};
const crearPedido = (p: Record<string, unknown>) => rpc<{ id: string; numero_dia: number; total_centimos: number }>("laofi_crear_pedido", t.laOfi.site_key, JSON.stringify(p));

beforeAll(async () => {
  t = await crearBd();
  await t.db.exec(read("seed/la_ofi_carta_enriquecida.sql"));
  const { rows } = await t.db.query<{ nombre: string; id: string; precio_centimos: number }>(
    "select nombre, id, precio_centimos from laofi.productos where precio_centimos is not null",
  );
  for (const r of rows) precios[r.nombre] = { id: r.id, precio: r.precio_centimos };
  const { id: zona } = await t.one<{ id: string }>("insert into laofi.zonas (slug, nombre, tipo) values ('comedor', 'Comedor', 'comedor') returning id");
  ({ token: mesaToken } = await t.one<{ token: string }>("insert into laofi.mesas (zona_id, numero) values ($1, '7') returning token", [zona]));
}, 60_000);

describe("mesa y sesión", () => {
  it("valida el token del QR y solo con la site_key de La Ofi", async () => {
    expect(await rpc<{ numero: string }>("laofi_validar_mesa", t.laOfi.site_key, mesaToken)).toMatchObject({ numero: "7", zona: "Comedor" });
    expect(await rpc("laofi_validar_mesa", t.otro.site_key, mesaToken)).toBeNull();
    expect(await rpc("laofi_validar_mesa", t.laOfi.site_key, "no-existe-1234")).toBeNull();
  });

  it("abre una única sesión por mesa y marca la mesa ocupada", async () => {
    const a = await rpc<{ id: string }>("laofi_iniciar_sesion_mesa", t.laOfi.site_key, mesaToken, "SEPARADO");
    const b = await rpc<{ id: string }>("laofi_iniciar_sesion_mesa", t.laOfi.site_key, mesaToken, "JUNTOS");
    expect(b.id).toBe(a.id);
    const { ocupada } = await t.one<{ ocupada: boolean }>("select ocupada from laofi.mesas where token = $1", [mesaToken]);
    expect(ocupada).toBe(true);
  });
});

describe("pedido en mesa", () => {
  it("calcula el precio en servidor e ignora cualquier precio del navegador", async () => {
    const r = await crearPedido({
      tipo: "MESA",
      mesa_token: mesaToken,
      payment_method: "LOCAL",
      items: [{ producto_id: precios["Ibérico"]!.id, cantidad: 2, precio_unitario_centimos: 1 }],
    });
    expect(r.total_centimos).toBe(precios["Ibérico"]!.precio * 2);
    const { nombre } = await t.one<{ nombre: string }>("select nombre from laofi.pedido_items where pedido_id = $1", [r.id]);
    expect(nombre).toBe("Ibérico");
  });

  it("numera los pedidos del día de forma correlativa", async () => {
    const a = await crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: precios["Ibérico"]!.id, cantidad: 1 }] });
    const b = await crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: precios["Ibérico"]!.id, cantidad: 1 }] });
    expect(b.numero_dia).toBe(a.numero_dia + 1);
  });

  it("exige los modificadores obligatorios y guarda la elección", async () => {
    const clasica = precios["Clásica"]!.id;
    await expect(crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: clasica }] })).rejects.toThrow(/Falta elegir con/);
    const { id: tomate } = await t.one<{ id: string }>("select id from laofi.modificador_opciones where nombre = 'Tomate'");
    const r = await crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: clasica, opciones: [tomate], notas: "Bien tostada" }] });
    const { modificadores, notas } = await t.one<{ modificadores: { opciones: { nombre: string }[] }[]; notas: string }>(
      "select modificadores, notas from laofi.pedido_items where pedido_id = $1",
      [r.id],
    );
    expect(modificadores[0]!.opciones[0]!.nombre).toBe("Tomate");
    expect(notas).toBe("Bien tostada");
  });

  it("rechaza opciones de otro producto, platos sin precio y agotados", async () => {
    const { id: tomate } = await t.one<{ id: string }>("select id from laofi.modificador_opciones where nombre = 'Tomate'");
    await expect(
      crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: precios["Ibérico"]!.id, opciones: [tomate] }] }),
    ).rejects.toThrow(/Opción no válida/);
    const { id: sinPrecio } = await t.one<{ id: string }>("select id from laofi.productos where precio_centimos is null limit 1");
    await expect(crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: sinPrecio }] })).rejects.toThrow(/precio en el local/);
    await t.db.query("update laofi.productos set disponible = false where nombre = 'Americana'");
    await expect(
      crearPedido({ tipo: "MESA", mesa_token: mesaToken, items: [{ producto_id: precios["Americana"]!.id }] }),
    ).rejects.toThrow(/AGOTADO/);
  });

  it("detecta un cambio de precio antes de confirmar", async () => {
    await expect(
      crearPedido({ tipo: "MESA", mesa_token: mesaToken, total_esperado_centimos: 1, items: [{ producto_id: precios["Ibérico"]!.id }] }),
    ).rejects.toThrow(/PRECIO_CAMBIADO/);
  });

  it("no admite pago online si no está activado", async () => {
    await expect(
      crearPedido({ tipo: "MESA", mesa_token: mesaToken, payment_method: "ONLINE", items: [{ producto_id: precios["Ibérico"]!.id }] }),
    ).rejects.toThrow(/pago online no está activo/);
  });
});

describe("cada uno lo suyo", () => {
  let sesion: string;
  let ana: string;
  let ben: string;

  beforeAll(async () => {
    ({ id: sesion } = await rpc<{ id: string }>("laofi_iniciar_sesion_mesa", t.laOfi.site_key, mesaToken, "SEPARADO"));
    ({ id: ana } = await rpc<{ id: string }>("laofi_unirse_sesion", t.laOfi.site_key, sesion, "Ana", "device-ana-123"));
    ({ id: ben } = await rpc<{ id: string }>("laofi_unirse_sesion", t.laOfi.site_key, sesion, "Ben", "device-ben-456"));
  });

  it("un mismo dispositivo no duplica comensal", async () => {
    const otra = await rpc<{ id: string; nombre: string }>("laofi_unirse_sesion", t.laOfi.site_key, sesion, "Ana M.", "device-ana-123");
    expect(otra.id).toBe(ana);
  });

  it("el reparto debe cuadrar al céntimo con la línea", async () => {
    const p = precios["Salmón"]!;
    await expect(
      crearPedido({
        tipo: "MESA", mesa_token: mesaToken, sesion_id: sesion, participante_id: ana,
        items: [{ producto_id: p.id, reparto: [{ participante_id: ana, importe_centimos: 100 }, { participante_id: ben, importe_centimos: 100 }] }],
      }),
    ).rejects.toThrow(/PRECIO_CAMBIADO/);
    const r = await crearPedido({
      tipo: "MESA", mesa_token: mesaToken, sesion_id: sesion, participante_id: ana,
      items: [{ producto_id: p.id, reparto: [{ participante_id: ana, importe_centimos: p.precio / 2 }, { participante_id: ben, importe_centimos: p.precio / 2 }] }],
    });
    const s = await rpc<{ participantes: unknown[]; pedidos: { id: string; items: { repartos: unknown[] }[] }[] }>("laofi_get_sesion", t.laOfi.site_key, sesion);
    expect(s.participantes).toHaveLength(2);
    expect(s.pedidos.find((x) => x.id === r.id)!.items[0]!.repartos).toHaveLength(2);
  });

  it("asumir la parte de otro solo entre comensales de la misma mesa", async () => {
    const { id: reparto } = await t.one<{ id: string }>("select id from laofi.pedido_item_repartos where participante_id = $1 limit 1", [ben]);
    await rpc("laofi_asumir_reparto", t.laOfi.site_key, reparto, ana);
    const r = await t.one<{ participante_id: string; asumido_de_participante_id: string }>("select * from laofi.pedido_item_repartos where id = $1", [reparto]);
    expect(r).toMatchObject({ participante_id: ana, asumido_de_participante_id: ben });
  });

  it("los pagos de partes solo los marca service_role y cierran el pedido pagado", async () => {
    const pago = await t.como("service_role", "", "", () => rpc<{ lineas: { reparto_id: string; importe_centimos: number }[] }>("laofi_get_reparto_para_pago", ana));
    const ids = pago.lineas.map((l) => l.reparto_id);
    const importe = pago.lineas.reduce((a, l) => a + l.importe_centimos, 0);
    await expect(
      t.como("anon", "", "", () => rpc("laofi_marcar_repartos_pagados", ana, `{${ids.join(",")}}`, "cs_test_1", "pi_1", importe)),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.como("authenticated", STAFF_LAOFI, "staff@laofi.test", () => rpc("laofi_marcar_repartos_pagados", ana, `{${ids.join(",")}}`, "cs_test_1", "pi_1", importe)),
    ).rejects.toThrow(/permission denied/);
    await t.como("service_role", "", "", () => rpc("laofi_marcar_repartos_pagados", ana, `{${ids.join(",")}}`, "cs_test_1", "pi_1", importe));
    // Idempotente: el webhook puede llegar dos veces.
    await t.como("service_role", "", "", () => rpc("laofi_marcar_repartos_pagados", ana, `{${ids.join(",")}}`, "cs_test_1", "pi_1", importe));
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.pagos where stripe_session_id = 'cs_test_1'");
    expect(n).toBe(1);
  });
});

describe("recogida y grupos", () => {
  it("sin configurar no hay franjas ni se puede pedir para recoger", async () => {
    const c = await rpc<{ recogida_activa: boolean; franjas: unknown[] }>("laofi_get_config_pedidos", t.laOfi.site_key);
    expect(c).toMatchObject({ recogida_activa: false, franjas: [] });
    await expect(
      crearPedido({ tipo: "RECOGIDA", nombre: "Iker", recogida_en: new Date(Date.now() + 3600_000).toISOString(), items: [{ producto_id: precios["Ibérico"]!.id }] }),
    ).rejects.toThrow(/Franja de recogida no disponible/);
  });

  it("respeta la capacidad de cada franja y el grupo ocupa una plaza", async () => {
    await t.db.exec(`
      update laofi.ajustes set valor = '{"activa": true, "desde": "00:00", "hasta": "23:59", "intervalo_min": 5, "capacidad": 1, "antelacion_min": 0, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida';
      update laofi.horario set estado = 'abierto', desde = '00:00', hasta = '00:00';
    `);
    const c = await rpc<{ franjas: { hora: string; libres: number }[] }>("laofi_get_config_pedidos", t.laOfi.site_key);
    expect(c.franjas.length).toBeGreaterThan(0);
    const [f1, f2] = c.franjas;
    const p = { tipo: "RECOGIDA", nombre: "Iker", telefono: "600 000 000", recogida_en: f1!.hora, items: [{ producto_id: precios["Ibérico"]!.id }] };
    await crearPedido(p);
    await expect(crearPedido(p)).rejects.toThrow(/Franja de recogida no disponible/);

    if (!f2) return; // muy cerca de medianoche no quedan más franjas
    const g = await rpc<{ token: string }>("laofi_crear_grupo", t.laOfi.site_key, "Equipo de I+D", "Maite", f2.hora);
    await expect(rpc("laofi_crear_grupo", t.laOfi.site_key, "Otro", "X", f2.hora)).rejects.toThrow(/no disponible/);
    await crearPedido({ tipo: "RECOGIDA", grupo_token: g.token, nombre: "Jon", items: [{ producto_id: precios["Ibérico"]!.id, cantidad: 2 }] });
    await crearPedido({ tipo: "RECOGIDA", grupo_token: g.token, nombre: "Leire", items: [{ producto_id: precios["Salmón"]!.id }] });
    const grupo = await rpc<{ pedidos: Record<string, unknown>[]; abierto: boolean }>("laofi_get_grupo", t.laOfi.site_key, g.token);
    expect(grupo.pedidos).toEqual([
      { nombre: "Jon", platos: 2 },
      { nombre: "Leire", platos: 1 },
    ]);
    expect(JSON.stringify(grupo)).not.toMatch(/centimos/);
  });
});

describe("avisos", () => {
  it("un aviso pendiente por tipo: pulsar varias veces no lo duplica", async () => {
    for (let i = 0; i < 3; i++) await rpc("laofi_avisar", t.laOfi.site_key, mesaToken, "CAMARERO");
    await rpc("laofi_avisar", t.laOfi.site_key, mesaToken, "CUENTA");
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.avisos where atendido_at is null");
    expect(n).toBe(2);
  });
});

describe("estados y permisos", () => {
  it("bloquea saltos de estado y registra el historial", async () => {
    const { id } = await t.one<{ id: string }>("select id from laofi.pedidos where estado = 'RECEIVED' limit 1");
    await expect(t.db.query("update laofi.pedidos set estado = 'DELIVERED' where id = $1", [id])).rejects.toThrow(/no permitida/);
    await t.db.query("update laofi.pedidos set estado = 'ACCEPTED' where id = $1", [id]);
    const { n } = await t.one<{ n: number }>("select count(*)::int as n from laofi.pedido_estado_historial where pedido_id = $1", [id]);
    expect(n).toBe(1);
  });

  it("anon no lee pedidos ni ejecuta las funciones de pago", async () => {
    await expect(t.como("anon", "", "", () => t.db.query("select * from laofi.pedidos"))).rejects.toThrow(/permission denied/);
    const { id } = await t.one<{ id: string }>("select id from laofi.pedidos limit 1");
    await expect(t.como("anon", "", "", () => rpc("laofi_get_pedido_para_pago", id))).rejects.toThrow(/permission denied/);
  });

  it("el estado público de un pedido no expone campos internos", async () => {
    const { id } = await t.one<{ id: string }>("select id from laofi.pedidos limit 1");
    const p = await t.como("anon", "", "", () => rpc<Record<string, unknown>>("laofi_get_pedido", t.laOfi.site_key, id));
    expect(p).not.toHaveProperty("telefono");
    expect(p).not.toHaveProperty("creado_por");
    expect(await rpc("laofi_get_pedido", t.otro.site_key, id)).toBeNull();
  });

  it("el pago completo exige el importe exacto y es idempotente", async () => {
    const { id, total_centimos } = await t.one<{ id: string; total_centimos: number }>("select id, total_centimos from laofi.pedidos where sesion_id is null limit 1");
    await expect(t.como("service_role", "", "", () => rpc("laofi_marcar_pedido_pagado", id, "cs_x", "pi_x", total_centimos - 1))).rejects.toThrow(/no coincide/);
    await t.como("service_role", "", "", () => rpc("laofi_marcar_pedido_pagado", id, "cs_x", "pi_x", total_centimos));
    await t.como("service_role", "", "", () => rpc("laofi_marcar_pedido_pagado", id, "cs_x", "pi_x", total_centimos));
    const { payment_status } = await t.one<{ payment_status: string }>("select payment_status from laofi.pedidos where id = $1", [id]);
    expect(payment_status).toBe("PAID");
  });
});

describe("reversión", () => {
  it("elimina el salón y los pedidos sin tocar la carta", async () => {
    await t.db.exec(read("rollback/20261002110000_laofi_salon_pedidos.down.sql"));
    const r = await t.one<{ pedidos: number; productos: number }>(
      `select (select count(*)::int from pg_tables where schemaname = 'laofi' and tablename = 'pedidos') as pedidos,
              (select count(*)::int from laofi.productos) as productos`,
    );
    expect(r.pedidos).toBe(0);
    expect(r.productos).toBeGreaterThan(0);
  });
});
