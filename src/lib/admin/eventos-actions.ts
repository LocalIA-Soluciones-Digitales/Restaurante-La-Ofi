"use server";

import { obtenerSesionAdmin, supabaseStaff } from "@/lib/admin/session";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { PGLITE_ACTIVO } from "@/lib/supabase/dev-pglite";

// Fotos y vídeos de los eventos en el bucket público laofi-eventos (RLS de Storage
// con laofi.es_gestor()). El archivo NO pasa por la Server Action (un vídeo supera
// su límite): aquí solo se firma la subida y el navegador la sube directo a Storage.

const BUCKET = "laofi-eventos";
const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export interface SubidaFirmada {
  ruta: string;
  token: string;
  url: string;
}

/** Firma la subida de una foto o vídeo y devuelve también su URL pública final. */
export async function firmarSubidaEvento(tipoMime: string, bytes: number): Promise<ResultadoAccion<SubidaFirmada>> {
  if (!(await obtenerSesionAdmin())) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar.", codigo: "ERROR" };
  if (PGLITE_ACTIVO) return { ok: false, error: "Las fotos y vídeos no están disponibles en este entorno.", codigo: "NO_ACTIVO" };
  const ext = EXTENSIONES[tipoMime];
  if (!ext) return { ok: false, error: "Formato no admitido (JPG, PNG, WebP, GIF, MP4, WebM o MOV).", codigo: "ERROR" };
  if (bytes > MAX_BYTES) return { ok: false, error: "El archivo pesa más de 50 MB.", codigo: "ERROR" };
  const supabase = await supabaseStaff();
  if (!supabase) return { ok: false, error: "Supabase no está configurado.", codigo: "NO_ACTIVO" };
  const ruta = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) {
    console.error("[eventos] firmar subida", error?.message);
    // Pasó en producción: la migración 20261022120000_laofi_eventos_media no estaba aplicada y no existía el bucket.
    if (/bucket not found/i.test(error?.message ?? "")) {
      return { ok: false, error: "Falta crear el almacén de fotos de eventos en Supabase (migración laofi_eventos_media).", codigo: "NO_ACTIVO" };
    }
    return { ok: false, error: `No se ha podido preparar la subida${error?.message ? ` (${error.message})` : ""}.`, codigo: "ERROR" };
  }
  return { ok: true, data: { ruta, token: data.token, url: supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl } };
}
