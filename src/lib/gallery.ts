import type { GalleryImage } from "@/components/gallery/Gallery";
import { IMAGES_REALES as IMAGES, type ImageKey } from "@/lib/images";

// «La Ofi, por dentro»: siempre fotos reales, nunca las de plantilla.

export type CategoriaGaleria = "platos" | "espacio" | "ambiente";

export const CATEGORIAS_GALERIA: { key: CategoriaGaleria; label: string }[] = [
  { key: "platos", label: "Platos" },
  { key: "espacio", label: "Espacio" },
  { key: "ambiente", label: "Ambiente" },
];

// Orden editorial: se alternan plato y espacio para que la galería respire.
const ORDEN: { key: ImageKey; categoria: CategoriaGaleria }[] = [
  { key: "comedorRatan", categoria: "espacio" },
  { key: "tostadaBurrata", categoria: "platos" },
  { key: "barra", categoria: "espacio" },
  { key: "pulpoBrasa", categoria: "platos" },
  { key: "comedorPanoramica", categoria: "ambiente" },
  { key: "despacho", categoria: "espacio" },
  { key: "tostadaBonita", categoria: "platos" },
  { key: "terraza", categoria: "espacio" },
  { key: "rotuloAguila", categoria: "ambiente" },
  { key: "tostadaRevuelta", categoria: "platos" },
  { key: "despachoRotulo", categoria: "ambiente" },
  { key: "barraMesasAltas", categoria: "espacio" },
  { key: "cartaTostadas", categoria: "platos" },
  { key: "salonNoche", categoria: "ambiente" },
  { key: "terrazaCarpa", categoria: "espacio" },
  { key: "tostadaSalmon", categoria: "platos" },
  { key: "furgoneta", categoria: "ambiente" },
];

export const GALLERY: GalleryImage[] = ORDEN.map(({ key, categoria }) => ({
  src: IMAGES[key].src,
  alt: IMAGES[key].alt,
  credit: IMAGES[key].credit,
  categoria,
}));
