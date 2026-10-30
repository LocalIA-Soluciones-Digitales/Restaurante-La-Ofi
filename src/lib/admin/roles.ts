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

// De momento el encargado (Carlos) solo ve lo que usa: reservas, pedidos para recoger
// (Cocina y barra), menú del día, carta y eventos. No trabaja con mesas, TPV ni caja.
const TODOS = ["admin", "encargado", "camarero", "cocina"] as const;
const SALA = ["admin", "camarero"] as const;
const SERVICIO = ["admin", "encargado", "camarero"] as const;
const GESTION = ["admin", "encargado"] as const;
const ADMIN = ["admin"] as const;

export const SECCIONES: Seccion[] = [
  { href: "/admin", label: "Hoy", icon: "grid", roles: ["admin", "camarero", "cocina"], grupo: "servicio" },
  { href: "/admin/salon", label: "Salón", icon: "users", roles: SALA, grupo: "servicio" },
  { href: "/admin/tpv", label: "TPV", icon: "cash", roles: SALA, grupo: "servicio" },
  { href: "/admin/cocina", label: "Cocina y barra", icon: "flame", roles: TODOS, grupo: "servicio" },
  { href: "/admin/reservas", label: "Reservas", icon: "calendar", roles: SERVICIO, grupo: "servicio" },
  { href: "/admin/menu-del-dia", label: "Menú del día", icon: "sun", roles: GESTION, grupo: "gestion" },
  { href: "/admin/carta", label: "Carta", icon: "utensils", roles: GESTION, grupo: "gestion" },
  { href: "/admin/eventos", label: "Eventos", icon: "music", roles: GESTION, grupo: "gestion" },
  { href: "/admin/caja", label: "Cierre de caja", icon: "receipt", roles: ADMIN, grupo: "gestion" },
  { href: "/admin/contabilidad", label: "Contabilidad", icon: "chart", roles: ADMIN, grupo: "gestion" },
  { href: "/admin/fidelizacion", label: "Fidelización", icon: "gift", roles: ADMIN, grupo: "gestion" },
  { href: "/admin/mesas", label: "Mesas y QR", icon: "qr", roles: ADMIN, grupo: "ajustes" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", roles: ADMIN, grupo: "ajustes" },
];

export function puedeVer(rol: Rol | null | undefined, href: string): boolean {
  if (!rol) return false;
  // «Mi cuenta» no está en el menú, pero la puede abrir cualquiera.
  if (href === "/admin/cuenta" || href.startsWith("/admin/cuenta/")) return true;
  const s = [...SECCIONES].sort((a, b) => b.href.length - a.href.length).find((x) => href === x.href || href.startsWith(`${x.href}/`));
  return s ? s.roles.includes(rol) : rol === "admin";
}

/** Primera sección útil de cada rol (cocina entra directa al KDS; el encargado, a reservas). */
export function inicioDe(rol: Rol): string {
  if (rol === "cocina") return "/admin/cocina";
  if (rol === "encargado") return "/admin/reservas";
  return "/admin";
}
