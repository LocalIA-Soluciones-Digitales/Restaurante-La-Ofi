import { IMAGES, type ImageKey } from "@/lib/images";

// Registro único de vídeos de la web. Procedencia de cada archivo en
// IMAGES_SOURCES.md. Reglas (PROMPT_REDISENO §0.2):
//  - "real": grabado en el local. Es lo único que puede mostrar La Ofi, sus
//    platos o su gente. Mientras no exista, el hueco queda a null y la sección
//    usa una foto real (con Ken Burns) en su lugar.
//  - "generado": recurso ambiental abstracto (bruma, brasas, vapor) generado por
//    código. Nunca representa el local ni un plato concreto.
// Formato: MP4 H.264 + WebM VP9 sin audio, 720p (móvil, < 2,5 MB) y 1080p
// (escritorio, < 6 MB), póster WebP del primer fotograma.

export type VideoKind = "real" | "generado";

export interface VideoAsset {
  /** Ruta base sin sufijo: `${base}-720.mp4`, `${base}-1080.webm`, `${base}-poster.webp`. */
  base: string;
  kind: VideoKind;
  /** Descripción para lectores de pantalla (los vídeos decorativos usan ""). */
  label: string;
}

export function videoSources(v: VideoAsset) {
  return {
    poster: `${v.base}-poster.webp`,
    sources: [
      { src: `${v.base}-1080.webm`, type: "video/webm", media: "(min-width: 1024px)" },
      { src: `${v.base}-1080.mp4`, type: "video/mp4", media: "(min-width: 1024px)" },
      { src: `${v.base}-720.webm`, type: "video/webm" },
      { src: `${v.base}-720.mp4`, type: "video/mp4" },
    ],
  };
}

const ambiente = (nombre: string, label: string): VideoAsset => ({
  base: `/videos/ambiente/${nombre}`,
  kind: "generado",
  label,
});

export const VIDEOS = {
  // --- Reales (pendientes de grabar en el local: IMAGES_SOURCES.md → "Vídeos a grabar")
  heroManana: null as VideoAsset | null, //  hero/manana — café y tostada en barra
  heroMediodia: null as VideoAsset | null, // hero/mediodia — comedor lleno, ratán
  heroNoche: null as VideoAsset | null, //    hero/noche — terraza con carpa y neón
  brasa: null as VideoAsset | null, //        brasa/parrilla — video moment
  pintxos: null as VideoAsset | null, //      historia/pintxos
  platoDia: null as VideoAsset | null, //     historia/plato-dia
  despacho: null as VideoAsset | null, //     espacios/despacho
  rotulo: null as VideoAsset | null, //       neon/rotulo

  // --- Generados (ambiente abstracto, nunca "el local")
  ambienteNeon: ambiente("neon-haze", ""),
  ambienteBrasa: ambiente("brasa-ascuas", ""),
  ambienteVapor: ambiente("vapor-manana", ""),
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

export interface HeroEscena {
  franja: Franja;
  eyebrow: string;
  /** Líneas del titular (saltos explícitos: el texto no se recoloca al cargar la fuente). */
  titulo: string[];
  lead: string;
  /** Vídeo real del momento si existe; si no, la foto con Ken Burns. */
  video: VideoAsset | null;
  /** Bruma/vapor generado que se superpone a la foto mientras no haya vídeo real. */
  ambiente: VideoAsset | null;
  imagen: ImageKey;
  noche: boolean;
}

/** "Un día en La Ofi": una escena por franja horaria. */
export const HERO_ESCENAS: Record<Franja, HeroEscena> = {
  manana: {
    franja: "manana",
    eyebrow: "Buenos días desde el Parque",
    titulo: ["El café", "de las 7:30"],
    lead: "Tostadas de pan de masa madre, pintxos recién hechos en la barra y el primer café antes de subir a la oficina.",
    video: VIDEOS.heroManana,
    ambiente: VIDEOS.ambienteVapor,
    imagen: "tostadaRevuelta",
    noche: false,
  },
  mediodia: {
    franja: "mediodia",
    eyebrow: "Mediodía en La Ofi",
    titulo: ["Bajar", "a comer", "sin pensarlo"],
    lead: "Plato del día casero, cocina a la brasa y producto de temporada de los baserris de alrededor.",
    video: VIDEOS.heroMediodia,
    ambiente: null,
    imagen: "comedorRatan",
    noche: false,
  },
  noche: {
    franja: "noche",
    eyebrow: "Tarde y tardeo",
    titulo: ["Punto de", "encuentro", "y buen rollo"],
    lead: "Brasa, terraza cubierta y el neón encendido: la tarde en La Ofi se alarga sola.",
    video: VIDEOS.heroNoche,
    ambiente: VIDEOS.ambienteNeon,
    imagen: "salonNoche",
    noche: true,
  },
};

export function imagenDe(key: ImageKey) {
  return IMAGES[key];
}
