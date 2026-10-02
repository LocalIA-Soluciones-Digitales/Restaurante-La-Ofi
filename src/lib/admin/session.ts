import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Rol } from "@/lib/admin/roles";
import { DEV_STAFF, PGLITE_ACTIVO, rpcLocal } from "@/lib/supabase/dev-pglite";

export interface SesionAdmin {
  userId: string;
  email: string;
  nombre: string;
  rol: Rol;
}

/** Cliente de Supabase con la sesión del staff (cookie httpOnly gestionada por @supabase/ssr). */
export async function supabaseStaff() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          for (const c of lista) store.set(c.name, c.value, c.options);
        } catch {
          // En Server Components no se pueden escribir cookies: lo hace el middleware.
        }
      },
    },
  });
}

/**
 * Sesión del panel: usuario autenticado + rol en La Ofi (laofi.mi_rol). null si
 * no hay sesión o el usuario no es staff de La Ofi. En el backend local
 * (LAOFI_PGLITE=1) entra un encargado de pruebas sin login.
 */
export const obtenerSesionAdmin = cache(async (): Promise<SesionAdmin | null> => {
  if (PGLITE_ACTIVO) {
    const r = await rpcLocal<{ rol: Rol; nombre: string }>("laofi_admin_yo", {}, "authenticated");
    return r.data?.rol ? { userId: DEV_STAFF.id, email: DEV_STAFF.email, nombre: "Encargado (local)", rol: r.data.rol } : null;
  }
  const supabase = await supabaseStaff();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("laofi_admin_yo");
  const yo = data as { rol: Rol | null; nombre: string } | null;
  if (!yo?.rol) return null;
  return { userId: user.id, email: user.email ?? "", nombre: yo.nombre, rol: yo.rol };
});
