// Manual del ciclo de un pedido en mesa (QR → cocina/barra → sala → cobro → cierre).
// Lo pinta /admin/manual y lo resume docs/MANUAL_PEDIDOS.md. Las capturas son
// reales, hechas con el backend local (npm run dev:local) y guardadas en public/manual.

export type QuienManual = "cliente" | "cocina" | "sala" | "encargado";

export interface Captura {
  src: string;
  alt: string;
  /** Móvil (vertical) o tablet/ordenador (horizontal): cambia el tamaño en la página. */
  movil?: boolean;
}

export interface PasoManual {
  id: string;
  titulo: string;
  quien: QuienManual;
  donde: string;
  pasos: string[];
  consejo?: string;
  capturas: Captura[];
}

export const QUIEN: Record<QuienManual, { label: string; clase: string }> = {
  cliente: { label: "Cliente", clase: "bg-neon text-noche" },
  cocina: { label: "Cocina y barra", clase: "bg-terracota text-crema" },
  sala: { label: "Sala", clase: "bg-oliva text-crema" },
  encargado: { label: "Encargado/a", clase: "bg-marino text-crema" },
};

const M = (n: string) => `/manual/${n}.webp`;

export const MANUAL: PasoManual[] = [
  {
    id: "preparar",
    titulo: "Antes de abrir: QR en cada mesa",
    quien: "encargado",
    donde: "Mesas y QR → Imprimir QR",
    pasos: [
      "Cada mesa tiene su propio QR. Imprímelos a escala 100 % y colócalos en su mesa (no los intercambies: el QR dice qué mesa pide).",
      "Si un QR se pierde o alguien lo fotografía para pedir desde fuera, regéneralo en Mesas y QR → QR de la mesa → «Regenerar» e imprime el nuevo.",
    ],
    capturas: [{ src: M("00-qr-imprimir"), alt: "Hoja de QR de mesa lista para imprimir" }],
  },
  {
    id: "escanear",
    titulo: "1. El cliente escanea el QR",
    quien: "cliente",
    donde: "Móvil del cliente",
    pasos: [
      "Abre la cámara, escanea el QR y entra directamente en la carta de su mesa (sin instalar nada ni registrarse).",
      "La primera persona elige cómo pedir: «Todos juntos» (una sola cuenta) o «Cada uno lo suyo» (cada comensal pide y paga lo suyo).",
    ],
    capturas: [{ src: M("01-qr-bienvenida"), alt: "Bienvenida a la mesa tras escanear el QR", movil: true }],
  },
  {
    id: "elegir",
    titulo: "2. Elige los platos",
    quien: "cliente",
    donde: "Carta de la mesa",
    pasos: [
      "Navega por categorías, busca o filtra por alérgenos y momento del día.",
      "Toca «Añadir» en cada plato; la barra inferior muestra cuántos lleva y el total.",
      "Arriba tiene siempre «Llamar al camarero» y «Cuenta».",
    ],
    capturas: [
      { src: M("02-carta"), alt: "Carta de la mesa con categorías y filtros", movil: true },
      { src: M("03-anadir-platos"), alt: "Platos añadidos y barra «Ver pedido»", movil: true },
    ],
  },
  {
    id: "enviar",
    titulo: "3. Revisa y envía el pedido",
    quien: "cliente",
    donde: "Ver pedido",
    pasos: [
      "Ajusta cantidades, escribe notas para cocina (alergias, «sin miel», punto de la carne…) y elige cómo pagar.",
      "«Enviar pedido» lo manda al momento a cocina y barra. Puede volver a pedir más tarde las veces que quiera: todo suma a la misma mesa.",
    ],
    capturas: [{ src: M("04-cesta"), alt: "Cesta con notas y botón Enviar pedido", movil: true }],
  },
  {
    id: "seguimiento",
    titulo: "4. Sigue su pedido en vivo",
    quien: "cliente",
    donde: "Pantalla del pedido",
    pasos: ["Ve el número de pedido y su estado: Recibido → Aceptado → En preparación → ¡Listo! → Entregado. Se actualiza solo."],
    capturas: [
      { src: M("05-pedido-enviado"), alt: "Pedido recibido", movil: true },
      { src: M("09-cliente-en-preparacion"), alt: "Pedido en preparación", movil: true },
    ],
  },
  {
    id: "recibir",
    titulo: "5. El local lo recibe",
    quien: "sala",
    donde: "Hoy · Cocina y barra",
    pasos: [
      "En «Hoy» aparece en «Pedidos en marcha» y sube el contador «En cocina y barra» (con cuántos están sin aceptar).",
      "En la pantalla de Cocina y barra entra en «Nuevos» con la mesa, la hora, las notas y a qué estación va cada línea (COCINA o BARRA). Suena un aviso si el sonido está activado.",
    ],
    consejo: "En la tablet de cocina toca «Activar sonido» al empezar el turno: los navegadores no dejan sonar sin un primer toque.",
    capturas: [
      { src: M("06-hoy-pedido-nuevo"), alt: "Panel Hoy con el pedido nuevo" },
      { src: M("07-cocina-nuevo"), alt: "Pantalla de cocina con el pedido en Nuevos" },
    ],
  },
  {
    id: "preparar-pedido",
    titulo: "6. Cocina y barra lo preparan",
    quien: "cocina",
    donde: "Cocina y barra",
    pasos: [
      "«Aceptar» (se puede imprimir la comanda automáticamente con «Imprimir al aceptar»).",
      "«Empezar» cuando se pone en marcha y «Listo» cuando está para salir.",
      "Cocina y barra avanzan cada una sus líneas: el pedido no está listo hasta que ambas terminan. Usa las pestañas Cocina / Barra para ver solo lo tuyo.",
    ],
    consejo: "El tiempo de cada comanda se pone en rojo a partir de 20 minutos.",
    capturas: [
      { src: M("08-cocina-preparando"), alt: "Pedido en preparación" },
      { src: M("10-cocina-listo"), alt: "Pedido en Listos" },
    ],
  },
  {
    id: "servir",
    titulo: "7. Sala lo sirve en mesa",
    quien: "sala",
    donde: "Hoy → Atender ya · Salón",
    pasos: [
      "Cuando hay platos listos, la mesa aparece en «Atender ya» (en Hoy) y con un punto verde en el plano del Salón.",
      "Lleva los platos y pulsa «Servido» (en Hoy) o «Servir N platos listos» (en el Salón). El cliente ve «Entregado. ¡Que aproveche!».",
    ],
    capturas: [
      { src: M("12-hoy-platos-listos"), alt: "Atender ya con platos listos para servir" },
      { src: M("14-salon-mesa-servir"), alt: "Salón con la mesa seleccionada y botón Servir" },
      { src: M("15-cliente-servido"), alt: "El cliente ve el pedido entregado", movil: true },
    ],
  },
  {
    id: "comanda",
    titulo: "Si el cliente pide al camarero",
    quien: "sala",
    donde: "Hoy → Nueva comanda · TPV",
    pasos: [
      "No todo el mundo usa el QR. Toca la mesa en el Salón → «Nueva comanda» (o «Nueva comanda» en Hoy), elige mesa, añade productos y envía: entra en cocina y barra igual que un pedido QR.",
      "Las llamadas «Llamar al camarero» llegan a «Atender ya» con sonido; márcalas como «Atendido» al ir a la mesa.",
    ],
    capturas: [{ src: M("13-tpv-comanda"), alt: "TPV tomando una comanda de mesa" }],
  },
  {
    id: "cuenta",
    titulo: "8. El cliente pide la cuenta",
    quien: "cliente",
    donde: "Cuenta (móvil)",
    pasos: [
      "En «Cuenta» ve todo lo consumido por la mesa y toca «Pedir la cuenta» (en «cada uno lo suyo», cada comensal ve su parte y puede pagarla online si está activado).",
      "En el panel aparece en «Atender ya» como «Pide la cuenta» con el importe y un botón «Cobrar».",
    ],
    capturas: [
      { src: M("17-cliente-cuenta-pedida"), alt: "Cuenta de la mesa en el móvil, ya pedida", movil: true },
      { src: M("18-hoy-pide-cuenta"), alt: "Hoy: la mesa pide la cuenta" },
    ],
  },
  {
    id: "cobrar",
    titulo: "9. Cobrar",
    quien: "sala",
    donde: "Hoy → Cobrar · Salón → mesa → Cobrar",
    pasos: [
      "«Cobrar» abre la mesa en el Salón. Usa «Cuenta» para imprimir el ticket si el cliente lo quiere en papel.",
      "En «Cobrar» elige Efectivo o Tarjeta. Si pagan a partes iguales, indica cuántos son y se cobra parte a parte. Con efectivo, escribe lo entregado y calcula el cambio.",
      "Con todo cobrado la mesa sigue abierta (pueden quedarse de sobremesa) y aparece en «Atender ya» como «Pagada». Cuando se vayan, pulsa «Liberar».",
    ],
    capturas: [
      { src: M("19-salon-mesa-cobrar"), alt: "Mesa abierta en el Salón desde «Cobrar»" },
      { src: M("20-cobro"), alt: "Ventana de cobro" },
    ],
  },
  {
    id: "limpiar",
    titulo: "10. Recoger y dejar la mesa libre",
    quien: "sala",
    donde: "Hoy → Atender ya",
    pasos: ["Al liberarla pasa a «Por limpiar». Cuando esté recogida pulsa «Limpia» y vuelve a verse libre (verde) en el plano, lista para los siguientes."],
    capturas: [
      { src: M("21-hoy-pagada"), alt: "Mesa pagada, pendiente de liberar" },
      { src: M("21-hoy-por-limpiar"), alt: "Mesa por limpiar en Atender ya" },
    ],
  },
  {
    id: "cierre",
    titulo: "11. Cierre de caja",
    quien: "encargado",
    donde: "Cierre de caja",
    pasos: [
      "Al terminar el turno revisa ventas por método de pago y lo pendiente de cobro (debe ser 0).",
      "Cuenta el efectivo, indica el fondo inicial y cierra: el sistema calcula el descuadre y guarda el cierre en el histórico.",
    ],
    capturas: [{ src: M("22-cierre-caja"), alt: "Pantalla de cierre de caja" }],
  },
];
