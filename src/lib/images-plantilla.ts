import type { StaticImageData } from "next/image";
import type { ImageKey, SiteImage } from "@/lib/images";
import cafeLatte from "../../public/images/plantilla/cafe-latte.webp";
import cafeLatteM from "../../public/images/plantilla/cafe-latte-m.webp";
import huevos from "../../public/images/plantilla/huevos-revueltos.webp";
import huevosM from "../../public/images/plantilla/huevos-revueltos-m.webp";
import parrillaCarne from "../../public/images/plantilla/parrilla-carne.webp";
import parrillaCarneM from "../../public/images/plantilla/parrilla-carne-m.webp";
import parrillaPescado from "../../public/images/plantilla/parrilla-pescado.webp";
import parrillaPescadoM from "../../public/images/plantilla/parrilla-pescado-m.webp";
import pintxos from "../../public/images/plantilla/pintxos-barra.webp";
import pintxosM from "../../public/images/plantilla/pintxos-barra-m.webp";
import tablaTostadas from "../../public/images/plantilla/tabla-tostadas.webp";
import tablaTostadasM from "../../public/images/plantilla/tabla-tostadas-m.webp";
import terrazaCena from "../../public/images/plantilla/terraza-cena.webp";
import terrazaCenaM from "../../public/images/plantilla/terraza-cena-m.webp";

// FOTOS DE PLANTILLA (Unsplash, licencia Unsplash: uso comercial libre). NO son de
// La Ofi: sustituyen a las fotos reales de baja calidad hasta que el restaurante
// entregue fotos profesionales. Se marcan "Imagen ilustrativa" en los pies de foto
// y se apagan con NEXT_PUBLIC_FOTOS_PLANTILLA=false. Ids y autores en
// IMAGES_SOURCES.md; se regeneran con scripts/fotos-plantilla.py.
// Cada una sustituye a una clave con el mismo papel (plato del mismo tipo, mismo
// espacio o mismo momento); las alt describen la foto tal como es.

const stock = (src: StaticImageData, alt: string, autor: string): SiteImage => ({
  src,
  alt,
  kind: "ilustrativa",
  credit: `${autor} · Unsplash`,
});

export const PLANTILLA: Partial<Record<ImageKey, SiteImage>> = {
  tostadaRevuelta: stock(huevos, "Huevos revueltos junto a una tostada de pan", "Imad 786"),
  terrazaCarpa: stock(terrazaCena, "Gente cenando en una terraza bajo guirnaldas de luces", "Miguel Domínguez"),
  cartaTostadas: stock(tablaTostadas, "Tabla con tostadas variadas", "Ella Olsson"),
  pintxosBarra: stock(pintxos, "Barra con pintxos variados", "Paul"),
  brasaParrilla: stock(parrillaPescado, "Pescados enteros en la parrilla sobre las brasas", "Clint Bustrillos"),
  brasaCarne: stock(parrillaCarne, "Carne en la parrilla con llamas", "Philipp Kämmerer"),
  cafeLatte: stock(cafeLatte, "Leche vertida en un café", "Lauren Gray"),
};

export const PLANTILLA_CROPS: Partial<Record<ImageKey, StaticImageData>> = {
  tostadaRevuelta: huevosM,
  terrazaCarpa: terrazaCenaM,
  cartaTostadas: tablaTostadasM,
  pintxosBarra: pintxosM,
  brasaParrilla: parrillaPescadoM,
  brasaCarne: parrillaCarneM,
  cafeLatte: cafeLatteM,
};

export const PLANTILLA_FOCUS: Partial<Record<ImageKey, string>> = {
  tostadaRevuelta: "50% 45%",
  terrazaCarpa: "50% 50%",
  cartaTostadas: "45% 50%",
  pintxosBarra: "40% 50%",
  brasaParrilla: "50% 50%",
  brasaCarne: "55% 50%",
  cafeLatte: "50% 50%",
};
