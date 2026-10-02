/**
 * Envío del fichero TBAI firmado a la Hacienda Foral de Bizkaia (Batuz/LROE).
 *
 * NO IMPLEMENTADO: el canal de envío de Bizkaia se describe en documentación aparte
 * de las especificaciones funcionales de TicketBAI (https://www.batuz.eus/es/documentacion-tecnica)
 * y hay que confirmarlo contra ella y su entorno de pruebas. Mientras tanto una
 * factura puede quedar FIRMADA pero nunca ENVIADA: TicketBAI exige el envío, así
 * que esto debe completarse antes de activar TICKETBAI_ENABLED en producción.
 */
export async function enviarFacturaTicketBai(): Promise<never> {
  throw new Error("Envío a Batuz/LROE no implementado: falta confirmar endpoint y protocolo (src/lib/ticketbai/envio.ts).");
}
