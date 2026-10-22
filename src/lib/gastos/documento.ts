// Prepara en el navegador el documento de un gasto (foto o PDF) y lo lee con
// el OCR: endereza la foto, la reduce para el OCR y genera una copia JPEG
// ligera (300-500 KB) para guardarla. Los PDF con texto se leen directamente
// (exacto y al instante); los escaneados pasan por el OCR página a página.
// Portado de Arrantza (comprasFoto.ts y comprasPdf.ts).
import type { OcrCaja } from "@/lib/gastos/ocr";
import type { OcrPeticion, OcrRespuesta } from "@/workers/ocrGasto.worker";

const LADO_OCR = 2000;
const LADO_GUARDADO = 1600;
// Un albarán no suele tener más; el resto serían condiciones generales.
const MAX_PAGINAS = 3;
const ANCHO_PAGINA = 1600;

export type EstadoLectura = "preparando" | "cargando-lector" | "leyendo";

export interface DocumentoLeido {
  cajas: OcrCaja[];
  jpeg: Blob;
  ms: number;
  origen: "foto" | "pdf-texto" | "pdf-escaneado";
}

function lienzo(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const aJpeg = (c: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir la imagen"))), "image/jpeg", 0.72));

// 'from-image' respeta la orientación EXIF del móvil.
async function cargarImagen(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error("No se pudo abrir la foto. Prueba con JPG, PNG o PDF.");
    }
  }
}

// Ángulo (en grados) que deja las líneas de texto horizontales: el que hace
// que los bordes de las letras se concentren en menos filas.
function anguloTorcido(fuente: HTMLCanvasElement): number {
  const escala = 600 / Math.max(fuente.width, fuente.height);
  const c = lienzo(fuente.width * escala, fuente.height * escala);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(fuente, 0, 0, c.width, c.height);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height);
  const gris = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gris[i] = data[i * 4]! * 0.299 + data[i * 4 + 1]! * 0.587 + data[i * 4 + 2]! * 0.114;

  const puntos: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (Math.abs(gris[i + 1]! - gris[i - 1]!) + Math.abs(gris[i + w]! - gris[i - w]!) > 60) puntos.push(x - w / 2, y - h / 2);
    }
  }
  if (puntos.length < 200) return 0;

  const diag = Math.ceil(Math.hypot(w, h));
  let mejor = 0;
  let mejorPuntuacion = -1;
  for (let a = -10; a <= 10; a += 0.5) {
    const rad = (a * Math.PI) / 180;
    const [s, co] = [Math.sin(rad), Math.cos(rad)];
    const filas = new Float32Array(diag * 2);
    for (let k = 0; k < puntos.length; k += 2) filas[Math.round(s * puntos[k]! + co * puntos[k + 1]!) + diag]!++;
    let p = 0;
    for (const f of filas) p += f * f;
    if (p > mejorPuntuacion) {
      mejorPuntuacion = p;
      mejor = a;
    }
  }
  return mejor;
}

function colorFondo(c: HTMLCanvasElement): string {
  const ctx = c.getContext("2d")!;
  const muestras = [
    [0, 0],
    [c.width - 4, 0],
    [0, c.height - 4],
    [c.width - 4, c.height - 4],
  ].map(([x, y]) => ctx.getImageData(x!, y!, 4, 4).data);
  const media = [0, 1, 2].map((k) => Math.round(muestras.reduce((t, d) => t + d[k]!, 0) / muestras.length));
  return `rgb(${media.join(",")})`;
}

// Sin subir el contraste ni ampliar el lienzo al girar: en las pruebas de
// Arrantza las dos cosas hacían que el OCR perdiera números.
function enderezar(original: HTMLCanvasElement): HTMLCanvasElement {
  const giro = anguloTorcido(original);
  if (giro === 0) return original;
  const recto = lienzo(original.width, original.height);
  const ctx = recto.getContext("2d")!;
  ctx.fillStyle = colorFondo(original);
  ctx.fillRect(0, 0, recto.width, recto.height);
  ctx.translate(recto.width / 2, recto.height / 2);
  ctx.rotate((giro * Math.PI) / 180);
  ctx.drawImage(original, -original.width / 2, -original.height / 2);
  return recto;
}

function reducir(c: HTMLCanvasElement, lado: number): HTMLCanvasElement {
  const e = Math.min(1, lado / Math.max(c.width, c.height));
  if (e === 1) return c;
  const r = lienzo(c.width * e, c.height * e);
  r.getContext("2d")!.drawImage(c, 0, 0, r.width, r.height);
  return r;
}

// Un único worker por sesión: la primera lectura descarga los modelos
// (~13 MB + 14 MB del motor) y las siguientes van directas (y la caché del
// navegador los guarda para otro día).
let worker: Worker | null = null;
let listo = false;
let siguienteId = 1;

export const lectorCargado = () => listo;

