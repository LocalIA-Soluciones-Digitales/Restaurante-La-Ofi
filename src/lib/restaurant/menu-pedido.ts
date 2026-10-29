import { cartaItem } from "@/lib/carta";
import type { CartaSeccion, MenuDiaView } from "@/lib/restaurant/types";

// El plato del día se pide como una sección más de la carta: cada opción a elegir
// es una línea al precio del menú. En la cesta su id lleva este prefijo y el pedido
// la manda como menu_plato_id (laofi_crear_pedido cobra el precio guardado).
export const PREFIJO_MENU_DIA = "menu:";

/**
 * Apagado hasta aplicar en Supabase la migración 20261029120000_laofi_pedido_menu_dia:
 * sin ella, laofi_crear_pedido rechaza estas líneas («se ha agotado»).
 */
export const MENU_DIA_PEDIBLE = false;

/**
 * Sección «Menú del día» para pedir, o null si hoy no se puede pedir: solo el
 * plato único con opciones a elegir y con precio. Un menú de primero y segundo
 * no se vende por platos sueltos.
 */
export function seccionMenuDia(menu: MenuDiaView): CartaSeccion | null {
  if (menu.precioCentimos === null || menu.platos.length === 0) return null;
  const incluye = menu.incluye.length ? `Incluye ${menu.incluye.join(", ").toLowerCase()}.` : "";
  return {
    id: "menu-del-dia",
    slug: "menu-del-dia",
    nombre: "Menú del día",
    nota: `Plato del día a elegir. ${incluye}`.trim(),
    items: menu.platos.map((p) =>
      cartaItem({
        id: `${PREFIJO_MENU_DIA}${p.id}`,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioCentimos: menu.precioCentimos,
        // Los marca el encargado al publicar el menú; sin ninguno, «sin confirmar».
        alergenos: p.alergenos,
        alergenosConfirmados: p.alergenos.length > 0,
        estacion: "cocina",
        fuente: "supabase",
      }),
    ),
  };
}
