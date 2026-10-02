"use server";

import { randomUUID } from "node:crypto";
import type { Rol } from "@/lib/admin/roles";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import type { ResultadoAccion } from "@/lib/pedidos/types";
import { PGLITE_ACTIVO, rpcLocal } from "@/lib/supabase/dev-pglite";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const ROLES: Rol[] = ["admin", "encargado", "camarero", "cocina"];

/**
 * Alta de una cuenta de staff (solo rol admin): crea el usuario en Supabase Auth
 * y lo vincula a La Ofi (public.usuarios_negocio) con su rol (laofi.staff). Usa
 * la service_role, solo en servidor. En el backend local crea solo la ficha.
 */
export async function crearEmpleado(datos: { email: string; nombre: string; rol: Rol; password: string }): Promise<ResultadoAccion<{ user_id: string }>> {
  const sesion = await obtenerSesionAdmin();
  if (sesion?.rol !== "admin") return { ok: false, error: "Solo un administrador puede dar de alta al equipo.", codigo: "ERROR" };
  const email = datos.email.trim().toLowerCase();
  const nombre = datos.nombre.trim().slice(0, 40);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !nombre || !ROLES.includes(datos.rol)) return { ok: false, error: "Revisa el email, el nombre y el rol.", codigo: "ERROR" };
  if (datos.password.length < 10) return { ok: false, error: "La contraseña debe tener al menos 10 caracteres.", codigo: "ERROR" };

  if (PGLITE_ACTIVO) {
    const id = randomUUID();
    const r = await rpcLocal("laofi_admin_guardar", { p_tabla: "staff", p_fila: { user_id: id, nombre, rol: datos.rol } }, "authenticated");
    return r.error ? { ok: false, error: r.error.message, codigo: "ERROR" } : { ok: true, data: { user_id: id } };
  }

  const sb = getServiceRoleClient();
  if (!sb) return { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY: crea el usuario en Supabase → Authentication y vincúlalo (README).", codigo: "NO_ACTIVO" };

  const { data: creado, error } = await sb.auth.admin.createUser({ email, password: datos.password, email_confirm: true, user_metadata: { nombre } });
  if (error || !creado.user) return { ok: false, error: error?.message.includes("already") ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta.", codigo: "ERROR" };
  const userId = creado.user.id;

  // Vincula y crea la ficha en una sola RPC (service_role): no hace falta exponer el schema laofi.
  const { error: errVinculo } = await sb.rpc("laofi_vincular_staff", { p_user_id: userId, p_nombre: nombre, p_rol: datos.rol });
  if (errVinculo) {
    await sb.auth.admin.deleteUser(userId);
    return { ok: false, error: "No se pudo vincular la cuenta a La Ofi. Se ha deshecho el alta.", codigo: "ERROR" };
  }
  return { ok: true, data: { user_id: userId } };
}
