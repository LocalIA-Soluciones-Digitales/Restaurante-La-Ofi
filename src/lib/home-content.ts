import type { StaticImageData } from "next/image";
import type { IconName } from "@/components/ui/Icon";
import { IMAGES, type ImageKey } from "@/lib/images";
import type { VideoAsset } from "@/lib/media";
import { VIDEOS } from "@/lib/media";
import type { Fuente } from "@/lib/restaurant/types";

// Contenido editorial de la home y de /espacios y /empresas. SOLO datos
// publicados por fuentes identificadas (RESEARCH.md §5): cada bloque lleva su
// `fuente` y se marca en pantalla con SourceBadge. Nada de precios, aforos o
// servicios inventados: lo no confirmado se formula como pregunta ("pregúntanos").

const img = (key: ImageKey) => ({ src: IMAGES[key].src, alt: IMAGES[key].alt, credit: IMAGES[key].credit, kind: IMAGES[key].kind });

/** Marquesina de confianza: solo datos verificados (RESEARCH.md §5–7). */
export const CONFIANZA: { icon: IconName; texto: string }[] = [
  { icon: "star", texto: "4,4 en Google" },
  { icon: "car", texto: "Parking para 220 coches" },
  { icon: "sunset", texto: "Terraza cubierta" },
  { icon: "accessible", texto: "Local accesible" },
  { icon: "coffee", texto: "Abrimos a las 7:30 entre semana" },
  { icon: "flame", texto: "Cocina a la brasa" },
  { icon: "leaf", texto: "Producto de temporada de baserris cercanos" },
];

export interface Especialidad {
  id: string;
  nombre: string;
  texto: string;
  imagen: ReturnType<typeof img> | null;
  icon: IconName;
  /** Clip corto real del plato (4–6 s) para el hover. null hasta grabarlo. */
  video: VideoAsset | null;
  fuente: Fuente;
  /** Ancla de la carta donde está el plato. */
  carta: string;
}

/** Especialidades citadas por Deia (13/09/2025). Sin precios: según mercado/carta. */
export const ESPECIALIDADES: Especialidad[] = [
  {
    id: "pulpo",
    nombre: "Pulpo a la brasa",
    texto: "Uno de los clásicos de la parrilla de La Ofi.",
    imagen: img("pulpoBrasa"),
    icon: "flame",
    video: null,
    fuente: "prensa",
    carta: "#para-picotear",
  },
  {
    id: "puerros",
    nombre: "Puerros a la parrilla",
    texto: "Sobre una salsa de hongos. Verdura de temporada pasada por la brasa.",
    imagen: null,
    icon: "leaf",
    video: null,
    fuente: "prensa",
    carta: "#para-picotear",
  },
  {
    id: "carrilleras",
    nombre: "Carrilleras al Pedro Ximénez",
    texto: "Guiso casero de los de cuchara y pan.",
    imagen: null,
    icon: "utensils",
    video: null,
    fuente: "prensa",
    carta: "#brasa",
  },
  {
    id: "morcilla",
    nombre: "Morcilla de puerro de Zamudio",
    texto: "Producto del pueblo de al lado, a la brasa.",
    imagen: null,
    icon: "flame",
    video: null,
    fuente: "prensa",
    carta: "#para-picotear",
  },
  {
    id: "pescado",
    nombre: "Pescado del día a la parrilla",
    texto: "Según mercado: lenguado, rodaballo, lubina, bonito, chicharro… Salvaje bajo reserva.",
    imagen: null,
    icon: "flame",
    video: null,
    fuente: "prensa",
    carta: "#brasa",
  },
];

export interface Espacio {
  id: string;
  nombre: string;
  texto: string;
  /** Aforo publicado (null = sin dato). */
  aforo: string | null;
  imagen: ReturnType<typeof img> | null;
  video: VideoAsset | null;
  icon: IconName;
  cta: "reservar" | "presupuesto" | "pedir";
  fuente: Fuente;
}

