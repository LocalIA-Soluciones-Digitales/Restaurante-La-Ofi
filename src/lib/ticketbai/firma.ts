import type { FacturaFirmada } from "@/lib/ticketbai/types";

/**
 * Firma XAdES-BES del fichero TBAI (Política de Firma TicketBAI de Bizkaia:
 * https://www.batuz.eus/fitxategiak/batuz/ticketbai/Especificaciones_firma_v1_0.pdf).
 *
 * DELIBERADAMENTE NO IMPLEMENTADA (igual que en Palomita-Bar §19): una firma XAdES
 * "casi bien" puede ser rechazada por Hacienda o, peor, aceptada siendo inválida.
 * Se implementa con el certificado digital real del titular de La Ofi (certificado
 * de representante o sello de entidad), probándola en el entorno de pruebas de
 * Bizkaia. Candidatas: `xadesjs` + `@peculiar/webcrypto` para cargar el .p12.
 * Es el único sitio que hay que rellenar: numeración, encadenamiento, XML, QR e
 * identificativo ya están listos.
 */
export interface FirmanteTicketBai {
  firmar(xmlSinFirmar: string): Promise<FacturaFirmada>;
}

export function getFirmanteTicketBai(): FirmanteTicketBai {
  return {
    async firmar(): Promise<FacturaFirmada> {
      throw new Error(
        "Firma TicketBAI no configurada: falta el certificado digital del titular de La Ofi y su integración XAdES-BES (src/lib/ticketbai/firma.ts).",
      );
    },
  };
}
