import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/env";

/** URL que lleva el QR de una mesa (el middleware la lleva a /es/pedir?mesa=…). */
export function urlMesa(token: string): string {
  return `${SITE_URL}/pedir?mesa=${token}`;
}

/** QR en SVG (vectorial: se imprime nítido en metacrilato o pegatina). Marino sobre transparente. */
export function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#111E33", light: "#0000" } });
}
