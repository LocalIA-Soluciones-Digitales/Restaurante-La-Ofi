import type { IconName } from "@/components/ui/Icon";

// Roles del panel y qué sección ve cada uno. La seguridad real está en Postgres
// (laofi.exigir_rol en cada RPC); esto solo decide qué se enseña en la interfaz.

export type Rol = "admin" | "encargado" | "camarero" | "cocina";

export const ROLES: Record<Rol, string> = {
  admin: "Administración",
  encargado: "Encargado/a",
  camarero: "Sala",
  cocina: "Cocina",
};

export interface Seccion {
  href: string;
  label: string;
  icon: IconName;
  roles: readonly Rol[];
  grupo: "servicio" | "gestion" | "ajustes";
}

const TODOS = ["admin", "encargado", "camarero", "cocina"] as const;
const SALA = ["admin", "encargado", "camarero"] as const;
const GESTION = ["admin", "encargado"] as const;

export const SECCIONES: Seccion[] = [
  { href: "/admin", label: "Hoy", icon: "grid", roles: TODOS, grupo: "servicio" },
  { href: "/admin/salon", label: "Salón", icon: "users", roles: SALA, grupo: "servicio" },
  { href: "/admin/tpv", label: "TPV", icon: "cash", roles: SALA, grupo: "servicio" },
  { href: "/admin/cocina", label: "Cocina y barra", icon: "flame", roles: TODOS, grupo: "servicio" },
  { href: "/admin/reservas", label: "Reservas", icon: "calendar", roles: SALA, grupo: "servicio" },
  { href: "/admin/menu-del-dia", label: "Menú del día", icon: "sun", roles: GESTION, grupo: "gestion" },
  { href: "/admin/carta", label: "Carta", icon: "utensils", roles: GESTION, grupo: "gestion" },
  { href: "/admin/eventos", label: "Eventos", icon: "music", roles: GESTION, grupo: "gestion" },
  { href: "/admin/ventas", label: "Ventas e informes", icon: "chart", roles: GESTION, grupo: "gestion" },
  { href: "/admin/caja", label: "Cierre de caja", icon: "receipt", roles: GESTION, grupo: "gestion" },
  { href: "/admin/fidelizacion", label: "Fidelización", icon: "gift", roles: GESTION, grupo: "gestion" },
  { href: "/admin/resenas", label: "Reseñas", icon: "star", roles: GESTION, grupo: "gestion" },
  { href: "/admin/mesas", label: "Mesas y QR", icon: "qr", roles: GESTION, grupo: "ajustes" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", roles: ["admin"], grupo: "ajustes" },
  { href: "/admin/staff", label: "Equipo", icon: "users", roles: ["admin"], grupo: "ajustes" },
];

export function puedeVer(rol: Rol | null | undefined, href: string): boolean {
  if (!rol) return false;
  const s = [...SECCIONES].sort((a, b) => b.href.length - a.href.length).find((x) => href === x.href || href.startsWith(`${x.href}/`));
  return s ? s.roles.includes(rol) : rol === "admin";
}

/** Primera sección útil de cada rol (cocina entra directa al KDS). */
export function inicioDe(rol: Rol): string {
  return rol === "cocina" ? "/admin/cocina" : "/admin";
}
