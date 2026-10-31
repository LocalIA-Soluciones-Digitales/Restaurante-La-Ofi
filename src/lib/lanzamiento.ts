/**
 * Hasta diciembre de 2026 la web enseña y anuncia (menú del día, carta, eventos,
 * dónde estamos) y deja apuntarse a los eventos. Reservar mesa y El Despacho y
 * pedir para llevar salen como «Próximamente»: se abren poniendo esto a false.
 * Los pedidos desde la mesa (QR) no dependen de esto.
 */
export const PROXIMAMENTE = {
  reservas: true,
  pedidos: true,
} as const;

/** Lo que llega después, con el mismo texto en /reservar, /pedir y los vídeos. */
export const LLEGA_PRONTO: { icono: "calendar" | "briefcase" | "bag" | "card"; titulo: string; texto: string }[] = [
  { icono: "calendar", titulo: "Reservar mesa", texto: "En el comedor, con el menú del día o de carta." },
  { icono: "briefcase", titulo: "El Despacho", texto: "El comedor privado, por personas, hasta 30." },
  { icono: "bag", titulo: "Pedir para llevar", texto: "Pide desde el móvil y recógelo a tu hora." },
  { icono: "card", titulo: "Pago online", texto: "Paga al pedir y solo pasa a recoger." },
];
