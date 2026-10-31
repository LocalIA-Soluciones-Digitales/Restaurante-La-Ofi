"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

/**
 * El cartel nítido, entero, encima del fondo difuminado. Cuando no llena su caja
 * se ajusta a su medida exacta y flota con sombra y un filo de luz, como un
 * cartel de papel apoyado encima, en vez de cortar en seco contra las bandas.
 * La caja se mide con unidades de contenedor, así sigue bien aunque cambie de tamaño.
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
  const [r, setR] = useState<number | null>(null);

  const estilo: CSSProperties = r
    ? { width: `min(100cqw, ${r} * 100cqh)`, height: `min(100cqh, 100cqw / ${r})` }
    : { width: "100%", height: "100%" };

  return (
    <div className="absolute inset-0 m-auto overflow-hidden rounded-[3px] shadow-[0_28px_50px_-14px_rgb(0_0_0/0.75),0_10px_18px_-8px_rgb(0_0_0/0.5)]" style={estilo}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!img.naturalHeight) return;
          setR(img.naturalWidth / img.naturalHeight);
          onProporcion?.(img.naturalWidth / img.naturalHeight);
        }}
        className="object-contain"
      />
      {/* Filo de luz arriba y canto algo más oscuro abajo: da el grosor del papel. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_1px_0_rgb(255_255_255/0.25),inset_0_-1px_0_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
    </div>
  );
}
