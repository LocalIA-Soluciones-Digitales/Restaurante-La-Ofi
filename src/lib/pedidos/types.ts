import type { EstadoPedido, PaymentMethod, PaymentStatus } from "@/lib/restaurant/types";

// Tipos del flujo de pedido (respuestas de las RPC laofi_* de la migración
// 20261002110000_laofi_salon_pedidos).

export type ModoSesion = "JUNTOS" | "SEPARADO";

export interface MesaPublica {
  id: string;
  numero: string;
  nombre: string | null;
  zona: string | null;
  sesion_id: string | null;
  modo: ModoSesion | null;
}

export interface Participante {
  id: string;
  nombre: string;
}

export interface RepartoPublico {
  id: string;
  participante_id: string;
  importe_centimos: number;
  pagado: boolean;
  asumido_de_participante_id: string | null;
}

export interface SesionItem {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario_centimos: number;
  estado: EstadoPedido;
  repartos: RepartoPublico[];
}

export interface SesionPedido {
  id: string;
  numero_dia: number;
  estado: EstadoPedido;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  participante_id: string | null;
  total_centimos: number;
  created_at: string;
  items: SesionItem[];
}

export interface SesionPublica {
  id: string;
  modo: ModoSesion;
  estado: "ACTIVA" | "CERRADA";
  mesa: { numero: string; nombre: string | null };
  participantes: Participante[];
  pedidos: SesionPedido[];
}

export interface Franja {
  hora: string;
  libres: number;
}

export interface ConfigPedidos {
  pagos: { online: boolean; en_local: boolean };
  recogida_activa: boolean;
  franjas: Franja[];
}

export interface GrupoPublico {
  token: string;
  nombre: string;
  organizador: string;
  recogida_en: string;
  cierra_en: string;
  abierto: boolean;
  pedidos: { nombre: string; platos: number }[];
}

export interface PedidoItemPublico {
  nombre: string;
  cantidad: number;
  precio_unitario_centimos: number;
  modificadores: { modificador: string; opciones: { nombre: string; precio_extra_centimos: number }[] }[];
  notas: string | null;
  estado: EstadoPedido;
}

export interface PedidoPublico {
  id: string;
  numero_dia: number;
  tipo: "MESA" | "RECOGIDA" | "BARRA";
  estado: EstadoPedido;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_centimos: number;
  recogida_en: string | null;
  nombre: string | null;
  mesa: { numero: string; nombre: string | null } | null;
  grupo: { nombre: string; token: string } | null;
  created_at: string;
  updated_at: string;
  items: PedidoItemPublico[];
}

export interface LineaPedidoInput {
  producto_id: string;
  cantidad: number;
  opciones?: string[];
  notas?: string;
  reparto?: { participante_id: string; importe_centimos: number }[];
}

export interface PedidoInput {
  tipo: "MESA" | "RECOGIDA";
  mesa_token?: string;
  sesion_id?: string;
  participante_id?: string;
  recogida_en?: string;
  grupo_token?: string;
  nombre?: string;
  telefono?: string;
  notas?: string;
  payment_method: PaymentMethod;
  total_esperado_centimos?: number;
  items: LineaPedidoInput[];
}

export type ResultadoAccion<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; codigo?: "PRECIO_CAMBIADO" | "AGOTADO" | "NO_ACTIVO" | "ERROR" };
