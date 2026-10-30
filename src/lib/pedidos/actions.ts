"use server";

import { getCartaContent } from "@/lib/restaurant/content";
import { getTitularResuelto } from "@/lib/restaurant/titular";
import type { CartaSeccion } from "@/lib/restaurant/types";
import { rpcPublica } from "@/lib/supabase/rpc";
import type {
  ConfigPedidos,
  GrupoPublico,
  MesaPublica,
  ModoSesion,
  Participante,
  PedidoInput,
  PedidoPublico,
  ResultadoAccion,
  SesionPublica,
} from "@/lib/pedidos/types";

// Server Actions del flujo de pedido. El navegador nunca habla con Supabase ni
// conoce la site_key: llama a estas acciones, que llaman a las RPC laofi_*
// (que a su vez lo validan todo en Postgres). Ver ARCHITECTURE.md §5.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{8,64}$/;

async function llamar<T>(fn: string, args: Record<string, unknown>): Promise<ResultadoAccion<T>> {
  const r = await rpcPublica<T>(fn, args);
  if (!r) return { ok: false, error: "Los pedidos online aún no están activos.", codigo: "NO_ACTIVO" };
  if (r.error) return traducirError(r.error.message, r.error.code);
  return { ok: true, data: r.data as T };
}

/** Errores de Postgres → mensaje para el cliente (solo los nuestros, P0001, se muestran tal cual). */
function traducirError(mensaje: string, codigo?: string): ResultadoAccion<never> {
  if (codigo === "PGRST202" || codigo === "42883" || /does not exist|Could not find the function/i.test(mensaje)) {
    return { ok: false, error: "Los pedidos online aún no están activos.", codigo: "NO_ACTIVO" };
  }
  if (mensaje.startsWith("PRECIO_CAMBIADO")) {
    return { ok: false, error: "Algún precio ha cambiado. Revisa tu pedido antes de confirmarlo.", codigo: "PRECIO_CAMBIADO" };
  }
  if (mensaje.startsWith("AGOTADO")) {
    return { ok: false, error: "Algún plato de tu pedido se ha agotado. Revisa tu pedido.", codigo: "AGOTADO" };
  }
  if (codigo === "P0001") return { ok: false, error: mensaje, codigo: "ERROR" };
  console.error("[pedidos]", codigo, mensaje);
  return { ok: false, error: "No hemos podido completar la operación. Inténtalo de nuevo o pídelo al personal.", codigo: "ERROR" };
}

const invalido = (que: string): ResultadoAccion<never> => ({ ok: false, error: `${que} no válido.`, codigo: "ERROR" });

export async function obtenerConfigPedidos(): Promise<ResultadoAccion<ConfigPedidos | null>> {
  const [r, titular] = await Promise.all([llamar<ConfigPedidos | null>("laofi_get_config_pedidos", {}), getTitularResuelto()]);
  return r.ok && r.data ? { ok: true, data: { ...r.data, titular: { razonSocial: titular.razonSocial, nif: titular.nif } } } : r;
}

export async function validarMesa(token: string): Promise<ResultadoAccion<MesaPublica | null>> {
  if (!TOKEN.test(token)) return { ok: true, data: null };
  return llamar<MesaPublica | null>("laofi_validar_mesa", { p_token: token });
}

/** Pedir en mesa sin QR: la llave de la mesa solo se da si sala ya la ha abierto. */
export async function mesaPorNumero(numero: string): Promise<ResultadoAccion<{ estado: "abierta"; token: string } | { estado: "cerrada" } | null>> {
  const limpio = numero.trim().slice(0, 20);
  if (!limpio) return { ok: false, error: "Escribe el número de tu mesa.", codigo: "ERROR" };
  return llamar("laofi_mesa_por_numero", { p_numero: limpio });
}

export async function iniciarSesionMesa(token: string, modo: ModoSesion): Promise<ResultadoAccion<{ id: string; modo: ModoSesion }>> {
  if (!TOKEN.test(token)) return invalido("Código de mesa");
  return llamar("laofi_iniciar_sesion_mesa", { p_token: token, p_modo: modo });
}

export async function unirseSesion(sesionId: string, nombre: string, deviceId: string): Promise<ResultadoAccion<Participante>> {
  if (!UUID.test(sesionId)) return invalido("Sesión");
  const limpio = nombre.trim().slice(0, 40);
  if (!limpio) return { ok: false, error: "Escribe tu nombre.", codigo: "ERROR" };
  return llamar("laofi_unirse_sesion", { p_sesion_id: sesionId, p_nombre: limpio, p_device_id: deviceId.slice(0, 80) });
}

export async function obtenerSesion(sesionId: string): Promise<ResultadoAccion<SesionPublica | null>> {
  if (!UUID.test(sesionId)) return invalido("Sesión");
  return llamar("laofi_get_sesion", { p_sesion_id: sesionId });
}

export async function asumirReparto(repartoId: string, participanteId: string): Promise<ResultadoAccion<null>> {
  if (!UUID.test(repartoId) || !UUID.test(participanteId)) return invalido("Parte");
  return llamar("laofi_asumir_reparto", { p_reparto_id: repartoId, p_participante_id: participanteId });
}

export async function avisarMesa(token: string, tipo: "CAMARERO" | "CUENTA"): Promise<ResultadoAccion<null>> {
  if (!TOKEN.test(token)) return invalido("Código de mesa");
  return llamar("laofi_avisar", { p_token: token, p_tipo: tipo });
}

export async function crearGrupo(nombre: string, organizador: string, recogidaEn: string): Promise<ResultadoAccion<{ token: string }>> {
  if (!nombre.trim() || !organizador.trim()) return { ok: false, error: "Pon un nombre al grupo y el tuyo.", codigo: "ERROR" };
  return llamar("laofi_crear_grupo", { p_nombre: nombre.trim().slice(0, 60), p_organizador: organizador.trim().slice(0, 40), p_recogida_en: recogidaEn });
}

export async function obtenerGrupo(token: string): Promise<ResultadoAccion<GrupoPublico | null>> {
  if (!TOKEN.test(token)) return { ok: true, data: null };
  return llamar("laofi_get_grupo", { p_token: token });
}

export async function crearPedido(pedido: PedidoInput): Promise<ResultadoAccion<{ id: string; numero_dia: number; total_centimos: number }>> {
  if (!Array.isArray(pedido.items) || pedido.items.length === 0) return { ok: false, error: "Tu pedido está vacío.", codigo: "ERROR" };
  const idsValidos = (i: PedidoInput["items"][number]) => ("menu_dia" in i ? i.platos.length > 0 && i.platos.every((p) => UUID.test(p)) : UUID.test(i.producto_id));
  if (!pedido.items.every(idsValidos)) return { ok: false, error: "Hay platos de ejemplo que no se pueden pedir.", codigo: "ERROR" };
  return llamar("laofi_crear_pedido", { p_pedido: pedido });
}

export async function obtenerPedido(id: string): Promise<ResultadoAccion<PedidoPublico | null>> {
  if (!UUID.test(id)) return { ok: true, data: null };
  return llamar("laofi_get_pedido", { p_pedido_id: id });
}

/** Carta recién leída (sin caché) para comprobar precios y disponibilidad antes de confirmar. */
export async function cartaActual(): Promise<CartaSeccion[] | null> {
  const c = await getCartaContent();
  return c.status === "real" ? c.data : null;
}
