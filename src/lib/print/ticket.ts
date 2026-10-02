import { formatCentimos } from "@/lib/format";
import { SITE } from "@/lib/site";

// Tickets térmicos de 80 mm (portado de src/lib/print/ticket.ts de Palomita-Bar):
// comanda por estación (sin precios) y cuenta (factura simplificada con IVA).
// Se imprimen desde el navegador con un iframe oculto; el print-bridge imprime
// las comandas automáticamente en ESC/POS sin navegador.

export interface DatosFiscales {
  razon_social?: string | null;
  nif?: string | null;
}

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const BASE = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; width: 80mm; margin: 0; padding: 8px 6px; color: #000; }
  .c { text-align: center; }
  .neg { font-size: 19px; font-weight: bold; letter-spacing: .5px; }
  .dat { font-size: 12px; line-height: 1.4; margin-top: 2px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  hr.s { border-top: 1px solid #000; }
`;

function cabecera(f?: DatosFiscales): string {
  return `<div class="c"><div class="neg">${esc(f?.razon_social || SITE.name)}</div><div class="dat">
    ${f?.nif ? `NIF: ${esc(f.nif)}<br/>` : ""}${esc(SITE.address.street)}<br/>${esc(SITE.address.postalCode)} ${esc(SITE.address.locality)} (${esc(SITE.address.region)})<br/>Tel. ${esc(SITE.phone.display)}
  </div></div>`;
}

function fechaHora(d = new Date()): string {
  return d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// --- Comanda -------------------------------------------------------------------------

export interface LineaComanda {
  cantidad: number;
  nombre: string;
  modificadores?: string | null;
  notas?: string | null;
}

export interface Comanda {
  destino: "COCINA" | "BARRA";
  numero: number;
  etiqueta: string;
  zona?: string | null;
  pax?: number | null;
  camarero?: string | null;
  recogidaEn?: string | null;
  notas?: string | null;
  lineas: LineaComanda[];
}

export function comandaHTML(c: Comanda): string {
  const filas = c.lineas
    .map(
      (l) => `<div class="it"><span class="q">${l.cantidad}</span><span>${esc(l.nombre)}</span></div>
      ${l.modificadores ? `<div class="n">· ${esc(l.modificadores)}</div>` : ""}${l.notas ? `<div class="n">↳ ${esc(l.notas)}</div>` : ""}`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Comanda ${c.numero}</title><style>${BASE}
    .num { font-size: 34px; font-weight: bold; text-align: center; }
    .et { font-size: 18px; font-weight: bold; text-align: center; }
    .sub { font-size: 13px; text-align: center; }
    .dest { font-size: 24px; font-weight: bold; text-align: center; margin: 8px 0 2px; letter-spacing: 2px; border: 2px solid #000; padding: 3px 0; }
    .it { display: flex; gap: 10px; font-size: 20px; font-weight: bold; margin: 8px 0 2px; }
    .q { min-width: 30px; text-align: center; border: 1.5px solid #000; border-radius: 4px; }
    .n { font-size: 14px; font-style: italic; margin: 0 0 4px 40px; }
    .ng { font-size: 13px; background: #eee; padding: 3px 5px; margin-top: 4px; }
    .pie { margin-top: 12px; font-size: 11px; text-align: center; }
  </style></head><body>
    <div class="dest">${c.destino}</div>
    <div class="num">#${c.numero}</div>
    <div class="et">${esc(c.etiqueta)}</div>
    <div class="sub">${[c.zona, c.pax ? `${c.pax} pax` : null, c.camarero].filter(Boolean).map((x) => esc(String(x))).join(" · ")}</div>
    ${c.recogidaEn ? `<div class="sub"><b>Recoger a las ${esc(c.recogidaEn)}</b></div>` : ""}
    <div class="sub">${fechaHora()}</div>
    ${c.notas ? `<div class="ng">Notas: ${esc(c.notas)}</div>` : ""}
    <hr/>${filas || "<div>Sin líneas</div>"}<hr/>
    <div class="pie">${c.lineas.reduce((n, l) => n + l.cantidad, 0)} producto(s)</div>
  </body></html>`;
}

// --- Cuenta (factura simplificada) ---------------------------------------------------------

export interface LineaCuenta {
  cantidad: number;
  nombre: string;
  precioUnitarioCentimos: number;
  ivaPct: number;
  invitacion?: boolean;
}

export interface Cuenta {
  etiqueta: string;
  camarero?: string | null;
  lineas: LineaCuenta[];
  descuentoCentimos?: number;
  pagadoCentimos?: number;
  fiscal?: DatosFiscales;
  ticketBai?: { identificativo: string; qrDataUrl: string; duplicado: boolean } | null;
}

/** Desglose de IVA: los precios de carta llevan IVA incluido; base = total / (1 + tipo). */
export function desgloseIva(lineas: LineaCuenta[], descuentoCentimos = 0) {
  const bruto = lineas.filter((l) => !l.invitacion).reduce((a, l) => a + l.cantidad * l.precioUnitarioCentimos, 0);
  const factor = bruto > 0 ? (bruto - Math.min(descuentoCentimos, bruto)) / bruto : 1;
  const porTipo = new Map<number, number>();
  for (const l of lineas) {
    if (l.invitacion) continue;
    porTipo.set(l.ivaPct, (porTipo.get(l.ivaPct) ?? 0) + l.cantidad * l.precioUnitarioCentimos * factor);
  }
  return [...porTipo.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tipo, total]) => {
      const base = Math.round(total / (1 + tipo / 100));
      return { tipo, base, cuota: Math.round(total) - base, total: Math.round(total) };
    });
}

