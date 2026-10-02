"use server";

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
  /** Campo trampa: los humanos no lo ven; si llega relleno, es un bot. */
  web?: string;
}

/** Solicitud de reserva desde la web (queda PENDIENTE hasta que el local la confirme). */
export async function solicitarReserva(r: ReservaWeb): Promise<ResultadoAccion<{ id: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || !/^\d{2}:\d{2}$/.test(r.hora)) return { ok: false, error: "Elige día y hora.", codigo: "ERROR" };
  const res = await rpcPublica<{ id: string }>("laofi_crear_reserva", { p: r });
  if (!res) return { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
  if (res.error) {
    return res.error.code === "P0001"
      ? { ok: false, error: res.error.message, codigo: "ERROR" }
      : { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
  }
  return { ok: true, data: res.data! };
}
