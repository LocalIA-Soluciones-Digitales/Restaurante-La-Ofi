/**
 * La web enseña y anuncia (menú del día, carta, eventos, dónde estamos), deja
 * apuntarse a los eventos y, desde el 04/11/2026, pedir para llevar (comida y vino).
 * Reservar mesa y El Despacho siguen como «Próximamente»: se abren poniendo esto a false.
 * Los pedidos para llevar, además, necesitan «Pedidos para recoger» activado en
 * /admin/configuracion. Los pedidos desde la mesa (QR) no dependen de esto.
 */
export const PROXIMAMENTE = {
  reservas: true,
  pedidos: false,
} as const;

/**
 * Encargos de vino para llevar desde /vinos (Navidad 2026): se encarga, se recoge y se
 * paga en el local. A false, la carta de vinos vuelve a ser solo de consulta.
 * Encender solo con la migración 20261102140000_laofi_encargos_vino aplicada en Supabase.
 */
export const ENCARGOS_VINO = true;

/**
 * Promoción de Navidad 2026: con un encargo de vino de más de 50 € (en botellas), un cava de
 * regalo. Se anuncia en la tienda, el panel y el seguimiento, y en /admin/encargos sale el
 * distintivo para prepararlo. A null, sin promoción.
 */
export const CAVA_DE_REGALO: { masDeCentimos: number } | null = { masDeCentimos: 5000 };

/** Si un encargo con este total lleva el cava de regalo. */
export const conCavaDeRegalo = (totalCentimos: number) => CAVA_DE_REGALO !== null && totalCentimos > CAVA_DE_REGALO.masDeCentimos;

/** Lo que llega después, con el mismo texto en /reservar, /pedir y los vídeos. */
export const LLEGA_PRONTO: { icono: "calendar" | "briefcase" | "bag" | "card"; titulo: string; texto: string }[] = [
  { icono: "calendar", titulo: "Reservar mesa", texto: "En el comedor, con el menú del día o de carta." },
  { icono: "briefcase", titulo: "El Despacho", texto: "El comedor privado, por personas, hasta 30." },
  { icono: "bag", titulo: "Pedir para llevar", texto: "Pide desde el móvil y recógelo a tu hora." },
  { icono: "card", titulo: "Pago online", texto: "Paga al pedir y solo pasa a recoger." },
];
