import Image, { type StaticImageData } from "next/image";

/**
 * Mapa interactivo de Google cargado directamente. La imagen estática
 * (OpenStreetMap) queda debajo como fondo mientras carga el iframe.
 * Google puede instalar cookies de terceros (ver /cookies).
 */
export function MapEmbed({ image, alt, embedUrl, priority = false }: { image: StaticImageData; alt: string; embedUrl: string; priority?: boolean }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-arena ring-1 ring-tinta-line sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[32rem]">
      <Image src={image} alt={alt} fill priority={priority} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
      <iframe
        src={embedUrl}
        title="Mapa interactivo de Google Maps con la ubicación de La Ofi"
        className="absolute inset-0 h-full w-full border-0"
        loading={priority ? "eager" : "lazy"}
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
