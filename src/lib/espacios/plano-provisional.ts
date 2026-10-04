import type { MesaSalon, Zona } from "@/lib/admin/types";

// Distribución PROVISIONAL del salón para la web pública (página Espacios). Es la
// misma de supabase/seed/la_ofi_salon_provisional.sql —deducida de las fotos del
// local, no de un plano— y un test comprueba que no se separan. Cuando el local
// confirme el croquis se corrige en los dos sitios (CONTENT_NEEDED.md).

const zona = (slug: string, nombre: string, tipo: Zona["tipo"], x: number, y: number, ancho: number, alto: number, orden: number): Zona => ({
  id: slug,
  slug,
  nombre,
  tipo,
  x,
  y,
  ancho,
  alto,
  orden,
  activa: true,
});

export const ZONAS_PROVISIONALES: Zona[] = [
  zona("despacho", "El Despacho", "despacho", 2, 4, 18, 46, 1),
  zona("barra", "Barra", "barra", 20, 4, 32, 46, 2),
  zona("comedor", "Comedor", "comedor", 52, 4, 46, 46, 3),
  zona("terraza", "Terraza", "terraza", 2, 54, 66, 43, 4),
  zona("chill-out", "Chill-out", "otra", 70, 54, 28, 43, 5),
];

type FilaMesa = [zona: string, numero: string, capacidad: number, forma: MesaSalon["forma"], x: number, y: number];

export const FILAS_MESAS: FilaMesa[] = [
  ["comedor", "1", 4, "cuadrada", 58, 15], ["comedor", "2", 4, "cuadrada", 68, 15],
  ["comedor", "3", 4, "cuadrada", 78, 15], ["comedor", "4", 4, "cuadrada", 88, 15],
  ["comedor", "5", 4, "cuadrada", 58, 28.5], ["comedor", "6", 4, "cuadrada", 68, 28.5],
  ["comedor", "7", 4, "cuadrada", 78, 28.5], ["comedor", "8", 4, "cuadrada", 88, 28.5],
  ["comedor", "9", 4, "cuadrada", 58, 42], ["comedor", "10", 4, "cuadrada", 68, 42],
  ["comedor", "11", 4, "cuadrada", 78, 42], ["comedor", "12", 4, "cuadrada", 88, 42],
  ["barra", "B1", 4, "taburete", 26, 32], ["barra", "B2", 4, "taburete", 36, 32],
  ["barra", "B3", 4, "taburete", 46, 32], ["barra", "B4", 4, "taburete", 26, 44],
  ["barra", "B5", 4, "taburete", 36, 44], ["barra", "B6", 4, "taburete", 46, 44],
  ["despacho", "D1", 12, "rectangular", 11, 27],
  ["terraza", "T1", 4, "cuadrada", 8, 62], ["terraza", "T2", 4, "cuadrada", 28, 62],
  ["terraza", "T3", 4, "cuadrada", 42, 62], ["terraza", "T4", 4, "cuadrada", 62, 62],
  ["terraza", "T5", 4, "cuadrada", 8, 75], ["terraza", "T6", 4, "cuadrada", 28, 75],
  ["terraza", "T7", 4, "cuadrada", 42, 75], ["terraza", "T8", 4, "cuadrada", 62, 75],
  ["terraza", "T9", 4, "cuadrada", 8, 88], ["terraza", "T10", 4, "cuadrada", 28, 88],
  ["terraza", "T11", 4, "cuadrada", 42, 88], ["terraza", "T12", 4, "cuadrada", 62, 88],
];

/** Mesas como las pinta el plano: todas libres, sin datos de servicio. */
export const MESAS_PROVISIONALES: MesaSalon[] = FILAS_MESAS.map(([zonaId, numero, capacidad, forma, x, y]) => ({
  id: `mesa-${numero}`,
  zona_id: zonaId,
  numero,
  nombre: null,
  capacidad,
  forma,
  pos_x: x,
  pos_y: y,
  rotacion: 0,
  token: "",
  activa: true,
  ocupada: false,
  comensales: 0,
  entrada_at: null,
  bloqueada: false,
  bloqueo_motivo: null,
  por_limpiar: false,
  union_grupo_id: null,
  nota: null,
  sesion: null,
  importe_centimos: 0,
  pendiente_centimos: 0,
  pedidos_en_curso: 0,
  aviso_camarero: false,
  pide_cuenta: false,
}));
