import { crc8 } from "@/lib/ticketbai/crc8";

/**
 * Identificativo TBAI (sección 4.3.2 de las especificaciones TicketBAI 1.2): 39 caracteres,
 * "TBAI-{NIF}-{DDMMAA}-{13 primeros de SignatureValue}-{CRC8 de los 36 anteriores}".
 * Formato y CRC verificados contra el ejemplo oficial del documento (ver README.md de este
 * mismo directorio).
 */
export function construirIdentificativoTbai(input: {
  nifEmisor: string;
  fechaExpedicion: Date;
  signatureValue: string;
}): string {
  const nif = input.nifEmisor.trim().toUpperCase();
  if (nif.length !== 9) {
    throw new Error(`NIF de 9 caracteres esperado para el identificativo TBAI, recibido: "${nif}"`);
  }

  const dd = String(input.fechaExpedicion.getDate()).padStart(2, "0");
  const mm = String(input.fechaExpedicion.getMonth() + 1).padStart(2, "0");
  const aa = String(input.fechaExpedicion.getFullYear()).slice(-2);
  const fecha = `${dd}${mm}${aa}`;

  const firma13 = input.signatureValue.slice(0, 13);
  if (firma13.length !== 13) {
    throw new Error("SignatureValue demasiado corto para construir el identificativo TBAI");
  }

  const prefijo36 = `TBAI-${nif}-${fecha}-${firma13}-`;
  const crc = crc8(prefijo36);

  return `${prefijo36}${crc}`;
}
