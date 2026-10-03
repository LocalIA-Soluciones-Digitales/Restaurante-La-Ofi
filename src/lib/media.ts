// Registro único de vídeos de la web. Procedencia de cada archivo en
// IMAGES_SOURCES.md. Reglas:
//  - "real": grabado en el local.
//  - "ia": generado con IA (Gemini/Veo) A PARTIR DE UNA FOTO REAL del local o de
//    un plato de La Ofi; la escena es la de la foto, con movimiento.
//  - "ia-ilustrativo": generado con IA sin foto de partida; no es La Ofi (se marca
//    "Imagen ilustrativa").
// Formato: MP4 H.264 + WebM VP9 sin audio y póster WebP del primer fotograma.
// Los de IA salen de Veo a 720p: `hd: false` (sin versión 1080p).
// Se preparan con scripts/videos-web.py.

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

/** Pie obligatorio de un vídeo según su procedencia. */
export function creditoVideo(v: VideoAsset): string | null {
  if (v.kind === "ia") return "Vídeo generado con IA a partir de una foto del local";
  if (v.kind === "ia-ilustrativo") return "Imagen ilustrativa";
  return null;
}

const ia = (nombre: string, label: string, kind: VideoKind = "ia"): VideoAsset => ({
  base: `/videos/ia/${nombre}`,
  kind,
  label,
  hd: false,
});

export const VIDEOS = {
  heroManana: ia("burrata", "Un hilo de aceite cae sobre la tostada de burrata"),
  heroMediodia: ia("pulpo", "Pulpo a la brasa con patatas recién servido"),
  heroNoche: ia("salon", "El salón de La Ofi de noche, con las bombillas encendidas"),
  brasa: ia("parrilla", "Pescado y pimientos asándose sobre las brasas", "ia-ilustrativo"),
  comedor: ia("comedor", "El comedor de La Ofi a mediodía, con las lámparas de ratán"),
  terraza: ia("terraza", "La terraza de La Ofi al anochecer"),
  barra: ia("barra", "La barra de La Ofi con el neón y las cafeteras"),
  // --- Pendientes de grabar en el local (IMAGES_SOURCES.md → "Vídeos a grabar")
  pintxos: null as VideoAsset | null,
  despacho: null as VideoAsset | null,
} as const;

export type Franja = "manana" | "mediodia" | "noche";

/** Franja del día según la hora en Madrid: mañana < 12:00 ≤ mediodía < 17:30 ≤ noche. */
export function franjaDelDia(ahora: Date = new Date()): Franja {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(ahora)
    .split(":")
    .map(Number) as [number, number];
  const minutos = h * 60 + m;
  if (minutos >= 5 * 60 && minutos < 12 * 60) return "manana";
  if (minutos >= 12 * 60 && minutos < 17 * 60 + 30) return "mediodia";
  return "noche";
}
