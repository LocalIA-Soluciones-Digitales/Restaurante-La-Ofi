import type { SeleccionModificador } from "@/lib/carta";
import type { CartaItem } from "@/lib/restaurant/types";

/**
 * Lo que la carta necesita de la cesta. La carta funciona igual sin cesta (solo
 * consulta): el botón "+ añadir" aparece únicamente si se le pasan estos controles.
 */
export interface CartaCartControls {
  /** Unidades de este producto en la cesta (sumando todas sus variantes). */
  cantidad: (productoId: string) => number;
  anadir: (item: CartaItem, opciones?: { seleccion?: SeleccionModificador[]; notas?: string; cantidad?: number }) => void;
  /** Quita una unidad de la última línea de ese producto. */
  quitarUno: (productoId: string) => void;
  /** false = el producto no se puede pedir online (sin precio publicado, contenido de ejemplo…). */
  sePuedePedir: (item: CartaItem) => boolean;
}
