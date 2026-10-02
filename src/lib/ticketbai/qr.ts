import { crc8 } from "@/lib/ticketbai/crc8";

/**
 * URL de la aplicación web de comprobación del QR TBAI, específica por Hacienda Foral
 * (sección 4.3.3). La Ofi está en Derio (Bizkaia), así que se usa siempre la de
 * Bizkaia. La barra final es intencionada: el documento indica que forma parte de la cadena
 * sobre la que se calcula el CRC.
 */
const QR_BASE_URL_BIZKAIA = "https://batuz.eus/QRTBAI/";

/**
 * Construye la URL completa del QR TBAI (sección 4.3.3): id/s/nf/i como parámetros, y un
 * último parámetro "cr" con el CRC-8 de la URL construida hasta ese punto (sin el propio "cr"
 * ni el "&" que lo precede). Verificado contra el ejemplo oficial del documento.
 */
export function construirUrlQrTbai(input: {
  identificativoTbai: string;
  serieFactura: string;
  numFactura: string;
  importeTotalFacturaCentimos: number;
}): string {
  const importe = (input.importeTotalFacturaCentimos / 100).toFixed(2);

  const params = new URLSearchParams();
  params.set("id", input.identificativoTbai);
  params.set("s", input.serieFactura);
  params.set("nf", input.numFactura);
  params.set("i", importe);

  const contenidoSinCrc = `${QR_BASE_URL_BIZKAIA}?${params.toString()}`;
  const cr = crc8(contenidoSinCrc);

  return `${contenidoSinCrc}&cr=${cr}`;
}
