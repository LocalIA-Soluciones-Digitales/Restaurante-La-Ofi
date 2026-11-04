import type { IconName } from "@/components/ui/Icon";
import { IMAGES, type ImageKey } from "@/lib/images";
import type { VideoAsset } from "@/lib/media";
import type { Fuente } from "@/lib/restaurant/types";

// Contenido editorial de la home y de /espacios y /empresas. SOLO datos
// publicados por fuentes identificadas (RESEARCH.md §5): cada bloque lleva su
// `fuente` y se marca en pantalla con SourceBadge. Nada de precios, aforos o
// servicios inventados: lo no confirmado se formula como pregunta ("pregúntanos").

const img = (key: ImageKey) => ({ src: IMAGES[key].src, alt: IMAGES[key].alt, credit: IMAGES[key].credit, kind: IMAGES[key].kind });

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
    video: null,
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
    video: null,
    icon: "utensils",
    cta: "reservar",
    fuente: "prensa",
  },
  {
    id: "despacho",
    nombre: "El Despacho",
    texto: "Comedor privado para comer de carta o reunirse con tu equipo, con reserva previa.",
    aforo: null,
    imagen: img("despacho"),
    video: null,
    icon: "briefcase",
    cta: "presupuesto",
    fuente: "prensa",
  },
  {
    id: "terraza",
    nombre: "La terraza cubierta",
    texto: "Carpa tensada, césped y sofás. De día, sombra; de noche, luces y tardeo.",
    aforo: "220 personas sentadas",
    imagen: img("terraza"),
    video: null,
    icon: "sunset",
    cta: "reservar",
    fuente: "prensa",
  },
];

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
