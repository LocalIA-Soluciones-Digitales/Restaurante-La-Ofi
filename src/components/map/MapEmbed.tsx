"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Mapa sin cookies por defecto: imagen estática (OpenStreetMap). El mapa
 * interactivo de Google solo se carga si la persona lo pide expresamente,
 * porque Google puede instalar cookies de terceros (ver /cookies).
 */
export function MapEmbed({ image, alt, embedUrl, credit }: { image: StaticImageData; alt: string; embedUrl: string; credit: string }) {
  const [interactive, setInteractive] = useState(false);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-arena ring-1 ring-tinta-line sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[32rem]">
      {interactive ? (
        <iframe
          src={embedUrl}
          title="Mapa interactivo de Google Maps con la ubicación de La Ofi"
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <>
          <Image src={image} alt={alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 sm:inset-x-4 sm:bottom-4">
            <button type="button" onClick={() => setInteractive(true)} className="btn-secondary min-h-11 bg-crema px-4 text-sm">
              <Icon name="pin" className="h-4 w-4" />
              Cargar mapa interactivo
            </button>
            <span className="rounded-sm bg-crema/90 px-2 py-1 text-[0.65rem] text-carbon-muted">{credit}</span>
          </div>
        </>
      )}
      {!interactive ? (
        <p className="sr-only">Al cargar el mapa interactivo, Google puede instalar cookies propias.</p>
      ) : null}
    </div>
  );
}
