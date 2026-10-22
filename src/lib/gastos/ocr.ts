// Interpreta lo que el OCR lee de un albarán, factura o ticket de proveedor a
// partir de los trozos de texto y su posición: proveedor (por CIF o por la
// memoria de proveedores), fecha, número, total, desglose de IVA y líneas
// (cantidad × precio = importe). El modelo solo lee letras; todo lo de aquí
// son reglas sencillas, portadas del lector de albaranes de Arrantza
// (src/lib/comprasOcr.ts), que se afinan con documentos reales: cada gasto
// guarda el texto leído y lo que se corrigió (laofi.gastos.ocr_texto y
// ocr_lectura), y los proveedores aprendidos viven en laofi.gastos_proveedores.

export interface OcrCaja {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CategoriaGasto = "comida" | "bebida" | "limpieza" | "suministros" | "alquiler" | "personal" | "servicios" | "mantenimiento" | "impuestos" | "otros";
export type TipoGasto = "albaran" | "factura" | "ticket" | "otro";

export interface LineaLeida {
  texto: string;
  cantidad: number | null;
  precio: number | null;
  importe: number | null;
  // 'ok': cantidad × precio = importe · 'corregida': un número no cuadraba y
  // se ha recalculado con los otros · 'revisar': falta algún número.
  estado: "ok" | "corregida" | "revisar";
}

export interface IvaLeido {
  tipo: number; // 21, 10, 4…
  base: number;
  cuota: number;
}

export interface ProveedorMemoria {
  id: string;
  nombre: string;
  cif: string | null;
  pistas: string[];
  categoria: CategoriaGasto;
}

export interface GastoLeido {
  tipo: TipoGasto;
  proveedor: string | null;
  // Cómo venía escrito (para enseñarle a la memoria cuando se corrige).
  proveedorLeido: string | null;
  proveedorId: string | null;
  cif: string | null;
  fecha: string | null; // YYYY-MM-DD
  numero: string | null;
  categoria: CategoriaGasto | null;
  total: number | null;
  iva: IvaLeido[];
  lineas: LineaLeida[];
  texto: string[];
}

// Misma normalización que laofi.norm_gasto() en la migración de gastos.
export function normalizarGasto(texto: string | null | undefined): string {
  const sinTildes = (texto ?? "").replace(/[ÁÉÍÓÚÜÑáéíóúüñ]/g, (c) => "AEIOUUNaeiouun"["ÁÉÍÓÚÜÑáéíóúüñ".indexOf(c)]!);
  return sinTildes.toLowerCase().replace(/\s+/g, " ").trim();
}

type Caja = OcrCaja & { cy: number };
type Fila = { cy: number; h: number; cajas: Caja[] };

// Trozos a la misma altura = misma fila, ordenados de izquierda a derecha.
function agruparFilas(cajas: Caja[]): Fila[] {
  const filas: Fila[] = [];
  for (const c of [...cajas].sort((a, b) => a.cy - b.cy)) {
    const ultima = filas.at(-1);
    if (ultima && Math.abs(c.cy - ultima.cy) < Math.min(c.height, ultima.h) * 0.55) {
      ultima.cajas.push(c);
      ultima.cy = ultima.cajas.reduce((t, k) => t + k.cy, 0) / ultima.cajas.length;
    } else {
      filas.push({ cy: c.cy, h: c.height, cajas: [c] });
    }
  }
  for (const f of filas) f.cajas.sort((a, b) => a.x - b.x);
  return filas;
}

const textoFila = (f: Fila) => f.cajas.map((c) => c.text).join("  ");

// Número con decimales: 18,4 · 11,600 · -14,50 · 1.520,62 · 31'94 (a mano).
const NUM = String.raw`-?\d{1,6}(?:[.,]\d{3})*[.,'’′]\d{1,3}`;

// Un trozo con nombre y números juntos ("COCA COLA 24 12,40 297,60", típico
// de los PDF con texto y a veces del OCR) se parte: cada número va aparte,
// con su posición estimada por la de sus letras dentro del trozo.
function partir(c: OcrCaja): OcrCaja[] {
  const texto = c.text.trim();
  if (!/[a-zñ]/i.test(texto) || !new RegExp(NUM).test(texto)) return [{ ...c, text: texto }];
  const ancho = c.width / Math.max(1, c.text.length);
  const partes: OcrCaja[] = [];
  let palabras: { t: string; i: number }[] = [];
  const cerrar = () => {
    if (!palabras.length) return;
    const ini = palabras[0]!.i;
    const fin = palabras.at(-1)!.i + palabras.at(-1)!.t.length;
    partes.push({ ...c, text: palabras.map((p) => p.t).join(" "), x: c.x + ini * ancho, width: (fin - ini) * ancho });
    palabras = [];
  };
  for (const m of c.text.matchAll(/\S+/g)) {
    if (new RegExp(`^${NUM}$`).test(m[0])) {
      cerrar();
      partes.push({ ...c, text: m[0], x: c.x + m.index! * ancho, width: m[0].length * ancho });
    } else {
      palabras.push({ t: m[0], i: m.index! });
    }
  }
  cerrar();
  return partes;
}

function preparar(cajas: OcrCaja[]): Caja[] {
  return cajas
    .flatMap(partir)
    .map((c) => ({ ...c, text: c.text.trim(), cy: c.y + c.height / 2 }))
    .filter((c) => c.text);
}

export function agruparLineas(cajas: OcrCaja[]): string[] {
  return agruparFilas(preparar(cajas)).map(textoFila);
}

// El último separador es siempre el decimal (11,600 kg son once kilos y
// seiscientos gramos, no 11.600); los anteriores son de miles (1.520,62).
export function aNumero(s: string): number {
  let t = s.replace(/\s/g, "").replace(/['’′]/g, ",");
  const negativo = t.startsWith("-");
  t = t.replace(/^-/, "");
  const ultimo = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
  if (ultimo >= 0) t = `${t.slice(0, ultimo).replace(/[.,]/g, "")}.${t.slice(ultimo + 1)}`;
  const n = Number(t);
  return negativo ? -n : n;
}

const decimales = (texto: string) => [...texto.matchAll(new RegExp(NUM, "g"))].map((m) => aNumero(m[0]));

// Trozo que solo contiene números (y quizá «€», «%» o el código de IVA).
function esNumerica(texto: string): boolean {
  const t = texto.replace(/\s*(€|eur|%|[a-c])\s*$/i, "").trim();
  return /^(-?\d[\d.,'’′]*\s*)+$/.test(t) && decimales(t).length > 0;
}

const redondear = (n: number, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;
const cuadra = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.002);

// Si cantidad × precio no da el importe, el número mal leído suele ser uno
// solo: se recalcula el precio, que es el que hace cuadrar la línea.
export function cuadrarLinea(texto: string, cantidad: number | null, precio: number | null, importe: number | null): LineaLeida {
  if (cantidad != null && precio != null && importe != null) {
    if (cuadra(cantidad * precio, importe)) return { texto, cantidad, precio, importe, estado: "ok" };
    if (cantidad !== 0) {
      const p = redondear(importe / cantidad, 4);
      if (p > 0.01 && p < 5000) return { texto, cantidad, precio: p, importe, estado: "corregida" };
    }
    return { texto, cantidad, precio, importe, estado: "revisar" };
  }
  if (cantidad != null && importe != null && cantidad !== 0) {
    const p = redondear(importe / cantidad, 4);
    return { texto, cantidad, precio: p, importe, estado: p > 0.01 && p < 5000 ? "corregida" : "revisar" };
  }
  if (cantidad != null && precio != null) return { texto, cantidad, precio, importe: redondear(cantidad * precio), estado: "corregida" };
  return { texto, cantidad, precio, importe, estado: importe != null ? "ok" : "revisar" };
}

/**
 * Números de una fila de producto → línea. Prueba, por este orden:
 * cantidad × precio = importe con los dos primeros y el último («2 6,50 13,00»),
 * con descuento en % entre medias («10 1,20 5,00 11,40») y, si no, los tres últimos.
 */
export function lineaDeNumeros(texto: string, nums: number[]): LineaLeida {
  const importe = nums.at(-1)!;
  if (nums.length >= 3) {
    const [a, b] = nums as [number, number];
    if (cuadra(a * b, importe)) return { texto, cantidad: a, precio: b, importe, estado: "ok" };
    if (nums.length >= 4 && cuadra(a * b * (1 - nums[2]! / 100), importe)) return { texto, cantidad: a, precio: b, importe, estado: "ok" };
    // Algún par cualquiera que cuadre (columnas extra: unidades por caja, IVA…).
    for (let i = 0; i < nums.length - 1; i++)
      for (let j = i + 1; j < nums.length - 1; j++) if (cuadra(nums[i]! * nums[j]!, importe)) return { texto, cantidad: nums[i]!, precio: nums[j]!, importe, estado: "ok" };
    const [c, p] = nums.slice(-3) as [number, number];
    return cuadrarLinea(texto, c, p, importe);
  }
  if (nums.length === 2) {
    if (nums[0] !== 0 && Math.abs(nums[0]!) < 1000) return cuadrarLinea(texto, nums[0]!, null, importe);
  }
  return { texto, cantidad: null, precio: null, importe, estado: "ok" };
}

const CABECERA = /(precio|importe|cantidad|unidades|\buds?\.?\b|\bcant\.?\b|kilos|peso|p\.\s?unit|\bneto\b)/i;
const TITULOS = /(descripci|art[ií]culo|detalle|concepto|\bc[oó]d(igo)?\b|referencia|\bref\.?\b|producto)/i;
const esCabecera = (t: string) => decimales(t).length === 0 && (CABECERA.test(t) || (t.match(new RegExp(TITULOS.source, "gi"))?.length ?? 0) >= 2);
// «IVA» solo como palabra.
const FIN_TABLA = /(\btotal|\bbase\b|base\s*i|subtotal|\bbruto\b|\bsuma\b|\bi\.?\s?v\.?\s?a\b|recargo|observaciones|conforme|l[ií]quido|entregado|cambio\b|efectivo|tarjeta)/i;
const FIN_FUERTE = /(\bbruto\b|base\s*imponible|subtotal|\btotal\b)/i;
const NO_NOMBRE = /(forma de pago|vencimiento|transfer|iban\b|albar[aá]n\s*(n[º°o.]|:)|\balb\.?\s*:|\bpuntos\b|atendido por|le atendi[oó])/i;

// "0041 HARINA TRIGO 25KG L2026091" → sin el código ni el lote.
export function limpiarNombre(texto: string): string {
  const tokens = texto
    .replace(/\s+/g, " ")
    .replace(/^\s*\[\d+\]\s*/, "")
    .replace(/[\s(]+$/, "")
    .trim()
    .split(" ");
  while (tokens.length && /^-?[\d.,'’′]+$/.test(tokens[0]!)) tokens.shift();
  const corte = tokens.findIndex((t) => /^\d{6,}$/.test(t) || (t.length >= 6 && /[a-z]/i.test(t) && /\d{4,}/.test(t)));
  const nombre = corte >= 0 ? tokens.slice(0, corte) : tokens;
  while (nombre.length && (/^[\d.,'’′]+\/?$/.test(nombre.at(-1)!) || /^(uds?|un|kgs?|€|x)$/i.test(nombre.at(-1)!))) nombre.pop();
  return nombre.join(" ").trim();
}

export function leerFecha(l: string): string | null {
  const m = l.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])];
  if (d < 1 || d > 31 || mes < 1 || mes > 12 || a < 2020 || a > 2100) return null;
  return `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// CIF/NIF español: letra + 7 dígitos + control (B95719746), DNI (12345678Z),
// NIE (X1234567L). El OCR confunde a veces O/0 e I/1 en los dígitos.
const CIF_RE = /\b([ABCDEFGHJKLMNPQRSUVW][\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?[0-9A-J]|[XYZ][\s.-]?\d{7}[\s.-]?[A-Z]|\d{8}[\s.-]?[A-Z])\b/g;

export function leerCifs(filas: string[]): string[] {
  const vistos: string[] = [];
  for (const l of filas) {
    for (const m of l.toUpperCase().matchAll(CIF_RE)) {
      const c = m[1]!.replace(/[\s.-]/g, "");
      if (!vistos.includes(c)) vistos.push(c);
    }
  }
  return vistos;
}

const SUFIJO_EMPRESA = /\b(s\.?\s?l\.?\s?u?\.?|s\.?\s?a\.?\s?u?\.?|s\.?\s?coop\.?|s\.?\s?c\.?)(\s|$|,|-)/i;
const EMPRESA_EN_FRASE = /((?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ.&'-]*\s+(?:y\s+|de\s+)?){1,5})(S\.\s?L\.?\s?U?\.?|S\.\s?A\.?\s?U?\.?|SL|SA)(?=[\s.,;]|$)/;

function leerProveedorTexto(filas: string[], esPropio: (t: string) => boolean): string | null {
  const limpiar = (t: string) =>
    t
      .replace(/\s*-?\s*(C\.?I\.?F\.?|N\.?I\.?F\.?)?:?\s*[A-Z]-?\d{7,8}[A-Z0-9]?\s*$/i, "")
      .replace(/[.\s]+$/, (m) => (m.includes(".") ? "." : ""))
      .replace(/\s+/g, " ")
      .trim();
  const ajeno = (t: string) => !esPropio(t);
  const trozos = filas.slice(0, 14).flatMap((l) => l.split(/\s{2,}/));
  const conSufijo = (t: string) => t.trim().split(/\s+/).length <= 7 && SUFIJO_EMPRESA.test(t + " ") && /[a-z]{3,}/i.test(t) && ajeno(t) && !/@/.test(t);
  const cabecera = trozos.find(conSufijo);
  if (cabecera) return limpiar(cabecera);
  for (const l of filas) {
    const m = l.match(EMPRESA_EN_FRASE);
    if (m && ajeno(m[0]) && !/^(De|En|La|El|Los|Las)\s/.test(m[1]!)) return limpiar(m[0]);
  }
  const valido = (t: string) =>
    /[a-z]{3,}/i.test(t) &&
    !/\d{3,}/.test(t) &&
    ajeno(t) &&
    !/cliente|albar[aá]n|factura|ticket|fecha|tel[eé]?f|e-?mail|@|www|\.(com|es|net|org|eus)\b|c\/|calle|avda|pol[ií]gono|bizkaia|vizcaya|bilbao/i.test(t);
  const elegido = trozos.find(valido);
  return elegido ? limpiar(elegido) : null;
}

/** El proveedor de la memoria: por CIF (casi siempre se lee bien) o por sus pistas en la cabecera. */
export function proveedorEnMemoria(filas: string[], cifs: string[], memoria: ProveedorMemoria[]): ProveedorMemoria | null {
  const porCif = memoria.find((p) => p.cif && cifs.includes(p.cif));
  if (porCif) return porCif;
  // También pegado o con algún carácter raro en medio («B 95.719.746»).
  const todo = filas.join(" ").toUpperCase().replace(/[\s.-]/g, "");
  const porCifSuelto = memoria.find((p) => p.cif && todo.includes(p.cif));
  if (porCifSuelto) return porCifSuelto;
  const cabecera = normalizarGasto(filas.slice(0, 14).join(" "));
  const esta = (k: string) => k.length >= 4 && cabecera.includes(k);
  return memoria.find((p) => esta(normalizarGasto(p.nombre)) || p.pistas.some(esta)) ?? null;
}

// Categoría por palabras del proveedor o de las líneas, si la memoria no la sabe.
const CATEGORIAS: [CategoriaGasto, RegExp][] = [
  ["suministros", /iberdrola|endesa|naturgy|repsol|energ[ií]a|electric|\bluz\b|\bgas\b|consorcio de aguas|movistar|telef[oó]nica|vodafone|orange|yoigo|xfera|masmovil|euskaltel|digi\b/],
  ["impuestos", /hacienda|seguridad social|tgss|ayuntamiento|udala|tasa\b|impuesto/],
  ["alquiler", /alquiler|arrendamiento|renta del local/],
  ["personal", /n[oó]mina|uniforme|prevenci[oó]n|mutua/],
  ["servicios", /gestor[ií]a|asesor|abogad|seguros?\b|banco|comisi[oó]n|software|licencia|publicidad|marketing|tpv|sgae|teosa/],
  ["mantenimiento", /reparaci[oó]n|mantenimiento|fontaner|electricista|t[eé]cnico|frigor[ií]fic|maquinaria|ferreter/],
  ["limpieza", /limpieza|detergente|lej[ií]a|friegasuelos|lavavajillas|desengrasante|bayeta|papel|servilleta|bolsas? de basura|celulosa|higiene/],
  ["bebida", /bebida|cervez|vino|bodega|txakoli|sidra|refresco|coca.?cola|pepsi|schweppes|agua mineral|licor|ginebra|\bron\b|whisky|caf[eé]s?\b|mahou|estrella|heineken|damm|keler|san miguel|zumo/],
  ["comida", /carnicer|carnes?\b|pescad|marisco|fruta|verdura|hortaliz|panader|\bpan\b|harina|aceite|queso|l[aá]cteo|leche|huevo|embutido|congelad|makro|alimentaci|mercabilbao|distribuci[oó]n aliment|conserva|patata/],
];

export function adivinarCategoria(texto: string): CategoriaGasto | null {
  const t = normalizarGasto(texto);
  return CATEGORIAS.find(([, re]) => re.test(t))?.[0] ?? null;
}

function leerTipo(filas: string[]): TipoGasto {
  for (const l of filas.slice(0, 25)) {
    if (/factura\s+simplificada|\bticket\b|tique|\bn[º°o]?\s*op\.?\b/i.test(l)) return "ticket";
    const f = l.search(/\bfactura\b/i);
    const a = l.search(/\balbar[aá]n\b/i);
    if (f >= 0 && (a < 0 || f < a)) return "factura";
    if (a >= 0) return "albaran";
  }
  // Ticket de caja: «TOTAL» y «EFECTIVO/TARJETA/CAMBIO» sin cabecera de factura.
  if (filas.some((l) => /\b(cambio|entregado|tarjeta|efectivo)\b/i.test(l))) return "ticket";
  return "factura";
}

// Nº de documento: «A26 / 5055», «M10780», «2026_1_21914», «FV-2026/0012».
const NUM_DOC = String.raw`[A-Z]{1,3}-?\d{2,}(?:-\d{2,})+|[A-Z]{1,4}[-/ ]?\d{2,4}\s?\/\s?\d{2,}|\d{2,4}\s?\/\s?\d{3,}|[A-Z]{1,3}\/[A-Z]{2,4}\/\d{3,}|\d{4}_\d+_\d+|[A-Z]{1,3}\d{0,4}-?\d{3,}|\d{4,}|\d{1,3}(?:\.\d{3})+`;

function leerNumero(filas: string[], tipo: TipoGasto): string | null {
  const palabra = tipo === "albaran" ? String.raw`albar[aá]n` : String.raw`(?:factura(?:\s*simplificada)?|ticket|tique|albar[aá]n)`;
  for (const l of filas) {
    const m =
      l.match(new RegExp(String.raw`${palabra}\b[^\d]{0,25}?(?:\d{1,2}\/\d{1,2}\/\d{2,4}\s+)?(${NUM_DOC}|\d{2,})\b`, "i")) ??
      l.match(new RegExp(String.raw`\bn[º°o.]{1,2}\s*(?:de\s+)?(?:factura|doc(?:umento)?\.?|ticket)?\s*:?\s*(${NUM_DOC})`, "i"));
    if (m?.[1] && !leerFecha(m[1])) return m[1].replace(/\s+/g, " ").trim();
  }
  // El nº debajo de los títulos («NÚMERO  FECHA  CLIENTE» → «21779  15/10/2026  …»).
  for (let i = 0; i + 1 < filas.length; i++) {
    const cab = filas[i]!;
    if (/\d/.test(cab) || !/\bn[uú]mero\b|\bn[º°]\b/i.test(cab) || !/\bfecha\b/i.test(cab)) continue;
    const n = filas[i + 1]!.split(/\s+/).find((t) => /^[A-Z]{0,3}\d{3,}$/.test(t));
    if (n) return n;
  }
  return null;
}

const TIPOS_IVA = [21, 10, 4, 5, 2, 0];

/** Desglose de IVA: filas con un tipo (21 %, 10 %…) y una base y una cuota que cuadran. */
export function leerIva(filas: string[]): IvaLeido[] {
  const r = new Map<number, IvaLeido>();
  for (const l of filas) {
    // Sin el propio tipo («10,00%»), que no es ni base ni cuota.
    const nums = decimales(l.replace(/\d{1,2}(?:[.,]\d{1,2})?\s*%/g, " ")).filter((n) => n > 0);
    // Tipos que aparecen en la fila, con o sin «%» («10,00%», «IVA 21»).
    const tipos = TIPOS_IVA.filter((t) => t > 0 && new RegExp(String.raw`(^|[^\d,.])${t}(?:[.,]0{1,2})?\s*%|iva\s*${t}\b|${t}\s*%`, "i").test(l));
    const candidatos = tipos.length ? tipos : /\bi\.?\s?v\.?\s?a\b/i.test(l) ? TIPOS_IVA.filter((t) => t > 0) : [];
    for (const t of candidatos) {
      if (r.has(t)) continue;
      for (let i = 0; i < nums.length; i++) {
        const base = nums[i]!;
        const cuota = nums.find((c, j) => j !== i && c < base && Math.abs(redondear(base * (t / 100)) - c) <= Math.max(0.02, c * 0.005));
        if (cuota != null) {
          r.set(t, { tipo: t, base, cuota });
          break;
        }
      }
    }
  }
  return [...r.values()].sort((a, b) => b.tipo - a.tipo);
}

export interface OpcionesLectura {
  memoria?: ProveedorMemoria[];
  // Datos del propio restaurante (nombre, razón social, CIF) que salen como
  // «cliente» en la cabecera y no son el proveedor.
  propios?: { nombres: string[]; cif?: string | null };
}

export function leerGasto(ocr: OcrCaja[], opciones: OpcionesLectura = {}): GastoLeido {
  const cajas = preparar(ocr);
  const filas = agruparFilas(cajas);
  const texto = filas.map(textoFila);
  const propiosCif = opciones.propios?.cif?.toUpperCase().replace(/[^A-Z0-9]/g, "") || null;
  const nombresPropios = (opciones.propios?.nombres ?? []).map(normalizarGasto).filter((n) => n.length >= 4);
  const esPropio = (t: string) => nombresPropios.some((n) => normalizarGasto(t).includes(n));
  const cifs = leerCifs(texto).filter((c) => c !== propiosCif);
  const conocido = proveedorEnMemoria(texto, cifs, opciones.memoria ?? []);
  const leido = leerProveedorTexto(texto, esPropio);
  const tipo = leerTipo(texto);

  const r: GastoLeido = {
    tipo,
    proveedor: conocido?.nombre ?? leido,
    proveedorLeido: leido,
    proveedorId: conocido?.id ?? null,
    cif: conocido?.cif ?? cifs[0] ?? null,
    fecha: null,
    numero: leerNumero(texto, tipo),
    categoria: conocido?.categoria ?? null,
    total: null,
    iva: leerIva(texto),
    lineas: [],
    texto,
  };
  for (const l of texto) r.fecha ??= leerFecha(l);

  // 1) Filas de números de producto, por debajo de la cabecera de la tabla.
  const iCab = filas.findIndex((f) => esCabecera(textoFila(f)));
  const yCab = iCab >= 0 ? filas[iCab]!.cy : -Infinity;
  const numericas = cajas.filter((c) => c.cy > yCab && esNumerica(c.text));
  const candidatas = agruparFilas(numericas)
    .map((f) => {
      const nums = f.cajas.flatMap((c) => decimales(c.text.replace(/\s*(€|eur|%|[a-c])\s*$/i, "")).map((n) => ({ n, x: c.x })));
      return { cy: f.cy, h: f.h, nums, filaTexto: textoFila(f) };
    })
    .filter((f) => f.nums.length >= 1 && f.nums.some((x) => x.n !== 0));

  // 2) La tabla acaba en la primera fila de totales tras el primer producto.
  const yPrimera = candidatas[0]?.cy ?? Infinity;
  const filaFin = filas.find((f) => {
    const t = textoFila(f);
    return f.cy > yPrimera - 1 && FIN_TABLA.test(t) && !/suma\s+y\s+sigue/i.test(t) && (!CABECERA.test(t) || FIN_FUERTE.test(t));
  });
  const yFin = filaFin?.cy ?? Infinity;
  const productos = candidatas.filter((f) => f.cy < yFin - 1);

  const primero = productos[0];
  if (primero) {
    // 3) Nombres: lo que hay a la izquierda de la primera columna de números.
    const xs = productos.map((p) => Math.min(...p.nums.map((n) => n.x))).sort((a, b) => a - b);
    const colX = xs[Math.floor(xs.length / 2)]!;
    const paso = productos.length > 1 ? (productos.at(-1)!.cy - primero.cy) / (productos.length - 1) : primero.h * 1.6;
    const desde = Math.max(yCab, primero.cy - paso * 0.9);
    const hasta = Math.min(yFin, productos.at(-1)!.cy + paso * 0.9);
    const nombres = agruparFilas(cajas.filter((c) => c.x + c.width / 2 < colX - 4 && c.cy > desde && c.cy < hasta))
      .map((f) => ({ cy: f.cy, crudo: textoFila(f), nombre: limpiarNombre(textoFila(f)) }))
      .filter(
        (f) =>
          /[a-zñ]{2,}/i.test(f.nombre) &&
          (f.nombre.match(/[a-zñ]/gi)?.length ?? 0) >= 3 &&
          !TITULOS.test(f.crudo) &&
          !FIN_TABLA.test(f.crudo) &&
          !CABECERA.test(f.crudo.replace(/\(.*$/, "")) &&
          !NO_NOMBRE.test(f.crudo),
      );

    // 4) Emparejar: si hay tantos nombres como filas de números, en orden
    // (aguanta el desfase); si no, cada fila con el nombre más cercano.
    const usados = new Set<number>();
    productos.forEach((p, i) => {
      let nombre = "";
      let crudo = "";
      if (nombres.length === productos.length) {
        ({ nombre, crudo } = nombres[i]!);
      } else {
        let mejor = -1;
        for (let k = 0; k < nombres.length; k++) {
          if (usados.has(k) || Math.abs(nombres[k]!.cy - p.cy) > paso * 0.75) continue;
          if (mejor < 0 || Math.abs(nombres[k]!.cy - p.cy) < Math.abs(nombres[mejor]!.cy - p.cy)) mejor = k;
        }
        if (mejor >= 0) {
          usados.add(mejor);
          ({ nombre, crudo } = nombres[mejor]!);
        }
      }
      let n = p.nums.map((x) => x.n);
      // Cantidad entera («6 COCA COLA 12,50 75,00»): sin decimales no entra en
      // las columnas; vale si 6 × 12,50 = 75,00.
      // Solo el importe y una cantidad entera en la fila («2 … 178,00», el
      // precio no se leyó): el precio sale de dividir, para revisar.
      if (n.length === 1) {
        const suelto = cajas.filter((c) => Math.abs(c.cy - p.cy) < p.h * 0.55 && /^\d{1,3}$/.test(c.text)).at(-1);
        if (suelto && Number(suelto.text) > 0) n = [Number(suelto.text), n[0]!];
      } else if (n.length === 2 || (n.length >= 2 && !cuadra(n[0]! * n[1]!, n.at(-1)!))) {
        // En el nombre o en cualquier trozo suelto de la misma fila.
        const fila = cajas.filter((c) => Math.abs(c.cy - p.cy) < p.h * 0.55).map((c) => c.text);
        const enteros = [...`${crudo} ${fila.join(" ")}`.matchAll(/(?:^|\s)(\d{1,4})(?=\s|$)/g)].map((m) => Number(m[1])).filter((k) => k > 0);
        const precio = n.at(-2)!;
        const entero = enteros.find((k) => cuadra(k * precio, n.at(-1)!));
        if (entero) n = [entero, precio, n.at(-1)!];
      }
      const linea = lineaDeNumeros(nombre, n);
      // Una fila de números sin nombre solo cuenta si cuadra.
      if ((nombre && n.length >= 1) || (linea.estado === "ok" && linea.cantidad != null)) r.lineas.push(linea);
    });
  }

  // 5) Total: con IVA desglosado, base + cuotas si ese número aparece; si no,
  // el que acompañe a «total» / «a pagar»; si no, el mayor tras la tabla que
  // quede entre la suma de las líneas y la suma + 21 %.
  const numsTras = filas.filter((f) => f.cy >= (productos.at(-1)?.cy ?? -Infinity)).flatMap((f) => decimales(textoFila(f)));
  const aparece = (s: number) => numsTras.some((n) => Math.abs(n - s) <= 0.02) || texto.some((l) => decimales(l).some((n) => Math.abs(n - s) <= 0.02));
  if (r.iva.length) {
    const conIva = redondear(r.iva.reduce((t, i) => t + i.base + i.cuota, 0));
    if (aparece(conIva)) r.total = conIva;
  }
  if (r.total == null) {
    for (const l of texto) {
      if (/sub\s*total|total\s+(bruto|base|art[ií]culos|uds|unidades)/i.test(l)) continue;
      const m = l.match(new RegExp(String.raw`(total(?:\s+(?:factura|a\s+pagar|eur|€))?|l[ií]quido|a\s+pagar|importe\s+total)[^\d-]{0,30}(${NUM})`, "i"));
      if (m?.[2]) r.total = aNumero(m[2]);
    }
  }
  const suma = sumaLineas(r.lineas);
  if (r.total == null && suma > 0) {
    const posibles = numsTras.filter((n) => n >= suma - 0.05 && n <= suma * 1.22 + 0.05);
    r.total = posibles.length ? Math.max(...posibles) : null;
  }

  r.categoria ??= adivinarCategoria(r.proveedor ?? "") ?? adivinarCategoria(r.lineas.map((l) => l.texto).join(" "));
  return r;
}

export function sumaLineas(lineas: { importe: number | null }[]): number {
  return redondear(lineas.reduce((t, l) => t + (l.importe ?? 0), 0));
}
