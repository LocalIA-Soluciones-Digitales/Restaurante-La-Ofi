import type { EstadoPedido, PaymentMethod, PaymentStatus } from "@/lib/restaurant/types";

// Tipos de las respuestas de las RPC laofi_admin_* (migración 20261002120000).

export interface Zona {
  id: string;
  slug: string;
  nombre: string;
  tipo: "barra" | "comedor" | "despacho" | "terraza" | "otra";
  x: number;
  y: number;
  ancho: number;
  alto: number;
  orden: number;
  activa: boolean;
  /** Camarero/a asignado a la zona (migración 20261002140000). */
  camarero_id?: string | null;
}

export interface MesaSalon {
  id: string;
  zona_id: string | null;
  numero: string;
  nombre: string | null;
  capacidad: number;
  forma: "cuadrada" | "redonda" | "rectangular" | "taburete";
  pos_x: number | null;
  pos_y: number | null;
  rotacion: number;
  token: string;
  activa: boolean;
  ocupada: boolean;
  comensales: number;
  entrada_at: string | null;
  bloqueada: boolean;
  bloqueo_motivo: string | null;
  por_limpiar: boolean;
  union_grupo_id: string | null;
  nota: string | null;
  sesion: { id: string; modo: "JUNTOS" | "SEPARADO"; participantes: number } | null;
  importe_centimos: number;
  pendiente_centimos: number;
  pedidos_en_curso: number;
  aviso_camarero: boolean;
  pide_cuenta: boolean;
  /** Reserva próxima (laofi_admin_salon desde la migración de reservas). */
  reserva?: { nombre: string; hora: string; personas: number } | null;
  /** Camarero/a de la mesa (el suyo o el de su zona) y platos listos para servir (20261002140000). */
  camarero_id?: string | null;
  camarero?: string | null;
  listos?: number;
}

/** Reserva tal como la devuelve laofi_admin_reservas (laofi.reserva_json). */
export interface ReservaDia {
  id: string;
  nombre: string;
  telefono: string;
  personas: number;
  fecha: string;
  hora: string;
  duracion_min: number;
  espacio: "mesa" | "despacho" | "evento";
  estado: "PENDIENTE" | "CONFIRMADA" | "SENTADA" | "CANCELADA" | "NO_SHOW";
  notas: string | null;
  mesas: { id: string; numero: string }[];
}

export interface PersonaStaff {
  user_id: string;
  nombre: string;
  rol: string;
  activo: boolean;
}

export interface SalonData {
  zonas: Zona[];
  mesas: MesaSalon[];
}

export type EstadoMesa = "libre" | "ocupada" | "reservada" | "bloqueada" | "cuenta" | "limpiar";

export function estadoMesa(m: MesaSalon): EstadoMesa {
  if (m.bloqueada) return "bloqueada";
  if (m.pide_cuenta) return "cuenta";
  if (m.ocupada) return "ocupada";
  if (m.reserva) return "reservada";
  if (m.por_limpiar) return "limpiar";
  return "libre";
}

export const ESTADO_MESA: Record<EstadoMesa, { label: string; color: string; clase: string }> = {
  libre: { label: "Libre", color: "#56653A", clase: "bg-oliva text-crema" },
  ocupada: { label: "Ocupada", color: "#96442B", clase: "bg-terracota text-crema" },
  reservada: { label: "Reservada", color: "#1E3557", clase: "bg-marino text-crema" },
  bloqueada: { label: "Bloqueada", color: "#5E554B", clase: "bg-carbon-muted text-crema" },
  cuenta: { label: "Pide la cuenta", color: "#8E7CF0", clase: "bg-neon-deep text-crema" },
  limpiar: { label: "Por limpiar", color: "#D2AE78", clase: "bg-ratan text-carbon" },
};

export interface ItemKds {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario_centimos: number;
  modificadores: { modificador: string; opciones: { nombre: string; precio_extra_centimos: number }[] }[];
  notas: string | null;
  estacion: "cocina" | "barra";
  estado: EstadoPedido;
  iva_pct: number;
  invitacion: boolean;
}

export interface PedidoKds {
  id: string;
  numero_dia: number;
  tipo: "MESA" | "RECOGIDA" | "BARRA";
  estado: EstadoPedido;
  origen: "web" | "tpv";
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_centimos: number;
  notas: string | null;
  nombre_cliente: string | null;
  recogida_en: string | null;
  created_at: string;
  updated_at: string;
  mesa: { id: string; numero: string; nombre: string | null; comensales: number; zona: string | null } | null;
  grupo: string | null;
  participante: string | null;
  camarero: string | null;
  items: ItemKds[];
}

export function etiquetaPedido(p: Pick<PedidoKds, "tipo" | "mesa" | "nombre_cliente" | "grupo">): string {
  if (p.tipo === "MESA" && p.mesa) return p.mesa.nombre ?? `Mesa ${p.mesa.numero}`;
  if (p.tipo === "RECOGIDA") return `Recoger · ${p.grupo ? `${p.grupo} · ` : ""}${p.nombre_cliente ?? ""}`.trim();
  return p.nombre_cliente ? `Barra · ${p.nombre_cliente}` : "Barra";
}
