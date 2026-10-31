"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";

/** Bordes a fundir: solo los que dejan banda (cartel más estrecho o más ancho que su caja). */
type Bandas = { eje: "x" | "y"; fraccion: number } | null;

const fundido = (dir: string) => `linear-gradient(${dir}, transparent, #000 7%, #000 93%, transparent)`;

/**
 * El cartel nítido, entero, encima del fondo difuminado. Cuando no ocupa toda la
 * caja, sus bordes se funden con el fondo en vez de cortar en seco.
 */
export function CartelImagen({
  src,
  alt,
  sizes,
  priority,
  unoptimized,
  onProporcion,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority: boolean;
  unoptimized: boolean;
  onProporcion?: (r: number) => void;
}) {
  const marco = useRef<HTMLDivElement>(null);
  const [bandas, setBandas] = useState<Bandas>(null);

  const alCargar = (img: HTMLImageElement) => {
    if (!img.naturalHeight) return;
    const r = img.naturalWidth / img.naturalHeight;
    onProporcion?.(r);
    const caja = marco.current?.parentElement;
    if (!caja?.clientHeight) return;
    const c = caja.clientWidth / caja.clientHeight;
    // Margen del 3 %: si casi encaja, mejor sin fundido que con una franja mínima.
    if (r < c * 0.97) setBandas({ eje: "x", fraccion: r / c });
    else if (r > c * 1.03) setBandas({ eje: "y", fraccion: c / r });
    else setBandas(null);
  };

  const mascara = bandas ? fundido(bandas.eje === "x" ? "to right" : "to bottom") : undefined;
  const estilo: CSSProperties = bandas
    ? {
        width: bandas.eje === "x" ? `${bandas.fraccion * 100}%` : "100%",
        height: bandas.eje === "y" ? `${bandas.fraccion * 100}%` : "100%",
        maskImage: mascara,
        WebkitMaskImage: mascara,
      }
    : { width: "100%", height: "100%" };

  return (
    <div ref={marco} className="absolute inset-0 m-auto" style={estilo}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        onLoad={(e) => alCargar(e.currentTarget)}
        className="object-contain"
      />
    </div>
  );
}