/** Los cuatro espacios del local según Deia (09/2025) y la AVDG (03/2025). */
export const ESPACIOS: Espacio[] = [
  {
    id: "barra",
    nombre: "La barra",
    texto: "Café, tostadas de masa madre y pintxos desde el desayuno. El punto de encuentro de las empresas del Parque.",
    aforo: null,
    imagen: img("barra"),
    video: VIDEOS.barra,
    icon: "coffee",
    cta: "pedir",
    fuente: "prensa",
  },
  {
    id: "comedor",
    nombre: "El comedor",
    texto: "Lámparas de ratán, baldosa hexagonal y el plato del día de lunes a viernes.",
    aforo: "70 comensales",
    imagen: img("comedorRatan"),
    video: VIDEOS.comedor,
    icon: "utensils",
    cta: "reservar",
    fuente: "prensa",
  },
  {
    id: "despacho",
    nombre: "El Despacho",
    texto: "Comedor privado para comer de carta o reunirse con tu equipo, con reserva previa.",
    aforo: null,
    // El comedor privado es la sala de las bombillas colgadas de cuerdas (seed del salón).
    imagen: img("salonNoche"),
    video: VIDEOS.heroNoche,
    icon: "briefcase",
    cta: "presupuesto",
    fuente: "prensa",
  },
  {
    id: "terraza",
    nombre: "La terraza cubierta",
    texto: "Carpa tensada, césped y sofás. De día, sombra; de noche, luces y tardeo.",
    aforo: "220 personas sentadas",
    imagen: img("terrazaNoche"),
    video: VIDEOS.terraza,
    icon: "sunset",
    cta: "reservar",
    fuente: "prensa",
  },
];

export const VINOS = {
  referencias: 98,
  texto: "Tintos de distintas denominaciones de origen, alguno chileno y argentino, y txakoli Magalarte para el aperitivo.",
  fuente: "prensa" as Fuente,
};

export interface ServicioEmpresa {
  icon: IconName;
  titulo: string;
  texto: string;
}

/** Empresas del Parque. Lo marcado "pregúntanos" está pendiente de confirmar (CONTENT_NEEDED.md). */
export const EMPRESAS: ServicioEmpresa[] = [
  {
    icon: "briefcase",
    titulo: "Reuniones en El Despacho",
    texto: "Comedor privado para comidas de trabajo con reserva previa, sin salir del Parque.",
  },
  {
    icon: "users",
    titulo: "Pedidos de grupo para recoger",
    texto: "Comparte un enlace con tu equipo: cada uno elige lo suyo, recogéis a la hora que digáis.",
  },
  {
    icon: "receipt",
    titulo: "Factura a nombre de tu empresa",
    texto: "Pide la factura completa con los datos fiscales de tu empresa al pagar.",
  },
  {
    icon: "coffee",
    titulo: "Desayunos para reuniones",
    texto: "¿Café y tostadas para una formación o una visita? Pregúntanos qué podemos preparar.",
  },
];

export type ImagenEditorial = { src: StaticImageData; alt: string; credit: string };

// --- Hero: "un día en La Ofi" -------------------------------------------------
// Cada momento cambia solo la foto y una línea de contexto: la identidad (titular,
// colores, botones) es la misma todo el día. Todo lo que se afirma es verificable:
// tostadas 9:00–11:30 (carta publicada), plato del día L–V (Deia), viernes hasta
// medianoche (horario publicado).

export interface MomentoHero {
  franja: "manana" | "mediodia" | "noche";
  label: string;
  /** Detalle corto del momento en el selector del hero (solo datos publicados). */
  sub: string;
  /** Línea de contexto bajo el titular. */
  nota: string;
  principal: ImageKey;
  /** Foto secundaria (espacio) que acompaña al plato. */
  detalle: ImageKey;
  /** Pie de la foto principal. */
  pie: string;
  /** Vídeo del momento (aparece sobre la foto cuando arranca). */
  video: VideoAsset | null;
}

export const MOMENTOS_HERO: MomentoHero[] = [
  {
    franja: "manana",
    label: "Mañana",
    sub: "Desde las 7:30",
    nota: "Café desde las 7:30 y tostadas de pan de masa madre de 9:00 a 11:30.",
    principal: "tostadaBurrata",
    detalle: "rotuloNeon",
    pie: "Tostada de burrata, melocotón a la plancha y jamón ibérico",
    video: VIDEOS.heroManana,
  },
  {
    franja: "mediodia",
    label: "Mediodía",
    sub: "Plato del día y brasa",
    nota: "Plato del día de lunes a viernes y cocina a la brasa.",
    principal: "pulpoBrasa",
    detalle: "comedorRatan",
    pie: "Pulpo a la parrilla con patata y pimentón",
    video: VIDEOS.heroMediodia,
  },
  {
    franja: "noche",
    label: "Tarde",
    sub: "Viernes hasta las 00:00",
    nota: "Terraza cubierta, tardeos y, los viernes, abierto hasta medianoche.",
    principal: "salonNoche",
    detalle: "terrazaNoche",
    pie: "El salón de La Ofi, de noche",
    video: VIDEOS.heroNoche,
  },
];
