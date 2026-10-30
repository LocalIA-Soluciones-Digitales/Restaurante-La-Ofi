"use client";

import { useEffect, useState } from "react";
import { CartelEvento } from "@/components/eventos/CartelEvento";

/** Cada cuánto cambia de cartel: lo justo para leer la fecha y la hora. */
export const INTERVALO_CARTELES = 4000;

/**
 * Varios carteles en el mismo hueco (p. ej. uno por cada parte del programa), que
 * se van fundiendo uno tras otro. Se para con el ratón encima o con la pestaña en
 * segundo plano, y no cambia solo si el sistema pide reducir el movimiento.
 */
export function CartelesRotativos({
  imagenes,
  sizes,
  priority = false,
  className = "",
}: {
  imagenes: { src: string; alt: string }[];
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const n = imagenes.length;

  useEffect(() => {
    if (n < 2 || pausa || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActual((i) => (i + 1) % n);
    }, INTERVALO_CARTELES);
    return () => window.clearInterval(id);
  }, [n, pausa, actual]);

  if (n === 0) return null;
  if (n === 1) return <CartelEvento src={imagenes[0]!.src} alt={imagenes[0]!.alt} sizes={sizes} priority={priority} className={className} />;

  return (
    <div
      className={`relative overflow-hidden bg-noche ${className}`}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Carteles (${n})`}
    >
      {imagenes.map((img, i) => (
        <div
          key={img.src}
          aria-hidden={i !== actual}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === actual ? "opacity-100" : "opacity-0"}`}
        >
          <CartelEvento src={img.src} alt={img.alt} sizes={sizes} priority={priority && i === 0} className="h-full w-full" />
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
        {imagenes.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setActual(i)}
            aria-label={`Cartel ${i + 1} de ${n}`}
            aria-current={i === actual}
            className="relative h-1.5 w-1.5 overflow-hidden rounded-full bg-crema/45 aria-[current=true]:w-7 motion-safe:transition-all"
          >
            {i === actual ? (
              // La barrita se llena mientras se ve el cartel (vuelve a empezar al cambiar).
              <span
                key={`${actual}-${pausa}`}
                className={`absolute inset-y-0 left-0 bg-crema ${pausa ? "w-full" : "w-0 motion-safe:animate-[llenar_var(--t)_linear_forwards] motion-reduce:w-full"}`}
                style={{ ["--t" as string]: `${INTERVALO_CARTELES}ms` }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

