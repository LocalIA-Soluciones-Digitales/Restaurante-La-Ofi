"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { ENCARGOS_VINO } from "@/lib/lanzamiento";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { rpcPublica } from "@/lib/supabase/rpc";

// Encargos de vino para llevar desde /vinos: sin pago online. Se encarga con el día y la
// hora a la que se pasará a recogerlo, el local lo prepara y avisa, y se paga al recogerlo.
// Precios y nombres los pone Postgres, que también valida el día y la hora con el horario.

export interface EncargoVinoWeb {
  nombre: string;
  telefono: string;
  email?: string;
  notas?: string;
  lineas: { id: string; cantidad: number }[];
  /** Cuándo pasa a recogerlo, en Madrid: AAAA-MM-DD y HH:MM. */
  recogida_fecha: string;
  recogida_hora: string;
  /** El cliente declara ser mayor de edad (venta de alcohol). */
  mayor_edad: boolean;
  /** Campo trampa: los humanos no lo ven; si llega relleno, es un bot. */
  web?: string;
}

export type EstadoEncargo = "PENDIENTE" | "CONFIRMADO" | "LISTO" | "ENTREGADO" | "CANCELADO";

/** El encargo tal y como lo ve el cliente en /encargo/<id> (sin teléfono, email ni notas). */
export interface EncargoPublico {
  id: string;
  numero: number;
  nombre: string;
  lineas: { nombre: string; detalle: string | null; cantidad: number; precio_centimos: number }[];
  botellas: number;
  total_centimos: number;
  estado: EstadoEncargo;
  creado: string;
  /** Cuándo pasa a recogerlo (null en los encargos de antes del 05/11/2026). */
  recogida_en?: string | null;
  cancelable: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NO_ACTIVO = "Los encargos online aún no están activos: llámanos y te lo dejamos apartado.";

export async function encargarVinos(e: EncargoVinoWeb): Promise<ResultadoAccion<{ id: string; numero: number }>> {
  if (!ENCARGOS_VINO) return { ok: false, error: NO_ACTIVO, codigo: "NO_ACTIVO" };
  if (e.mayor_edad !== true) return { ok: false, error: "Para encargar vino tienes que ser mayor de edad.", codigo: "ERROR" };
  const lineas = (Array.isArray(e.lineas) ? e.lineas : [])
    .filter((l) => UUID.test(String(l.id)) && Number.isInteger(l.cantidad) && l.cantidad > 0)
    .slice(0, 40);
  if (lineas.length === 0) return { ok: false, error: "Elige al menos un vino.", codigo: "ERROR" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.recogida_fecha)) || !/^\d{2}:\d{2}$/.test(String(e.recogida_hora))) {
    return { ok: false, error: "Elige el día y la hora a la que pasarás a recogerlo.", codigo: "ERROR" };
  }
  const p = {
    nombre: String(e.nombre ?? "").trim().slice(0, 60),
    telefono: String(e.telefono ?? "").slice(0, 16),
    email: String(e.email ?? "").trim().slice(0, 120),
    notas: String(e.notas ?? "").trim().slice(0, 300),
    lineas,
    recogida_fecha: e.recogida_fecha,
    recogida_hora: e.recogida_hora,
    mayor_edad: true,
    web: e.web,
    ip_hash: await hashIp(),
  };
  const res = await rpcPublica<{ id: string; numero: number }>("laofi_crear_encargo_vino", { p });
  if (!res) return { ok: false, error: NO_ACTIVO, codigo: "NO_ACTIVO" };
  if (res.error) {
    if (res.error.code === "P0001") return { ok: false, error: res.error.message, codigo: "ERROR" };
    // La RPC aún no existe en la base de datos (proyecto sin migrar).
    if (res.error.code === "PGRST202" || res.error.code === "42883") return { ok: false, error: NO_ACTIVO, codigo: "NO_ACTIVO" };
    console.error("[encargos]", res.error.code, res.error.message);
    return { ok: false, error: "No hemos podido enviar el encargo. Inténtalo de nuevo o llámanos.", codigo: "ERROR" };
  }
  return { ok: true, data: res.data! };
}

/** El uuid del encargo (no adivinable) es la llave, como en el seguimiento de la reserva. */
export async function obtenerEncargo(id: string): Promise<ResultadoAccion<EncargoPublico | null>> {
  if (!UUID.test(id)) return { ok: true, data: null };
  const res = await rpcPublica<EncargoPublico>("laofi_get_encargo_vino", { p_id: id });
  if (!res || res.error) return { ok: false, error: "No hemos podido cargar el encargo.", codigo: "ERROR" };
  return { ok: true, data: res.data };
}

/** El cliente lo anula mientras no esté preparado; al local le llega un aviso al móvil. */
export async function anularEncargo(id: string): Promise<ResultadoAccion<EncargoPublico>> {
  if (!UUID.test(id)) return { ok: false, error: "Encargo no encontrado.", codigo: "ERROR" };
  const res = await rpcPublica<EncargoPublico>("laofi_cancelar_encargo_vino", { p_id: id });
  if (!res) return { ok: false, error: "No hemos podido anularlo: llámanos.", codigo: "ERROR" };
  if (res.error) {
    if (res.error.code === "P0001") return { ok: false, error: res.error.message, codigo: "ERROR" };
    console.error("[encargos] anular", res.error.code, res.error.message);
    return { ok: false, error: "No hemos podido anularlo: inténtalo de nuevo o llámanos.", codigo: "ERROR" };
  }
  return { ok: true, data: res.data! };
}

/** SHA-256 de la IP con sal (igual que en las reservas): limita abusos sin guardar la IP. */
async function hashIp(): Promise<string | undefined> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]!.trim();
  if (!ip) return undefined;
  return createHash("sha256").update(`${process.env.LAOFI_SITE_KEY ?? "laofi"}:${ip}`).digest("hex");
}
