"use server";

import { rpcAdmin } from "@/lib/admin/actions";
import { obtenerSesionAdmin, supabaseStaff } from "@/lib/admin/session";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { PGLITE_ACTIVO } from "@/lib/supabase/dev-pglite";

// Gastos: datos por RPC (laofi_admin_*, con su rol en Postgres) y documentos en
// el bucket privado laofi-gastos (RLS de Storage con laofi.es_gestor()). Con el
// backend local (PGlite) no hay Storage: el gasto se guarda sin documento.

const BUCKET = "laofi-gastos";

export async function gastosEntre<T>(desde: string, hasta: string) {
  return rpcAdmin<T>("laofi_admin_gastos", { p_desde: desde, p_hasta: hasta });
}

export async function guardarGasto<T>(gasto: Record<string, unknown>) {
  return rpcAdmin<T>("laofi_admin_guardar_gasto", { p: gasto });
}

export async function editarProveedorGasto(id: string, cambios: Record<string, unknown>) {
  return rpcAdmin<null>("laofi_admin_proveedor_gasto", { p_id: id, p: cambios });
}

/** Sube la copia JPEG del documento y devuelve su ruta (null sin Storage). */
export async function subirDocumentoGasto(form: FormData): Promise<ResultadoAccion<string | null>> {
  if (!(await obtenerSesionAdmin())) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", codigo: "ERROR" };
  if (PGLITE_ACTIVO) return { ok: true, data: null };
  const archivo = form.get("documento");
  if (!(archivo instanceof Blob) || archivo.type !== "image/jpeg" || archivo.size > 5 * 1024 * 1024) {
    return { ok: false, error: "El documento no es válido (JPEG de hasta 5 MB).", codigo: "ERROR" };
  }
  const supabase = await supabaseStaff();
  if (!supabase) return { ok: false, error: "Supabase no está configurado.", codigo: "NO_ACTIVO" };
  const ruta = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: "image/jpeg", upsert: false });
  if (error) {
    console.error("[gastos] subir", error.message);
    return { ok: false, error: "No se ha podido guardar la foto del documento.", codigo: "ERROR" };
  }
  return { ok: true, data: ruta };
}

/** Enlace temporal (10 min) para ver el documento. */
export async function verDocumentoGasto(ruta: string): Promise<ResultadoAccion<string>> {
  if (!(await obtenerSesionAdmin())) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", codigo: "ERROR" };
  const supabase = PGLITE_ACTIVO ? null : await supabaseStaff();
  if (!supabase) return { ok: false, error: "Los documentos no están disponibles en este entorno.", codigo: "NO_ACTIVO" };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 600);
  if (error || !data) return { ok: false, error: "No se ha encontrado el documento.", codigo: "ERROR" };
  return { ok: true, data: data.signedUrl };
}

export async function borrarGasto(id: string): Promise<ResultadoAccion<null>> {
  const r = await rpcAdmin<string | null>("laofi_admin_borrar_gasto", { p_id: id });
  if (!r.ok) return r;
  if (r.data && !PGLITE_ACTIVO) {
    const supabase = await supabaseStaff();
    await supabase?.storage.from(BUCKET).remove([r.data]);
  }
  return { ok: true, data: null };
}
