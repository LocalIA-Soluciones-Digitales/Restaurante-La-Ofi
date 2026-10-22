// Lee el texto de un albarán, factura o ticket con PaddleOCR (modelo "latin":
// tildes, ñ y €) dentro de un Web Worker, para que la tablet o el móvil no se
// congelen. Todo ocurre en el propio dispositivo: la foto no se manda a ningún
// servicio de OCR. Modelos y motor se sirven desde /ocr/ (public/ocr; el WASM
// y el worker de pdf.js los copia scripts/copiar-ocr.mjs). Portado de Arrantza.
import * as ort from "onnxruntime-web";
import type { PaddleOcrService } from "ppu-paddle-ocr/web";
import type { OcrCaja } from "@/lib/gastos/ocr";

export type OcrPeticion = { id: number; imagen: ImageBitmap };
export type OcrRespuesta = { id: number; tipo: "listo"; cajas: OcrCaja[]; ms: number } | { id: number; tipo: "error"; mensaje: string };

ort.env.wasm.wasmPaths = { wasm: "/ocr/ort-wasm-simd-threaded.wasm" };
// Sin aislamiento entre orígenes el navegador solo permite un hilo.
ort.env.wasm.numThreads = 1;

let servicio: Promise<PaddleOcrService> | null = null;

async function cargarServicio(): Promise<PaddleOcrService> {
  const { PaddleOcrService } = await import("ppu-paddle-ocr/web");
  const s = new PaddleOcrService({
    model: {
      detection: "/ocr/PP-OCRv5_mobile_det_infer.onnx",
      recognition: "/ocr/latin_PP-OCRv5_mobile_rec_infer.onnx",
      charactersDictionary: "/ocr/ppocrv5_latin_dict.txt",
    },
    session: { executionProviders: ["wasm"], graphOptimizationLevel: "all" },
  });
  await s.initialize();
  return s;
}

const responder = (r: OcrRespuesta) => (self as unknown as { postMessage: (m: OcrRespuesta) => void }).postMessage(r);

self.addEventListener("message", async (e: MessageEvent<OcrPeticion>) => {
  const { id, imagen } = e.data;
  try {
    servicio ??= cargarServicio();
    const s = await servicio.catch((err) => {
      servicio = null; // que el siguiente intento vuelva a descargar
      throw err;
    });
    const t0 = performance.now();
    const lienzo = new OffscreenCanvas(imagen.width, imagen.height);
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0);
    imagen.close();
    // Cada trozo por separado: las filas las agrupa src/lib/gastos/ocr.ts con
    // la posición de cada uno, que aguanta mejor una foto algo torcida.
    const res = await s.recognize(lienzo, { flatten: true, strategy: "per-box" });
    const cajas = res.results.map((r) => ({ text: r.text, ...r.box }));
    responder({ id, tipo: "listo", cajas, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    responder({ id, tipo: "error", mensaje: err instanceof Error ? err.message : String(err) });
  }
});
