// Copia a public/ocr el motor ONNX (WASM) y el worker de pdf.js que usa el
// lector de gastos, desde node_modules: así van siempre en la versión
// instalada y no se versionan 15 MB de binarios. Los modelos de PaddleOCR
// (public/ocr/*.onnx y el diccionario) sí van en el repositorio.
// Se ejecuta en postinstall, predev y prebuild.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const destino = path.join(raiz, "public", "ocr");
mkdirSync(destino, { recursive: true });

for (const origen of ["onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", "pdfjs-dist/legacy/build/pdf.worker.min.mjs"]) {
  copyFileSync(path.join(raiz, "node_modules", origen), path.join(destino, path.basename(origen)));
}
