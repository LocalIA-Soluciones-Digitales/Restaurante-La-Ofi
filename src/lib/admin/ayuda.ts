// Ayuda contextual del panel: el botón «i» de la cabecera explica la pantalla en
// la que estás (qué es, cómo se usa y trucos). Una entrada por sección de
// SECCIONES (roles.ts); se elige por el prefijo más largo de la ruta.

export interface AyudaSeccion {
  /** Para qué sirve, en una o dos frases. */
  resumen: string;
  /** Cómo se usa, en el orden en que se hace. */
  pasos: string[];
  /** Trucos y cosas que conviene saber. */
  consejos?: string[];
  /** Significado de colores o iconos de la pantalla. */
  leyenda?: { color: string; texto: string }[];
}

export const AYUDA: Record<string, AyudaSeccion> = {
  "/admin": {
    resumen: "El servicio de un vistazo: lo que hay que atender ya, lo que está saliendo de cocina y barra y quién llega. Se actualiza solo cada 10 segundos.",
    pasos: [
      "Mira «Atender ya»: mesas que llaman, que piden la cuenta, con platos listos, ya pagadas o por limpiar. Cada fila tiene su botón para resolverla sin salir de aquí.",
      "«Cobrar» abre esa mesa en el Salón con la cuenta lista.",
      "«Pedidos en marcha» muestra cada comanda con su estado y los minutos que lleva; en rojo a partir de 20.",
      "Las cifras de arriba son botones: llevan a Cocina, Salón, Reservas o Caja.",
    ],
    consejos: [
      "Suena un aviso cuando una mesa llama o pide la cuenta. Si usas «Mis mesas» en el Salón, solo verás y oirás las tuyas.",
      "«Nueva comanda» abre el TPV para tomar nota a quien no pide por QR.",
    ],
  },
  "/admin/salon": {
    resumen: "El plano del local con el estado de cada mesa en tiempo real. Desde aquí se sienta, se sirve, se cobra y se libera.",
    pasos: [
      "Toca una mesa: aparecen sus acciones rápidas (servir, comanda, cobrar, liberar) y, a la derecha, el panel completo.",
      "Para sentar a alguien sin reserva, toca una mesa libre e indica los comensales.",
      "Arrastra una reserva de la franja de arriba hasta su mesa (o tócala y luego toca la mesa) para asignarla.",
      "Al terminar el servicio, «Fin de servicio» enseña lo que queda abierto antes de cerrar caja.",
    ],
    consejos: [
      "«Mis mesas» filtra las mesas que tienes asignadas (se recuerda en este dispositivo).",
      "Los filtros de estado (Libre, Ocupada, Avisos…) resaltan solo esas mesas en el plano.",
      "La vista 3D es solo para orientarse; el día a día es más rápido en 2D.",
    ],
    leyenda: [
      { color: "#56653A", texto: "Libre" },
      { color: "#96442B", texto: "Ocupada" },
      { color: "#1E3557", texto: "Reservada" },
      { color: "#8E7CF0", texto: "Pide la cuenta" },
      { color: "#D2AE78", texto: "Por limpiar" },
      { color: "#1F9D74", texto: "Punto verde: platos listos para servir" },
    ],
  },
  "/admin/tpv": {
    resumen: "Tomar nota a mano: para la barra o para una mesa que no pide por QR. La comanda llega a cocina y barra igual que un pedido del cliente.",
    pasos: [
      "Elige en «Para» la mesa (las ocupadas salen primero) o «Barra (sin mesa)».",
      "Toca los productos; si tienen opciones (punto, guarnición…) se piden al añadirlos.",
      "Ajusta cantidades, añade notas por línea o de la comanda, marca invitaciones con el regalo y aplica descuento si toca.",
      "«Enviar a cocina» la manda a preparar. En barra puedes cobrar en el momento.",
    ],
    consejos: [
      "Los productos «según mercado» piden el precio al añadirlos.",
      "Usa el buscador para ir directo a un producto.",
    ],
  },
  "/admin/cocina": {
    resumen: "La pantalla de cocina y barra (KDS): cada comanda entra en «Nuevos» y avanza hasta «Listos». Cada estación solo mueve sus propias líneas.",
    pasos: [
      "«Aceptar» cuando la veas; «Empezar» al ponerla en marcha; «Listo» cuando está para salir.",
      "Usa las pestañas Cocina / Barra para ver solo lo de tu estación.",
      "El pedido completo no está listo hasta que cocina y barra terminan su parte; entonces sala lo ve para servir.",
    ],
    consejos: [
      "Al empezar el turno toca «Activar sonido»: el navegador no deja sonar sin un primer toque.",
      "«Imprimir al aceptar» saca la comanda en la impresora al aceptarla.",
      "El borde de la comanda pasa a ámbar a los 10 minutos y a rojo a los 20.",
      "«Historial de hoy» recupera comandas ya servidas o canceladas.",
    ],
  },
  "/admin/reservas": {
    resumen: "Las reservas del día por horas y en línea de tiempo por mesa: alta, edición, asignación de mesas y seguimiento.",
    pasos: [
      "Crea una reserva con nombre, teléfono, personas, hora y espacio.",
      "Asígnale mesa: si choca con otra reserva se avisa.",
      "Cambia el estado al llegar: Confirmada → Sentada (sienta sus mesas en el Salón), o No-show / Cancelada.",
    ],
    consejos: [
      "Las reservas sin mesa también aparecen arriba del plano del Salón para arrastrarlas a su sitio.",
    ],
  },
  "/admin/menu-del-dia": {
    resumen: "El menú del día en un minuto desde el móvil: fecha, precio, qué incluye y los platos. La web se actualiza al momento.",
    pasos: [
      "Elige la fecha.",
      "Escribe primeros, segundos y postres (o pulsa «Copiar del último menú» y cambia lo necesario).",
      "Guarda: la web muestra «actualizado hoy a las…».",
    ],
  },
  "/admin/carta": {
    resumen: "Categorías y productos de la carta: lo que ve el cliente en la web, en el QR y en el TPV.",
    pasos: [
      "Edita nombre, precio, descripción, foto, alérgenos y si va a cocina o a barra.",
      "Añade opciones (punto de la carne, guarnición…) con su suplemento.",
      "Marca «Agotado» con un toque: desaparece al momento del QR y de la web.",
    ],
    consejos: [
      "La estación (cocina o barra) decide en qué pantalla aparece cada línea de la comanda.",
    ],
  },
  "/admin/eventos": {
    resumen: "Tardeos, partidos y celebraciones que se publican en la web.",
    pasos: [
      "Crea el evento como borrador, con fecha, aforo, precio e imagen.",
      "Publícalo cuando esté listo.",
    ],
  },
  "/admin/contabilidad": {
    resumen: "Ventas y gastos juntos. «Resumen» cruza el mes: lo vendido, lo gastado, la diferencia y el IVA soportado. «Ventas» son los informes (por día, hora, producto, camarero y mesa). «Gastos» guarda albaranes, facturas y tickets.",
    pasos: [
      "En «Resumen», elige el mes con las flechas.",
      "En «Ventas», elige el periodo, revisa las gráficas y exporta a CSV o imprime el informe.",
      "En «Gastos», pulsa «Hacer foto» (o sube una foto o un PDF), revisa proveedor, fecha, total e IVA con la foto al lado y guarda.",
    ],
    consejos: [
      "El lector de gastos reconoce al proveedor por su CIF la próxima vez y le pone su categoría.",
      "Exporta los gastos del mes en CSV para la gestoría.",
    ],
  },
  "/admin/caja": {
    resumen: "El arqueo al final del turno: compara el efectivo que debería haber con el contado y guarda el cierre.",
    pasos: [
      "Comprueba que no queda nada pendiente de cobro.",
      "Indica el fondo inicial y cuenta el efectivo (por billetes y monedas o el total).",
      "Revisa el descuadre y cierra. Se puede imprimir el arqueo.",
    ],
    consejos: ["Los cierres anteriores quedan en el historial de abajo."],
  },
  "/admin/fidelizacion": {
    resumen: "Premios para clientes habituales. Viene apagada: al activarla, las reservas reconocen al cliente por su teléfono y cada N visitas se le concede un premio.",
    pasos: [
      "Activa la fidelización.",
      "Define cada cuántas visitas hay premio y cuál es.",
    ],
  },
  "/admin/mesas": {
    resumen: "Las zonas y mesas del local, su sitio en el plano y sus códigos QR.",
    pasos: [
      "Crea zonas y mesas con capacidad y forma.",
      "Coloca cada mesa en el plano (desbloquea la zona para moverla).",
      "Imprime los QR en lote desde «Imprimir QR» a escala 100 %.",
    ],
    consejos: [
      "Si un QR se filtra o se pierde, regéneralo: el impreso deja de funcionar y hay que imprimir el nuevo.",
    ],
  },
  "/admin/configuracion": {
    resumen: "Ajustes del local: horario, recogida por franjas, pagos, reservas online, datos fiscales y TicketBAI. Todo lo nuevo viene apagado.",
    pasos: [
      "Revisa cada bloque y guarda.",
      "El horario que pongas aquí sustituye al publicado en la web.",
    ],
  },
};

/** Ayuda de la ruta actual (prefijo más largo: /admin/mesas/qr → /admin/mesas). */
export function ayudaDe(pathname: string): AyudaSeccion | null {
  const clave = Object.keys(AYUDA)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || (k !== "/admin" && pathname.startsWith(`${k}/`)));
  return clave ? AYUDA[clave]! : null;
}
