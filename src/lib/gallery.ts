import type { GalleryImage } from "@/components/gallery/Gallery";
import { IMAGES, type ImageKey } from "@/lib/images";

const ORDEN: ImageKey[] = [
  "comedorRatan",
  "tostadaBurrata",
  "barra",
  "salonNoche",
  "pulpoBrasa",
  "rotuloNeon",
  "tostadaRevuelta",
  "terrazaNoche",
  "cartaTostadas",
  "terrazaCarpa",
  "tostadaSalmon",
  "tostadaBonita",
];

export const GALLERY: GalleryImage[] = ORDEN.map((key) => ({
  src: IMAGES[key].src,
  alt: IMAGES[key].alt,
  credit: IMAGES[key].credit,
}));
