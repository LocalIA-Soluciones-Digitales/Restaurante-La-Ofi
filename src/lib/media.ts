// Registro único de vídeos de la web. Procedencia de cada archivo en
// IMAGES_SOURCES.md. Reglas:
//  - "real": grabado en el local.
//  - "ia": generado con IA (Gemini/Veo) A PARTIR DE UNA FOTO REAL del local o de
//    un plato de La Ofi; la escena es la de la foto, con movimiento.
//  - "ia-ilustrativo": generado con IA sin foto de partida; no es La Ofi (se marca
//    "Imagen ilustrativa").
// Formato: MP4 H.264 + WebM VP9 sin audio y póster WebP del primer fotograma.
// Se preparan con scripts/videos-web.py. Hoy la web no muestra ningún vídeo: los
// generados con IA se retiraron (2026-11-04) a la espera de grabar vídeos reales.

export type VideoKind = "real" | "ia" | "ia-ilustrativo";

export interface VideoAsset {
  /** Ruta base sin sufijo: `${base}-720.mp4`, `${base}-1080.webm`, `${base}-poster.webp`. */
  base: string;
  kind: VideoKind;
  /** Descripción para lectores de pantalla (los vídeos decorativos usan ""). */
  label: string;
  /** false = solo hay versión 720p. */
  hd?: boolean;
}

export function videoSources(v: VideoAsset): { poster: string; sources: { src: string; type: string; media?: string }[] } {
  const sd = [
    { src: `${v.base}-720.webm`, type: "video/webm" },
    { src: `${v.base}-720.mp4`, type: "video/mp4" },
  ];
  return {
    poster: `${v.base}-poster.webp`,
    sources:
      v.hd === false
        ? sd
        : [
            { src: `${v.base}-1080.webm`, type: "video/webm", media: "(min-width: 1024px)" },
            { src: `${v.base}-1080.mp4`, type: "video/mp4", media: "(min-width: 1024px)" },
            ...sd,
          ],
  };
}