export function cuentaHTML(c: Cuenta): string {
  const descuento = c.descuentoCentimos ?? 0;
  const iva = desgloseIva(c.lineas, descuento);
  const total = iva.reduce((a, x) => a + x.total, 0);
  const filas = c.lineas
    .map(
      (l) => `<tr><td>${l.cantidad}</td><td>${esc(l.nombre)}${l.invitacion ? " (invitación)" : ""}</td>
      <td class="r">${l.invitacion ? "0,00 €" : formatCentimos(l.cantidad * l.precioUnitarioCentimos)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Cuenta ${esc(c.etiqueta)}</title><style>${BASE}
    .meta { font-size: 12px; margin-top: 6px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
    td { padding: 2px 0; vertical-align: top; } .r { text-align: right; white-space: nowrap; }
    /* Columna estrecha solo para la cantidad de las líneas: en las tablas de IVA o pagos partía "Base 10%". */
    .lineas td:first-child { width: 12%; }
    .tot { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 6px; padding-top: 6px; border-top: 1.5px solid #000; }
    .p { font-size: 11px; text-align: center; margin-top: 12px; }
    .tbai { margin-top: 12px; text-align: center; } .tbai img { width: 34mm; height: 34mm; } .tbai .id { font-size: 9px; word-break: break-all; }
  </style></head><body>
    ${cabecera(c.fiscal)}<hr class="s"/>
    <div class="meta"><b>${esc(c.etiqueta)}</b><br/>${c.camarero ? `Le atendió: ${esc(c.camarero)}<br/>` : ""}${fechaHora()}<br/>Factura simplificada</div>
    <table class="lineas">${filas}</table><hr/>
    ${descuento > 0 ? `<table><tr><td>Descuento</td><td class="r">-${formatCentimos(descuento)}</td></tr></table>` : ""}
    <table>${iva.map((x) => `<tr><td>Base ${x.tipo}%</td><td class="r">${formatCentimos(x.base)}</td></tr><tr><td>IVA ${x.tipo}%</td><td class="r">${formatCentimos(x.cuota)}</td></tr>`).join("")}</table>
    <div class="tot"><span>TOTAL</span><span>${formatCentimos(total)}</span></div>
    ${c.pagadoCentimos ? `<table><tr><td>Pagado</td><td class="r">${formatCentimos(c.pagadoCentimos)}</td></tr><tr><td>Pendiente</td><td class="r">${formatCentimos(Math.max(0, total - c.pagadoCentimos))}</td></tr></table>` : ""}
    ${c.ticketBai ? `<div class="tbai">${c.ticketBai.duplicado ? "<b>*** DUPLICADO ***</b><br/>" : ""}<div class="id">${esc(c.ticketBai.identificativo)}</div><img src="${c.ticketBai.qrDataUrl}" alt="QR TicketBAI"/></div>` : ""}
    <div class="p">IVA incluido. ¡Gracias por venir a La Ofi!</div>
  </body></html>`;
}

/** Imprime HTML con un iframe oculto ajustando el alto real del rollo (Palomita, corte pegado al contenido). */
export function imprimirHTML(html: string): void {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", top: "-1000px", left: "-1000px", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const w = iframe.contentWindow;
  if (!w) return void iframe.remove();
  w.document.open();
  w.document.write(html);
  w.document.close();
  const altoMm = (w.document.documentElement.scrollHeight * 25.4) / 96 + 4;
  const st = w.document.createElement("style");
  st.textContent = `@page { size: 80mm ${altoMm.toFixed(1)}mm; margin: 0; }`;
  w.document.head.appendChild(st);
  const limpiar = () => iframe.remove();
  w.onafterprint = limpiar;
  window.setTimeout(limpiar, 3000);
  w.focus();
  w.print();
}
