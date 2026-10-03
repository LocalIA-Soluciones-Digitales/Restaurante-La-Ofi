import type { StaticImageData } from "next/image";
import type { ImageKey, SiteImage } from "@/lib/images";
import barraGente from "../../public/images/plantilla/barra-pintxos-gente.webp";
import barraGenteM from "../../public/images/plantilla/barra-pintxos-gente-m.webp";
import brindis from "../../public/images/plantilla/brindis.webp";
import brindisM from "../../public/images/plantilla/brindis-m.webp";
import burrata from "../../public/images/plantilla/burrata.webp";
import burrataM from "../../public/images/plantilla/burrata-m.webp";
import cafeCruasan from "../../public/images/plantilla/cafe-cruasan.webp";
import cafeCruasanM from "../../public/images/plantilla/cafe-cruasan-m.webp";
import cafeLatte from "../../public/images/plantilla/cafe-latte.webp";
import cafeLatteM from "../../public/images/plantilla/cafe-latte-m.webp";
import comedor from "../../public/images/plantilla/comedor.webp";
import comedorM from "../../public/images/plantilla/comedor-m.webp";
import huevos from "../../public/images/plantilla/huevos-revueltos.webp";
import huevosM from "../../public/images/plantilla/huevos-revueltos-m.webp";
import parrillaCarne from "../../public/images/plantilla/parrilla-carne.webp";
import parrillaCarneM from "../../public/images/plantilla/parrilla-carne-m.webp";
import parrillaPescado from "../../public/images/plantilla/parrilla-pescado.webp";
import parrillaPescadoM from "../../public/images/plantilla/parrilla-pescado-m.webp";
import pintxos from "../../public/images/plantilla/pintxos-barra.webp";
import pintxosM from "../../public/images/plantilla/pintxos-barra-m.webp";
import pulpo from "../../public/images/plantilla/pulpo.webp";
import pulpoM from "../../public/images/plantilla/pulpo-m.webp";
import tablaTostadas from "../../public/images/plantilla/tabla-tostadas.webp";
import tablaTostadasM from "../../public/images/plantilla/tabla-tostadas-m.webp";
import terrazaCena from "../../public/images/plantilla/terraza-cena.webp";
import terrazaCenaM from "../../public/images/plantilla/terraza-cena-m.webp";
import terrazaNoche from "../../public/images/plantilla/terraza-noche.webp";
import terrazaNocheM from "../../public/images/plantilla/terraza-noche-m.webp";
import tostadasAguacate from "../../public/images/plantilla/tostadas-aguacate.webp";
import tostadasAguacateM from "../../public/images/plantilla/tostadas-aguacate-m.webp";

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
  tostadaBurrata: stock(burrata, "Burrata sobre tomate con albahaca y pan tostado", "Marie Dehayes"),
  tostadaBonita: stock(tostadasAguacate, "Tostadas de pan con aguacate laminado y tomate cherry", "Anna Pelzer"),
  tostadaRevuelta: stock(huevos, "Huevos revueltos junto a una tostada de pan", "Imad 786"),
  pulpoBrasa: stock(pulpo, "Plato de pulpo con verduras", "Andrea Huls Pareja"),
  comedorRatan: stock(comedor, "Comedor de restaurante con vigas de madera y guirnaldas de luces", "Raymond Yeung"),
  salonNoche: stock(brindis, "Brindis con copas de vino blanco en una comida", "Matthieu Joannon"),
  barra: stock(barraGente, "Barra llena de pintxos con gente pidiendo", "Paul"),
  terrazaNoche: stock(terrazaNoche, "Terraza de restaurante con guirnaldas de luces al anochecer", "Nikita"),
  terrazaCarpa: stock(terrazaCena, "Gente cenando en una terraza bajo guirnaldas de luces", "Miguel Domínguez"),
  rotuloNeon: stock(cafeCruasan, "Café con leche y cruasán sobre una mesa de madera", "Yuliia Huzenko"),
  cartaTostadas: stock(tablaTostadas, "Tabla con tostadas variadas", "Ella Olsson"),
  pintxosBarra: stock(pintxos, "Barra con pintxos variados", "Paul"),
  brasaParrilla: stock(parrillaPescado, "Pescados enteros en la parrilla sobre las brasas", "Clint Bustrillos"),
  brasaCarne: stock(parrillaCarne, "Carne en la parrilla con llamas", "Philipp Kämmerer"),
  cafeLatte: stock(cafeLatte, "Leche vertida en un café", "Lauren Gray"),
};

export const PLANTILLA_CROPS: Partial<Record<ImageKey, StaticImageData>> = {
  tostadaBurrata: burrataM,
  tostadaBonita: tostadasAguacateM,
  tostadaRevuelta: huevosM,
  pulpoBrasa: pulpoM,
  comedorRatan: comedorM,
  salonNoche: brindisM,
  barra: barraGenteM,
  terrazaNoche: terrazaNocheM,
  terrazaCarpa: terrazaCenaM,
  rotuloNeon: cafeCruasanM,
  cartaTostadas: tablaTostadasM,
  pintxosBarra: pintxosM,
  brasaParrilla: parrillaPescadoM,
  brasaCarne: parrillaCarneM,
  cafeLatte: cafeLatteM,
};

export const PLANTILLA_FOCUS: Partial<Record<ImageKey, string>> = {
  tostadaBurrata: "50% 72%",
  tostadaBonita: "50% 50%",
  tostadaRevuelta: "50% 45%",
  pulpoBrasa: "45% 50%",
  comedorRatan: "50% 50%",
  salonNoche: "50% 50%",
  barra: "50% 50%",
  terrazaNoche: "45% 50%",
  terrazaCarpa: "50% 50%",
  rotuloNeon: "50% 50%",
  cartaTostadas: "45% 50%",
  pintxosBarra: "40% 50%",
  brasaParrilla: "50% 50%",
  brasaCarne: "55% 50%",
  cafeLatte: "50% 50%",
};
