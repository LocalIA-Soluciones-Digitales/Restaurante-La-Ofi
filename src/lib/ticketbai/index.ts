import "server-only";
import QRCode from "qrcode";
import { rpcServicio } from "@/lib/supabase/rpc";
import { getFirmanteTicketBai } from "@/lib/ticketbai/firma";
import { construirIdentificativoTbai } from "@/lib/ticketbai/identificador";
import { construirUrlQrTbai } from "@/lib/ticketbai/qr";
import type { DesgloseIvaTicketBai, LineaFacturaTicketBai } from "@/lib/ticketbai/types";
import { construirXmlFacturaTicketBai } from "@/lib/ticketbai/xml";

// Emisión TicketBAI (portado del scaffold de Palomita §19, sobre laofi). APAGADO
// salvo TICKETBAI_ENABLED=true: si no, no hace nada y el ticket se imprime como
// siempre. Idempotente: reimprimir una cuenta ya facturada devuelve la misma
// factura marcada como DUPLICADO (TicketBAI prohíbe reemitir).

export interface ResultadoTicketBai {
  habilitado: boolean;
  duplicado: boolean;
  identificativo: string | null;
  qrUrl: string | null;
  qrDataUrl: string | null;
  error: string | null;
}

const APAGADO: ResultadoTicketBai = { habilitado: false, duplicado: false, identificativo: null, qrUrl: null, qrDataUrl: null, error: null };

interface Linea {
  descripcion: string;
  cantidad: number;
  importe_unitario_centimos: number;
  importe_total_centimos: number;
  tipo_impositivo: number;
}

interface Factura {
  id: string;
  serie: string;
  numero: number;
  fecha_expedicion: string;
  identificativo_tbai: string | null;
  qr_url: string | null;
  encadenamiento_serie_anterior: string | null;
  encadenamiento_numero_anterior: number | null;
  encadenamiento_fecha_anterior: string | null;
  encadenamiento_firma_anterior: string | null;
}

/** Desglose por tipo de IVA; los importes de la carta llevan IVA incluido. */
export function desgloseTbai(lineas: Linea[]): DesgloseIvaTicketBai[] {
  const g = new Map<number, { base: number; cuota: number }>();
  for (const l of lineas) {
    const tipo = Number(l.tipo_impositivo);
    const base = Math.round(l.importe_total_centimos / (1 + tipo / 100));
    const a = g.get(tipo) ?? { base: 0, cuota: 0 };
    g.set(tipo, { base: a.base + base, cuota: a.cuota + (l.importe_total_centimos - base) });
  }
  return [...g.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tipoImpositivo, v]) => ({ tipoImpositivo, baseImponibleCentimos: v.base, cuotaCentimos: v.cuota }));
}

async function conQr(r: Omit<ResultadoTicketBai, "qrDataUrl">): Promise<ResultadoTicketBai> {
  return { ...r, qrDataUrl: r.qrUrl ? await QRCode.toDataURL(r.qrUrl, { errorCorrectionLevel: "M", margin: 1 }) : null };
}

export async function emitirFacturaTicketBai(input: { pedidoIds: string[]; mesaId?: string | null }): Promise<ResultadoTicketBai> {
  if (process.env.TICKETBAI_ENABLED !== "true") return APAGADO;
  const nif = process.env.TICKETBAI_NIF ?? "";
  const razon = process.env.TICKETBAI_RAZON_SOCIAL ?? "";
  const serie = process.env.TICKETBAI_SERIE ?? "WEB";
  if (!nif || !razon) return { ...APAGADO, habilitado: true, error: "Faltan TICKETBAI_NIF / TICKETBAI_RAZON_SOCIAL." };

  const previa = await rpcServicio<Factura | null>("laofi_tbai_buscar", { p_pedido_ids: input.pedidoIds });
  if (previa?.data?.identificativo_tbai) {
    return conQr({ habilitado: true, duplicado: true, identificativo: previa.data.identificativo_tbai, qrUrl: previa.data.qr_url, error: null });
  }

  const lineasR = await rpcServicio<Linea[]>("laofi_tbai_lineas", { p_pedido_ids: input.pedidoIds });
  const lineas = lineasR?.data ?? [];
  if (lineas.length === 0) return { ...APAGADO, habilitado: true, error: "La cuenta no tiene líneas facturables." };
  const total = lineas.reduce((a, l) => a + l.importe_total_centimos, 0);
  const desglose = desgloseTbai(lineas);

  const creada = await rpcServicio<Factura>("laofi_tbai_crear", {
    p: { pedido_ids: input.pedidoIds, mesa_id: input.mesaId ?? null, serie, nif_emisor: nif, razon_social_emisor: razon, importe_total_centimos: total, desglose_iva: desglose, lineas },
  });
  if (!creada?.data) return { ...APAGADO, habilitado: true, error: creada?.error?.message ?? "No se pudo crear la factura." };
  const f = creada.data;
  const fecha = new Date();
  const xml = construirXmlFacturaTicketBai({
    serieFactura: f.serie,
    numFactura: String(f.numero),
    fechaExpedicion: fecha,
    nifEmisor: nif,
    nombreRazonSocialEmisor: razon,
    descripcionFactura: "Consumición hostelería",
    facturaSimplificada: true,
    importeTotalFacturaCentimos: total,
    lineas: lineas.map<LineaFacturaTicketBai>((l) => ({
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      importeUnitarioCentimos: l.importe_unitario_centimos,
      importeTotalCentimos: l.importe_total_centimos,
      tipoImpositivo: Number(l.tipo_impositivo),
    })),
    desgloseIva: desglose,
    encadenamientoAnterior: f.encadenamiento_numero_anterior
      ? {
          serieFactura: f.encadenamiento_serie_anterior ?? f.serie,
          numFactura: String(f.encadenamiento_numero_anterior),
          fechaExpedicion: new Date(`${f.encadenamiento_fecha_anterior}T12:00:00`),
          firma: f.encadenamiento_firma_anterior ?? "",
        }
      : null,
    software: {
      licenciaTbai: process.env.TICKETBAI_LICENCIA ?? "",
      nifEntidadDesarrolladora: process.env.TICKETBAI_ENTIDAD_DESARROLLADORA_NIF ?? "",
      nombre: process.env.TICKETBAI_SOFTWARE_NOMBRE ?? "La Ofi TPV",
      version: process.env.TICKETBAI_SOFTWARE_VERSION ?? "1.0",
    },
  });

  try {
    const firmada = await getFirmanteTicketBai().firmar(xml);
    const identificativo = construirIdentificativoTbai({ nifEmisor: nif, fechaExpedicion: fecha, signatureValue: firmada.signatureValue });
    const qrUrl = construirUrlQrTbai({ identificativoTbai: identificativo, serieFactura: f.serie, numFactura: String(f.numero), importeTotalFacturaCentimos: total });
    await rpcServicio("laofi_tbai_actualizar", {
      p_id: f.id,
      p: { estado: "FIRMADA", identificativo_tbai: identificativo, qr_url: qrUrl, xml_sin_firmar: xml, xml_firmado: firmada.xmlFirmado, signature_value: firmada.signatureValue },
    });
    return conQr({ habilitado: true, duplicado: false, identificativo, qrUrl, error: null });
  } catch (e) {
    const error = (e as Error).message;
    await rpcServicio("laofi_tbai_actualizar", { p_id: f.id, p: { estado: "ERROR", xml_sin_firmar: xml, error_mensaje: error } });
    return { ...APAGADO, habilitado: true, error };
  }
}
