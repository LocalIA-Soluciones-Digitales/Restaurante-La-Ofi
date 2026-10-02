import type { DatosFacturaTicketBai } from "@/lib/ticketbai/types";

/**
 * Generador del fichero TBAI (XML sin firmar), a partir del Anexo 1 de "Especificaciones
 * funcionales y técnicas del sistema TicketBAI 1.2" (documento oficial, descargado y leído
 * directamente de batuz.eus/gipuzkoa.eus para esta implementación).
 *
 * QUÉ ESTÁ VERIFICADO CONTRA EL DOCUMENTO OFICIAL:
 * - La jerarquía de bloques (Cabecera / Sujetos / Factura / Huellas) y qué campos son
 *   obligatorios para una factura simplificada emitida por el propio emisor.
 * - Los nombres literales de campo que el propio documento cita entre comillas o como "tag":
 *   FechaExpedicionFactura, SerieFactura, NumFactura, ImporteTotalFactura, SignatureValue.
 * - El desglose de IVA (BaseImponible / TipoImpositivo / CuotaImpuesto) y el bloque de
 *   encadenamiento (Serie/Num/Fecha/Firma de la factura anterior).
 *
 * QUÉ NO ESTÁ VERIFICADO (el documento oficial da los campos como tabla en prosa, no como
 * XSD literal — el propio .xsd es un fichero descargable aparte que no se ha obtenido para
 * esta implementación):
 * - El nombre exacto y namespace del elemento raíz. Se usa aquí "T:TicketBai" con
 *   xmlns:T="urn:ticketbai:emision", que es el que documentan de forma consistente varias
 *   implementaciones de referencia (p.ej. Barnetik/tbai-php-lib, plugin TicketBAI de
 *   FacturaScripts), pero no ha sido confirmado línea a línea contra el XSD real de Bizkaia.
 * - El nombre exacto de algunos campos intermedios (DetallesFactura/IDDetalleFactura,
 *   Claves/IDClave, TipoDesglose/DesgloseFactura/Sujeta/NoExenta/DetalleNoExenta) y el orden
 *   exacto de los elementos, que el XSD sí exige de forma estricta.
 * - Dónde exactamente engancha el elemento <ds:Signature> de la firma XAdES dentro de este
 *   XML (lo define la "Política de Firma TicketBAI", documento aparte no leído aquí).
 *
 * ANTES DE USAR ESTO EN PRODUCCIÓN: descargar el XSD real de
 * https://www.batuz.eus/es/documentacion-tecnica, validar este XML contra él (p.ej. con un
 * validador XSD), y probarlo contra el entorno de pruebas de Bizkaia. No enviar nunca un
 * fichero generado con este código sin haber pasado antes por ese entorno de pruebas.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatoFecha(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatoHora(fecha: Date): string {
  return fecha.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatoImporte(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

/**
 * ImporteUnitario debe ir SIN IVA (así lo dice literalmente el Anexo 1: "IMPORTE UNITARIO
 * SIN IVA", Decimal(12,8) — más decimales que el resto, precisamente para no perder
 * precisión al quitar el IVA de un precio unitario). El resto de precios de esta app
 * (precio_unitario_centimos, incluido lo que se guarda en laofi.pedido_items) son
 * siempre CON IVA incluido, así que aquí hay que destetarlo explícitamente.
 */
function formatoImporteUnitarioSinIva(importeUnitarioCentimosConIva: number, tipoImpositivo: number): string {
  const neto = importeUnitarioCentimosConIva / 100 / (1 + tipoImpositivo / 100);
  return neto.toFixed(8);
}

function bloqueDetalles(input: DatosFacturaTicketBai): string {
  return input.lineas
    .map(
      (linea) => `
        <T:IDDetalleFactura>
          <T:DescripcionDetalle>${escapeXml(linea.descripcion)}</T:DescripcionDetalle>
          <T:Cantidad>${linea.cantidad.toFixed(2)}</T:Cantidad>
          <T:ImporteUnitario>${formatoImporteUnitarioSinIva(linea.importeUnitarioCentimos, linea.tipoImpositivo)}</T:ImporteUnitario>
          <T:ImporteTotal>${formatoImporte(linea.importeTotalCentimos)}</T:ImporteTotal>
        </T:IDDetalleFactura>`,
    )
    .join("");
}

