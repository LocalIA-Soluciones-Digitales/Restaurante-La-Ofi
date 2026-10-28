"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { rpcPublica } from "@/lib/supabase/rpc";

export interface ReservaWeb {
  nombre: string;
  telefono: string;
  email?: string;
  personas: number;
  fecha: string;
  hora: string;
  espacio: "mesa" | "despacho" | "evento";
  evento_slug?: string;
  notas?: string;
  /** Consentimiento explícito para las alergias u otros datos de salud de las notas (RGPD art. 9.2.a). */
  consiente_salud?: boolean;
  /** Campo trampa: los humanos no lo ven; si llega relleno, es un bot. */
  web?: string;
}

/** Solicitud de reserva desde la web (queda PENDIENTE hasta que el local la confirme). */
export async function solicitarReserva(r: ReservaWeb): Promise<ResultadoAccion<{ id: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || !/^\d{2}:\d{2}$/.test(r.hora)) return { ok: false, error: "Elige día y hora.", codigo: "ERROR" };
  const notas = String(r.notas ?? "").trim().slice(0, 500);
  if (notas && r.consiente_salud !== true) {
    return { ok: false, error: "Para enviar notas (alergias, etc.), marca la casilla de consentimiento.", codigo: "ERROR" };
  }
  // Mismos topes que los CHECK de laofi.reservas (nombre 1-60, teléfono 9-16).
  const p = {
    ...r,
    nombre: String(r.nombre ?? "").trim().slice(0, 60),
    telefono: String(r.telefono ?? "").slice(0, 16),
    email: String(r.email ?? "").trim().slice(0, 120),
    notas,
    ip_hash: await hashIp(),
  };
  const res = await rpcPublica<{ id: string }>("laofi_crear_reserva", { p });
  if (!res) return { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
  if (res.error) {
    return res.error.code === "P0001"
      ? { ok: false, error: res.error.message, codigo: "ERROR" }
      : { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
  }
  return { ok: true, data: res.data! };
}

/**
 * SHA-256 de la IP con sal, para que la base de datos limite las solicitudes por
 * conexión sin guardar la IP. En Vercel, x-forwarded-for lo pone la plataforma.
 */
async function hashIp(): Promise<string | undefined> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]!.trim();
  if (!ip) return undefined;
  return createHash("sha256").update(`${process.env.LAOFI_SITE_KEY ?? "laofi"}:${ip}`).digest("hex");
}
