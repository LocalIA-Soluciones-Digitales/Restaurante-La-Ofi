import { describe, expect, it, vi } from "vitest";
import { crc8 } from "@/lib/ticketbai/crc8";
import { construirIdentificativoTbai } from "@/lib/ticketbai/identificador";
import { construirUrlQrTbai } from "@/lib/ticketbai/qr";

vi.mock("server-only", () => ({}));

// Ejemplo numérico del propio documento "Especificaciones funcionales y técnicas del
// sistema TicketBAI 1.2" (verificado en Palomita-Bar, src/lib/ticketbai/README.md).
describe("TicketBAI (ejemplos oficiales)", () => {
  it("CRC-8 del identificativo de ejemplo: 237", () => {
    expect(crc8("TBAI-00000006Y-251019-btFpwP8dcLGAF-")).toBe("237");
  });

  it("construye el identificativo de 39 caracteres", () => {
    const id = construirIdentificativoTbai({
      nifEmisor: "00000006Y",
      fechaExpedicion: new Date(2019, 9, 25),
      signatureValue: "btFpwP8dcLGAFxxxxxxxxxxxxxxxx",
    });
    expect(id).toBe("TBAI-00000006Y-251019-btFpwP8dcLGAF-237");
    expect(id).toHaveLength(39);
  });

  it("la URL del QR de Bizkaia termina con el CRC de todo lo anterior", () => {
    const url = construirUrlQrTbai({ identificativoTbai: "TBAI-00000006Y-251019-btFpwP8dcLGAF-237", serieFactura: "T", numFactura: "27174", importeTotalFacturaCentimos: 425 });
    expect(url.startsWith("https://batuz.eus/QRTBAI/?id=TBAI-00000006Y-251019-btFpwP8dcLGAF-237&s=T&nf=27174&i=4.25&cr=")).toBe(true);
    const [sinCrc, cr] = url.split("&cr=");
    expect(cr).toBe(crc8(sinCrc!));
  });

  it("el desglose de IVA cuadra base + cuota con el total de cada tipo", async () => {
    const { desgloseTbai } = await import("@/lib/ticketbai/index");
    expect(
      desgloseTbai([
        { descripcion: "a", cantidad: 1, importe_unitario_centimos: 1100, importe_total_centimos: 1100, tipo_impositivo: 10 },
        { descripcion: "b", cantidad: 1, importe_unitario_centimos: 363, importe_total_centimos: 363, tipo_impositivo: 21 },
      ]),
    ).toEqual([
      { tipoImpositivo: 10, baseImponibleCentimos: 1000, cuotaCentimos: 100 },
      { tipoImpositivo: 21, baseImponibleCentimos: 300, cuotaCentimos: 63 },
    ]);
  });
});
