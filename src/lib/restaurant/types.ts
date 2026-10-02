// Tipos de La Ofi. Las "filas" son lo que devuelven las RPC públicas laofi_* del
// schema propio `laofi`; los "view models" son lo que pintan los componentes,
// independientes de si el dato viene de Supabase o del contenido de referencia.

// --- Respuestas de las RPC públicas ----------------------------------------

export type FuenteNutricion = "restaurante" | "ejemplo";
export type Etiqueta =
  | "casero"
  | "temporada"
  | "brasa"
  | "recomendado"
  | "vegetariano"
  | "vegano"
  | "sin_gluten"
  | "para_picar"
  | "picante"
  | "nuevo";
export type MomentoCarta = "desayuno" | "mediodia" | "tarde";
export type Estacion = "cocina" | "barra";

export interface NutricionRpc {
  calorias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
  fuente: FuenteNutricion;
}

export interface ModificadorOpcion {
  id: string;
  nombre: string;
  precio_extra_centimos: number;
}

export interface Modificador {
  id: string;
  nombre: string;
  tipo: "unico" | "multiple";
  obligatorio: boolean;
  max_opciones: number | null;
  opciones: ModificadorOpcion[];
}

export interface CartaProducto {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** null = "Consultar precio". */
  precio_centimos: number | null;
  imagen_url: string | null;
  /** Claves normalizadas de los 14 alérgenos UE (p. ej. "frutos_cascara"). */
  alergenos: string[];
  destacado: boolean;
  // Campos de la carta extendida (migración 20261002100000). Opcionales para
  // seguir funcionando contra una base de datos sin esa migración aplicada.
  imagenes?: string[];
  video_url?: string | null;
  alergenos_confirmados?: boolean;
  ingredientes?: string[];
  nutricion?: NutricionRpc | null;
  etiquetas?: Etiqueta[];
  momento?: MomentoCarta[];
  estacion?: Estacion;
  maridaje?: string | null;
  modificadores?: Modificador[];
}

export interface CartaCategoria {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo: "comida" | "bebida";
  productos: CartaProducto[];
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
  /** Última edición (ISO). Lo devuelve laofi_get_menu_dia desde la migración de carta extendida. */
  updated_at?: string | null;
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

export interface Nutricion {
  calorias: number | null;
  proteinas: number | null;
  carbohidratos: number | null;
  grasas: number | null;
  fuente: FuenteNutricion;
}

export interface CartaItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioCentimos: number | null;
  /** Foto principal (la primera de `imagenes`). */
  imagen: ImagenRef | null;
  imagenes: ImagenRef[];
  video: string | null;
  alergenos: string[];
  /** false = los alérgenos aún no están confirmados por el restaurante. */
  alergenosConfirmados: boolean;
  destacado: boolean;
  ingredientes: string[];
  /** null = sin dato: la web no muestra la sección (nunca "0 kcal"). */
  nutricion: Nutricion | null;
  etiquetas: Etiqueta[];
  /** Vacío = se sirve todo el día. */
  momento: MomentoCarta[];
  estacion: Estacion;
  maridaje: string | null;
  modificadores: Modificador[];
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
  /** Hora de la última actualización desde /admin (solo datos reales). */
  actualizadoEn: string | null;
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
// Mismo contrato funcional que Palomita-Bar, pero con tablas propias en el schema
// laofi (mesas, pedidos, reservas) cuando se construyan. Ver ARCHITECTURE.md §5.

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
