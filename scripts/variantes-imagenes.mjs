// Copias redimensionadas de las fotos del build (.next/static/media), para que el
// móvil no descargue la foto de 2400 px. La optimización de imágenes de Vercel está
// apagada (agotó la cuota, ver next.config.ts) y src/lib/image-loader.ts pide
// «foto.HASH.w828.webp» en vez de la original: este script crea esos archivos.
// Se ejecuta justo después de `next build` (script build de package.json).
// ANCHOS debe coincidir con deviceSizes + imageSizes de next.config.ts.
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ANCHOS = [96, 256, 384, 640, 828, 1080, 1440, 1920, 2560];

const media = path.resolve(import.meta.dirname, "..", ".next", "static", "media");
const fotos = readdirSync(media).filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f) && !/\.w\d+\.webp$/.test(f));

let creadas = 0;
const inicio = Date.now();
await Promise.all(
  fotos.map(async (f) => {
    const origen = path.join(media, f);
    const base = f.replace(/\.(webp|jpe?g|png|avif)$/i, "");
    const { width = 0 } = await sharp(origen).metadata();
    for (const ancho of ANCHOS) {
      const destino = path.join(media, `${base}.w${ancho}.webp`);
      // Nunca se amplía: por encima del ancho original va la original, en WebP.
      await sharp(origen)
        .resize({ width: Math.min(ancho, width), withoutEnlargement: true })
        .webp({ quality: ancho <= 384 ? 70 : 74, effort: 4 })
        .toFile(destino);
      creadas++;
    }
  }),
);
console.log(`variantes-imagenes: ${fotos.length} fotos, ${creadas} copias en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