async function ocr(canvas: HTMLCanvasElement): Promise<{ cajas: OcrCaja[]; ms: number }> {
  worker ??= new Worker(new URL("../../workers/ocrGasto.worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  const id = siguienteId++;
  const imagen = await createImageBitmap(canvas);
  return new Promise((resolve, reject) => {
    const alRecibir = (e: MessageEvent<OcrRespuesta>) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", alRecibir);
      if (e.data.tipo === "listo") {
        listo = true;
        resolve({ cajas: e.data.cajas, ms: e.data.ms });
      } else reject(new Error(e.data.mensaje));
    };
    w.addEventListener("message", alRecibir);
    w.addEventListener(
      "error",
      (ev) => {
        worker = null;
        reject(new Error(ev.message || "El lector de documentos falló"));
      },
      { once: true },
    );
    const peticion: OcrPeticion = { id, imagen };
    w.postMessage(peticion, [imagen]);
  });
}

export const esPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

type PaginaPdf = Awaited<ReturnType<Awaited<ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>["promise"]>["getPage"]>>;
type ItemTexto = Awaited<ReturnType<PaginaPdf["getTextContent"]>>["items"][number];

// getTextContent() recorre un ReadableStream con «for await», que Safari en
// iPhone no admite: se lee a mano.
async function textoDePagina(pagina: PaginaPdf): Promise<ItemTexto[]> {
  const lector = pagina.streamTextContent().getReader();
  const items: ItemTexto[] = [];
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    items.push(...(value as { items: ItemTexto[] }).items);
  }
  return items;
}

async function leerPdf(file: File, estado: (e: EstadoLectura) => void): Promise<DocumentoLeido> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/ocr/pdf.worker.min.mjs";
  const carga = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true, useWasm: false });
  const doc = await carga.promise;

  const paginas: HTMLCanvasElement[] = [];
  const cajas: OcrCaja[] = [];
  let desplazamiento = 0;
  try {
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGINAS); n++) {
      const pagina = await doc.getPage(n);
      const escala = ANCHO_PAGINA / pagina.getViewport({ scale: 1 }).width;
      const vista = pagina.getViewport({ scale: escala });
      const c = lienzo(vista.width, vista.height);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      await pagina.render({ canvas: c, canvasContext: ctx, viewport: vista }).promise;
      paginas.push(c);
      for (const item of await textoDePagina(pagina)) {
        if (!("str" in item) || !item.str.trim()) continue;
        const [x, yBase] = vista.convertToViewportPoint(item.transform[4], item.transform[5]);
        const alto = Math.max(Math.hypot(item.transform[2], item.transform[3]), item.height) * escala;
        cajas.push({ text: item.str, x, y: yBase - alto + desplazamiento, width: item.width * escala, height: alto });
      }
      desplazamiento += c.height;
    }
  } finally {
    await carga.destroy();
  }

  // Imagen para guardar: las páginas una debajo de otra.
  const total = lienzo(ANCHO_PAGINA, paginas.reduce((t, p) => t + p.height, 0));
  const ctx = total.getContext("2d")!;
  let y = 0;
  for (const p of paginas) {
    ctx.drawImage(p, 0, y);
    y += p.height;
  }
  const jpeg = await aJpeg(reducir(total, Math.max(LADO_GUARDADO, Math.min(total.height, 1400 * paginas.length))));

  const letras = cajas.reduce((t, c) => t + c.text.replace(/\s/g, "").length, 0);
  if (letras >= 30) return { cajas, jpeg, ms: 0, origen: "pdf-texto" };

  // Escaneado: OCR página a página, con la posición desplazada.
  estado(listo ? "leyendo" : "cargando-lector");
  const leidas: OcrCaja[] = [];
  let ms = 0;
  let dy = 0;
  for (const p of paginas) {
    const r = await ocr(enderezar(p));
    estado("leyendo");
    leidas.push(...r.cajas.map((c) => ({ ...c, y: c.y + dy })));
    ms += r.ms;
    dy += p.height;
  }
  return { cajas: leidas, jpeg, ms, origen: "pdf-escaneado" };
}

export async function leerDocumento(file: File, estado: (e: EstadoLectura) => void = () => {}): Promise<DocumentoLeido> {
  estado("preparando");
  if (esPdf(file)) return leerPdf(file, estado);
  const img = await cargarImagen(file);
  // Las imágenes pequeñas (capturas, fotos reenviadas por WhatsApp) se amplían:
  // con la letra de menos de ~25 px el detector se salta renglones enteros.
  const e = Math.min(2, LADO_OCR / Math.max(img.width, img.height));
  const original = lienzo(img.width * e, img.height * e);
  original.getContext("2d")!.drawImage(img, 0, 0, original.width, original.height);
  img.close();
  const recto = enderezar(original);
  const jpeg = await aJpeg(reducir(recto, LADO_GUARDADO));
  estado(listo ? "leyendo" : "cargando-lector");
  const r = await ocr(recto);
  return { cajas: r.cajas, jpeg, ms: r.ms, origen: "foto" };
}
