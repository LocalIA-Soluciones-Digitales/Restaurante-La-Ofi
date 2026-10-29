// Copias redimensionadas de las fotos de platos de public/images/platos (1200 px,
// ~100 KB cada una): en la carta se ven a ~300 px y el móvil descargaba ~3,5 MB al
// recorrer /pedir. Igual que variantes-imagenes.mjs con .next/static/media, pero
// antes de `next build` (prebuild), porque public/ se publica tal cual.
// src/lib/image-loader.ts pide «plato.w384.webp». ANCHOS = deviceSizes + imageSizes
// de next.config.ts hasta 1080: las fotos miden 1200 px y por encima se sirve la
// original (lo mismo que haría sharp sin ampliar). Las copias no van al repositorio.
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const ANCHOS_PLATOS = [96, 256, 384, 640, 828, 1080];
const ANCHOS = ANCHOS_PLATOS;

const carpeta = path.resolve(import.meta.dirname, "..", "public", "images", "platos");
const fotos = readdirSync(carpeta).filter((f) => /\.webp$/i.test(f) && !/\.w\d+\.webp$/.test(f));

let creadas = 0;
const inicio = Date.now();
await Promise.all(
  fotos.map(async (f) => {
    const origen = path.join(carpeta, f);
    const base = f.replace(/\.webp$/i, "");
    const { width = 0 } = await sharp(origen).metadata();
    const cambiada = statSync(origen).mtimeMs;
    for (const ancho of ANCHOS) {
      const destino = path.join(carpeta, `${base}.w${ancho}.webp`);
      if (existsSync(destino) && statSync(destino).mtimeMs >= cambiada) continue;
      // Nunca se amplía: por encima del ancho original va la original, en WebP.
      await sharp(origen)
        .resize({ width: Math.min(ancho, width), withoutEnlargement: true })
        .webp({ quality: ancho <= 384 ? 70 : 76, effort: 4 })
        .toFile(destino);
      creadas++;
    }
  }),
);
console.log(`variantes-platos: ${fotos.length} fotos, ${creadas} copias nuevas en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
