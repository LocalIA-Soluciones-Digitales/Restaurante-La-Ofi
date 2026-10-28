/**
 * Cargador de next/image sin el optimizador de Vercel (agotó la cuota): las fotos
 * del build tienen copias a cada ancho que crea scripts/variantes-imagenes.mjs
 * («foto.HASH.w828.webp»). Lo demás (Supabase, /public, desarrollo) va tal cual.
 */
export default function cargadorImagen({ src, width }: { src: string; width: number; quality?: number }) {
  if (process.env.NODE_ENV !== "production" || !src.startsWith("/_next/static/media/")) return src;
  return src.replace(/\.(webp|jpe?g|png|avif)$/i, `.w${width}.webp`);
}
