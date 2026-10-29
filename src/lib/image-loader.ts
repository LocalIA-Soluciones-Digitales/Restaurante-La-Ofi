/**
 * Cargador de next/image sin el optimizador de Vercel (agotó la cuota): las fotos
 * del build tienen copias a cada ancho que crea scripts/variantes-imagenes.mjs
 * («foto.HASH.w828.webp») y las de platos de public/images/platos, las de
 * scripts/variantes-platos.mjs (hasta 1080 px; por encima, la original de 1200).
 * Lo demás (Supabase, otras de /public, desarrollo) va tal cual.
 */
export default function cargadorImagen({ src, width }: { src: string; width: number; quality?: number }) {
  if (process.env.NODE_ENV !== "production") return src;
  if (src.startsWith("/_next/static/media/")) return src.replace(/\.(webp|jpe?g|png|avif)$/i, `.w${width}.webp`);
  if (/^\/images\/platos\/[a-z0-9-]+\.webp$/.test(src) && width <= 1080) return src.replace(/\.webp$/, `.w${width}.webp`);
  return src;
}
