import type { GalleryImage } from "@/components/gallery/Gallery";
import { IMAGES, type ImageKey } from "@/lib/images";

export type CategoriaGaleria = "platos" | "espacio" | "ambiente";

export const CATEGORIAS_GALERIA: { key: CategoriaGaleria; label: string }[] = [
  { key: "platos", label: "Platos" },
  { key: "espacio", label: "Espacio" },
  { key: "ambiente", label: "Ambiente" },
];

// Orden editorial: se alternan plato y espacio para que la galería respire.
const ORDEN: { key: ImageKey; categoria: CategoriaGaleria }[] = [
  { key: "tostadaBurrata", categoria: "platos" },
  { key: "comedorRatan", categoria: "espacio" },
  { key: "pulpoBrasa", categoria: "platos" },
  { key: "barra", categoria: "espacio" },
  { key: "salonNoche", categoria: "ambiente" },
  { key: "tostadaBonita", categoria: "platos" },
  { key: "rotuloNeon", categoria: "espacio" },
  { key: "tostadaRevuelta", categoria: "platos" },
  { key: "terrazaNoche", categoria: "ambiente" },
  { key: "cartaTostadas", categoria: "platos" },
  { key: "terrazaCarpa", categoria: "ambiente" },
  { key: "tostadaSalmon", categoria: "platos" },
];

export const GALLERY: GalleryImage[] = ORDEN.map(({ key, categoria }) => ({
  src: IMAGES[key].src,
  alt: IMAGES[key].alt,
  credit: IMAGES[key].credit,
  categoria,
}));
