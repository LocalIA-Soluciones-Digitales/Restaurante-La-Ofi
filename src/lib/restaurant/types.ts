// Tipos del vertical "restaurant" de LocalIA. Las filas de BD siguen exactamente
// el schema compartido (mismos nombres que Palomita-Bar); los "view models" son
// lo que pintan los componentes, independientes de si el dato viene de Supabase
// o del contenido de ejemplo de la demo.

// --- Filas de base de datos (RPC públicas) ---------------------------------

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  tipo: "comida" | "bebida";
  orden: number;
}

export interface Producto {
  id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number;
  imagen_url: string | null;
  disponible: boolean;
  destacado: boolean;
  alergenos: string[];
  orden: number;
}

export type TipoPlato = "primero" | "segundo" | "postre" | "plato";

export interface MenuDiaPlato {
  id: string;
  tipo: TipoPlato;
  nombre: string;
  descripcion: string | null;
  alergenos: string[];
  orden: number;
}

export interface MenuDia {
  id: string;
  fecha: string;
  precio_centimos: number | null;
  bebida_incluida: boolean;
  pan_incluido: boolean;
  postre_o_cafe: boolean;
  notas: string | null;
  disponible: boolean;
  platos: MenuDiaPlato[];
}

export type EstadoEvento = "proximo" | "agotado" | "finalizado" | "cancelado";

export interface Evento {
  id: string;
  titulo: string;
  slug: string;
  tipo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  fecha: string;
  hora: string | null;
  precio_centimos: number | null;
  aforo: number | null;
  estado: EstadoEvento;
  enlace_reserva: string | null;
}

// --- Procedencia del contenido ---------------------------------------------

/** supabase = dato real del tenant · instagram/prensa/opiniones/carta = dato real
 * publicado en internet (por el negocio, la prensa, clientes o una foto de la carta),
 * pendiente de confirmar · ejemplo = ilustrativo, no real. */
export type Fuente = "supabase" | "instagram" | "prensa" | "opiniones" | "carta" | "ejemplo";

export type ContentState<T> =
  | { status: "real"; data: T }
  | { status: "demo"; data: T }
  | { status: "empty" };

// --- View models ------------------------------------------------------------

export interface ImagenRef {
  src: string;
  alt: string;
}

export interface CartaItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioCentimos: number | null;
  imagen: ImagenRef | null;
  alergenos: string[];
  destacado: boolean;
  fuente: Fuente;
}

export interface CartaSeccion {
  id: string;
  slug: string;
  nombre: string;
  nota?: string;
  items: CartaItem[];
}

export interface MenuDiaView {
  fecha: string | null;
  precioCentimos: number | null;
  incluye: string[];
  notas: string | null;
  /** Plato del día a elegir (tipo "plato"). */
  platos: MenuDiaPlato[];
  primeros: MenuDiaPlato[];
  segundos: MenuDiaPlato[];
  postres: MenuDiaPlato[];
  fuente: Fuente;
}

export interface EventoView {
  id: string;
  slug: string | null;
  titulo: string;
  tipo: string;
  descripcion: string;
  imagen: ImagenRef | null;
  fecha: string | null;
  hora: string | null;
  precioCentimos: number | null;
  aforo: number | null;
  estado: EstadoEvento;
  enlaceReserva: string | null;
  fuente: Fuente;
}

// --- Preparado para fases siguientes (pedido en mesa, reservas, pagos) -------
// Mismo contrato que las RPC de Palomita-Bar (validar_mesa, crear_pedido_restaurant,
// crear_reserva_publica). Ver ARCHITECTURE.md §5.

export interface Mesa {
  id: string;
  numero: string;
  nombre: string | null;
  identificador: string;
  activa: boolean;
  capacidad: number;
}

export type EstadoPedido = "RECEIVED" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
export type PaymentMethod = "ONLINE" | "LOCAL";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface CartItemInput {
  producto_id: string;
  cantidad: number;
  notas?: string;
}

export interface ReservaInput {
  nombreCliente: string;
  numPersonas: number;
  fecha: string;
  hora: string;
  telefono: string;
  email?: string;
  notas?: string;
}
