"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { PROXIMAMENTE } from "@/lib/lanzamiento";
import { rpcPublica } from "@/lib/supabase/rpc";

export interface ReservaWeb {
  nombre: string;
  telefono: string;
  email?: string;
  personas: number;
  fecha: string;
  hora: string;
  /**
   * «mesa»: el comedor (menú del día, carta o solo la mesa). «despacho»: por personas hasta su aforo, solo carta.
   * «recogida»: menús del día para llevar (personas = número de menús). «presupuesto»: solicitud de grupo desde /grupos.
   */
  espacio: "mesa" | "despacho" | "evento" | "presupuesto" | "recogida";
  /** Qué se va a comer (opcional salvo en la recogida). El servidor copia nombres y precios. */
  comida?: ComidaReserva;
  evento_slug?: string;
  notas?: string;
  /** Consentimiento explícito para las alergias u otros datos de salud de las notas (RGPD art. 9.2.a). */
  consiente_salud?: boolean;
  /** Solo con espacio «presupuesto»: lo que pide la empresa (no son datos de salud). */
  presupuesto?: { empresa?: string; tipo?: string; porPersona?: string; factura?: boolean };
  /** Campo trampa: los humanos no lo ven; si llega relleno, es un bot. */
  web?: string;
}

export type ModoComida = "nada" | "menu" | "carta";

export interface ComidaReserva {
  modo: ModoComida;
  lineas: { id: string; cantidad: number }[];
}

/** Notas del presupuesto para el panel: «Presupuesto · Comida de empresa · Acme SL · 25 €/persona · Factura · …». */
function notasPresupuesto(p: NonNullable<ReservaWeb["presupuesto"]>, libre: string): string {
  const corto = (v: string | undefined, n: number) => String(v ?? "").trim().slice(0, n);
  return [
    "Presupuesto",
    corto(p.tipo, 40),
    corto(p.empresa, 80),
    corto(p.porPersona, 20) ? `${corto(p.porPersona, 20)} por persona` : "",
    p.factura ? "Necesita factura" : "",
    libre,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
}

/** Solicitud de reserva desde la web (queda PENDIENTE hasta que el local la confirme). */
export async function solicitarReserva(r: ReservaWeb): Promise<ResultadoAccion<{ id: string }>> {
  // Hasta que se abran (src/lib/lanzamiento.ts), desde la web solo eventos y presupuestos.
  if (PROXIMAMENTE.reservas && r.espacio !== "evento" && r.espacio !== "presupuesto") {
    return { ok: false, error: "Muy pronto podrás reservar desde la web. Mientras tanto, llámanos.", codigo: "NO_ACTIVO" };
  }
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
    notas: r.espacio === "presupuesto" ? notasPresupuesto(r.presupuesto ?? {}, notas) : notas,
    presupuesto: undefined,
    comida: r.comida && r.comida.modo !== "nada" ? { modo: r.comida.modo, lineas: r.comida.lineas.filter((l) => l.cantidad > 0).slice(0, 40) } : undefined,
    ip_hash: await hashIp(),
  };
  const res = await rpcPublica<{ id: string }>("laofi_crear_reserva", { p });
  if (!res) return { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
  if (res.error) {
    if (res.error.code === "P0001") return { ok: false, error: res.error.message, codigo: "ERROR" };
    // La RPC aún no existe en la base de datos (proyecto sin migrar).
    if (res.error.code === "PGRST202" || res.error.code === "42883") {
      return { ok: false, error: "Las reservas online aún no están activas: llámanos.", codigo: "NO_ACTIVO" };
    }
    console.error("[reservas]", res.error.code, res.error.message);
    return { ok: false, error: "No hemos podido enviar la solicitud. Inténtalo de nuevo o llámanos.", codigo: "ERROR" };
  }
  return { ok: true, data: res.data! };
}

/** Plazas libres de El Despacho ese día, por turno (comida antes de las 17:00, noche después). */
export async function plazasDespacho(fecha: string): Promise<{ aforo: number; comida: number; noche: number } | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const res = await rpcPublica<{ aforo: number; comida: number; noche: number }>("laofi_plazas_despacho", { p_fecha: fecha });
  return res && !res.error ? res.data : null;
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
