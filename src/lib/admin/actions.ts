"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inicioDe } from "@/lib/admin/roles";
import { obtenerSesionAdmin, supabaseStaff } from "@/lib/admin/session";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { rpcStaff } from "@/lib/supabase/rpc";

// Server Actions del panel. Toda la autorización real está en Postgres (RLS +
// laofi.exigir_rol en cada RPC); aquí solo se exige sesión y se traducen errores.

async function staff<T>(fn: string, args: Record<string, unknown> = {}): Promise<ResultadoAccion<T>> {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", codigo: "ERROR" };
  const r = await rpcStaff<T>(fn, args);
  if (!r) return { ok: false, error: "Supabase no está configurado.", codigo: "NO_ACTIVO" };
  if (r.error) {
    if (/NO_AUTORIZADO/.test(r.error.message)) return { ok: false, error: "Tu rol no permite hacer esto.", codigo: "ERROR" };
    if (r.error.code === "P0001" || r.error.code === "23514" || r.error.code === "23505") {
      return { ok: false, error: mensajeLegible(r.error.message), codigo: "ERROR" };
    }
    console.error("[admin]", fn, r.error.code, r.error.message);
    return { ok: false, error: "No se ha podido guardar. Inténtalo de nuevo.", codigo: "ERROR" };
  }
  return { ok: true, data: r.data as T };
}

function mensajeLegible(m: string): string {
  if (/duplicate key|23505|unique/i.test(m)) return "Ya existe un registro con ese valor (nombre, número o slug repetido).";
  if (/check constraint/i.test(m)) return "Algún dato no es válido. Revisa el formulario.";
  return m;
}

// --- Sesión ----------------------------------------------------------------------

export async function entrar(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const siguiente = String(form.get("next") ?? "");
  const supabase = await supabaseStaff();
  if (!supabase) return { error: "Supabase no está configurado." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  const sesion = await obtenerSesionAdmin();
  if (!sesion) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel de La Ofi." };
  }
  redirect(siguiente.startsWith("/admin") && !siguiente.startsWith("/admin/login") ? siguiente : inicioDe(sesion.rol));
}

export async function salir() {
  const supabase = await supabaseStaff();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

/** La web pública es ISR (5 min): tras editar desde el panel se regenera al momento. */
const PAGINAS: Record<string, string[]> = {
  categorias: ["/es/carta", "/es/pedir", "/es"],
  productos: ["/es/carta", "/es/pedir", "/es"],
  modificadores: ["/es/carta", "/es/pedir"],
  modificador_opciones: ["/es/carta", "/es/pedir"],
  menus_dia: ["/es/menu-del-dia", "/es"],
  menu_dia_platos: ["/es/menu-del-dia", "/es"],
  eventos: ["/es/eventos", "/es"],
  horario: ["/es", "/es/contacto"],
};

function revalidar(tabla: string) {
  for (const ruta of PAGINAS[tabla] ?? []) revalidatePath(ruta);
  if (tabla === "eventos") revalidatePath("/[locale]/eventos/[slug]", "page");
}

// --- CRUD genérico (lista blanca en Postgres) ---------------------------------------

export async function listar<T>(tabla: string, filtro: Record<string, unknown> = {}) {
  return staff<T[]>("laofi_admin_listar", { p_tabla: tabla, p_filtro: filtro });
}

export async function guardar<T>(tabla: string, fila: Record<string, unknown>) {
  const r = await staff<T>("laofi_admin_guardar", { p_tabla: tabla, p_fila: fila });
  if (r.ok) revalidar(tabla);
  return r;
}

export async function borrar(tabla: string, id: string) {
  const r = await staff<null>("laofi_admin_borrar", { p_tabla: tabla, p_id: id });
  if (r.ok) revalidar(tabla);
  return r;
}

export async function guardarMenuDia<T>(menu: Record<string, unknown>) {
  const r = await staff<T>("laofi_admin_guardar_menu_dia", { p: menu });
  if (r.ok) revalidar("menus_dia");
  return r;
}

// --- Salón, cocina, TPV, caja -----------------------------------------------------------

export async function salon<T>() {
  return staff<T>("laofi_admin_salon");
}

export async function accionMesa<T>(mesaId: string, accion: string, datos: Record<string, unknown> = {}) {
  return staff<T>("laofi_admin_mesa", { p_mesa: mesaId, p_accion: accion, p_datos: datos });
}

export async function colaCocina<T>(historial = false) {
  return staff<T[]>("laofi_admin_cocina", { p_historial: historial });
}

export async function avanzarPedido<T>(pedidoId: string, estado: string, estacion: "cocina" | "barra" | null) {
  return staff<T>("laofi_admin_avanzar", { p_pedido: pedidoId, p_estado: estado, p_estacion: estacion });
}

export async function cancelarPedido(pedidoId: string) {
  return staff<null>("laofi_admin_cancelar_pedido", { p_pedido: pedidoId });
}

export async function crearComanda<T>(pedido: Record<string, unknown>) {
  return staff<T>("laofi_admin_crear_pedido", { p: pedido });
}

export async function cobrar(cobro: { mesa_id?: string; pedido_id?: string; metodo: "EFECTIVO" | "TARJETA"; importe_centimos: number }) {
  return staff<{ pendiente_centimos: number }>("laofi_admin_cobrar", { p: cobro });
}

export async function estadoCaja<T>() {
  return staff<T>("laofi_admin_caja");
}

export async function cerrarCaja<T>(fondoInicial: number, efectivoContado: number, notas: string) {
  return staff<T>("laofi_admin_cerrar_caja", { p_fondo_inicial_centimos: fondoInicial, p_efectivo_contado_centimos: efectivoContado, p_notas: notas });
}

export async function cierresCaja<T>() {
  return staff<T[]>("laofi_admin_cierres", { p_limite: 30 });
}

/** Llamada genérica a una RPC laofi_admin_* (las de reservas, informes, etc.). */
export async function rpcAdmin<T>(fn: `laofi_admin_${string}`, args: Record<string, unknown> = {}) {
  return staff<T>(fn, args);
}