function bloqueDesgloseIva(input: DatosFacturaTicketBai): string {
  const detalles = input.desgloseIva
    .map(
      (d) => `
              <T:DetalleIVA>
                <T:BaseImponible>${formatoImporte(d.baseImponibleCentimos)}</T:BaseImponible>
                <T:TipoImpositivo>${d.tipoImpositivo.toFixed(2)}</T:TipoImpositivo>
                <T:CuotaImpuesto>${formatoImporte(d.cuotaCentimos)}</T:CuotaImpuesto>
              </T:DetalleIVA>`,
    )
    .join("");

  return `
      <T:TipoDesglose>
        <T:DesgloseFactura>
          <T:Sujeta>
            <T:NoExenta>
              <T:DetalleNoExenta>
                <T:TipoNoExenta>S1</T:TipoNoExenta>
                <T:DesgloseIVA>${detalles}
                </T:DesgloseIVA>
              </T:DetalleNoExenta>
            </T:NoExenta>
          </T:Sujeta>
        </T:DesgloseFactura>
      </T:TipoDesglose>`;
}

function bloqueEncadenamiento(input: DatosFacturaTicketBai): string {
  if (!input.encadenamientoAnterior) {
    // Primera factura de la serie: no hay bloque de encadenamiento. El propio XSD debería
    // marcar este bloque como opcional para este caso (a confirmar contra el XSD real).
    return "";
  }
  const anterior = input.encadenamientoAnterior;
  return `
      <T:EncadenamientoFacturaAnterior>
        <T:SerieFacturaAnterior>${escapeXml(anterior.serieFactura)}</T:SerieFacturaAnterior>
        <T:NumFacturaAnterior>${escapeXml(anterior.numFactura)}</T:NumFacturaAnterior>
        <T:FechaExpedicionFacturaAnterior>${formatoFecha(anterior.fechaExpedicion)}</T:FechaExpedicionFacturaAnterior>
        <T:FirmaFacturaAnterior>${escapeXml(anterior.firma)}</T:FirmaFacturaAnterior>
      </T:EncadenamientoFacturaAnterior>`;
}

/** Genera el fichero TBAI de EMISIÓN sin firmar (Anexo 1). La firma XAdES se aplica aparte. */
export function construirXmlFacturaTicketBai(input: DatosFacturaTicketBai): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<T:TicketBai xmlns:T="urn:ticketbai:emision">
  <T:Cabecera>
    <T:IDVersionTBAI>1.2</T:IDVersionTBAI>
  </T:Cabecera>
  <T:Sujetos>
    <T:Emisor>
      <T:NIF>${escapeXml(input.nifEmisor)}</T:NIF>
      <T:ApellidosNombreRazonSocial>${escapeXml(input.nombreRazonSocialEmisor)}</T:ApellidosNombreRazonSocial>
    </T:Emisor>
  </T:Sujetos>
  <T:Factura>
    <T:CabeceraFactura>
      <T:SerieFactura>${escapeXml(input.serieFactura)}</T:SerieFactura>
      <T:NumFactura>${escapeXml(input.numFactura)}</T:NumFactura>
      <T:FechaExpedicionFactura>${formatoFecha(input.fechaExpedicion)}</T:FechaExpedicionFactura>
      <T:HoraExpedicionFactura>${formatoHora(input.fechaExpedicion)}</T:HoraExpedicionFactura>
      <T:FacturaSimplificada>${input.facturaSimplificada ? "S" : "N"}</T:FacturaSimplificada>
    </T:CabeceraFactura>
    <T:DatosFactura>
      <T:FechaOperacion>${formatoFecha(input.fechaExpedicion)}</T:FechaOperacion>
      <T:DescripcionFactura>${escapeXml(input.descripcionFactura)}</T:DescripcionFactura>
      <T:DetallesFactura>${bloqueDetalles(input)}
      </T:DetallesFactura>
      <T:ImporteTotalFactura>${formatoImporte(input.importeTotalFacturaCentimos)}</T:ImporteTotalFactura>
      <T:Claves>
        <T:IDClave>
          <T:ClaveRegimenIvaOpTrascendencia>01</T:ClaveRegimenIvaOpTrascendencia>
        </T:IDClave>
      </T:Claves>
    </T:DatosFactura>${bloqueDesgloseIva(input)}
  </T:Factura>
  <T:HuellaTBAI>${bloqueEncadenamiento(input)}
    <T:Software>
      <T:LicenciaTBAI>${escapeXml(input.software.licenciaTbai)}</T:LicenciaTBAI>
      <T:EntidadDesarrolladora>
        <T:NIF>${escapeXml(input.software.nifEntidadDesarrolladora)}</T:NIF>
      </T:EntidadDesarrolladora>
      <T:Nombre>${escapeXml(input.software.nombre)}</T:Nombre>
      <T:Version>${escapeXml(input.software.version)}</T:Version>
    </T:Software>${
      input.numSerieDispositivo
        ? `
    <T:Dispositivo>
      <T:NumSerieDispositivo>${escapeXml(input.numSerieDispositivo.slice(-30))}</T:NumSerieDispositivo>
    </T:Dispositivo>`
        : ""
    }
  </T:HuellaTBAI>
</T:TicketBai>`;
}
