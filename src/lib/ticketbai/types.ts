export interface LineaFacturaTicketBai {
  descripcion: string;
  cantidad: number;
  importeUnitarioCentimos: number;
  importeTotalCentimos: number;
  /** 10.00 (hostelería) o 21.00 (bebidas alcohólicas): laofi.productos.iva_pct */
  tipoImpositivo: number;
}

export interface DesgloseIvaTicketBai {
  tipoImpositivo: number;
  baseImponibleCentimos: number;
  cuotaCentimos: number;
}

export interface EncadenamientoAnterior {
  serieFactura: string;
  numFactura: string;
  fechaExpedicion: Date;
  /** Primeros 100 caracteres del SignatureValue de la factura anterior, ya truncados. */
  firma: string;
}

export interface SoftwareTicketBai {
  licenciaTbai: string;
  nifEntidadDesarrolladora: string;
  nombre: string;
  version: string;
}

export interface DatosFacturaTicketBai {
  serieFactura: string;
  numFactura: string;
  fechaExpedicion: Date;
  nifEmisor: string;
  nombreRazonSocialEmisor: string;
  descripcionFactura: string;
  facturaSimplificada: boolean;
  importeTotalFacturaCentimos: number;
  lineas: LineaFacturaTicketBai[];
  desgloseIva: DesgloseIvaTicketBai[];
  encadenamientoAnterior: EncadenamientoAnterior | null;
  software: SoftwareTicketBai;
  numSerieDispositivo?: string;
}

export interface FacturaFirmada {
  xmlFirmado: string;
  signatureValue: string;
}

export type EstadoFacturaTicketBai = "BORRADOR" | "FIRMADA" | "ENVIADA" | "ERROR" | "ANULADA";
