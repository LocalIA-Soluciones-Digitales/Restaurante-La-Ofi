"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { CartelesRotativos } from "@/components/eventos/CartelesRotativos";

/** Límites de forma del marco: ni más estrecho que una historia ni más ancho que un apaisado suave. */
const MIN_R = 0.5;
const MAX_R = 1.5;
const CAMBIO = "0.7s cubic-bezier(0.16,1,0.3,1)";

/**
 * Cartel del evento a lo grande, con el marco cortado a su medida: al cargar se
 * mide y el marco toma su proporción exacta (sin bandas a los lados), con el alto
 * limitado para que un cartel muy vertical no se coma la pantalla. Aparece con un
 * pequeño asentado, deja debajo un halo con sus propios colores y, con ratón, se
 * inclina un poco hacia el puntero con un brillo, como un cartel en la mano.
 */
export function CartelPortada({
  imagenes,
  sizes,
  priority = false,
  altoMax = "78svh",
}: {
  imagenes: { src: string; alt: string }[];
  sizes: string;
  priority?: boolean;
  altoMax?: string;
}) {
  const [r, setR] = useState<number | null>(null);
  const marco = useRef<HTMLDivElement>(null);
  const forma = Math.min(MAX_R, Math.max(MIN_R, r ?? 4 / 5));

  function inclinar(e: PointerEvent<HTMLDivElement>) {
    const el = marco.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    const y = (e.clientY - b.top) / b.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }
  function soltar() {
    marco.current?.style.setProperty("--rx", "0deg");
    marco.current?.style.setProperty("--ry", "0deg");
  }

  return (
    // Al turnarse carteles de distinta forma, el marco cambia de medida con suavidad.
    <div className="relative mx-auto [perspective:1200px]" style={{ width: `min(100%, calc(${altoMax} * ${forma}))`, transition: `width ${CAMBIO}` }}>
      {/* Halo: el propio cartel, muy difuminado, como la luz que suelta un cartel impreso. */}
      <Image
        src={imagenes[0]!.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="64px"
        unoptimized={!(imagenes[0]!.src.startsWith("/") || imagenes[0]!.src.includes(".supabase.co/storage/v1/object/public/"))}
        className={`pointer-events-none -z-10 translate-y-8 scale-[0.88] object-cover blur-[60px] saturate-150 transition-opacity duration-1000 ${r ? "opacity-55" : "opacity-0"}`}
      />
      <div
        ref={marco}
        onPointerMove={inclinar}
        onPointerLeave={soltar}
        className="group relative overflow-hidden rounded-3xl ring-1 ring-tinta-line shadow-[0_40px_90px_-40px_rgb(43_39_34/0.6)] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d]"
        style={{ aspectRatio: forma, transition: `transform 0.5s cubic-bezier(0.16,1,0.3,1), aspect-ratio ${CAMBIO}` }}
      >
        <div className={`h-full w-full transition-[opacity,transform,filter] duration-1000 ease-out-expo ${r ? "scale-100 opacity-100 blur-0" : "scale-[1.04] opacity-0 blur-sm"}`}>
          <CartelesRotativos imagenes={imagenes} sizes={sizes} priority={priority} className="h-full w-full" onProporcion={setR} />
        </div>
        {/* Brillo que sigue al puntero (solo se ve con ratón encima). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,30%),rgb(255_255_255/0.28),transparent_45%)] opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-100"
        />
        {!r ? <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-papel-3" /> : null}
      </div>
    </div>
  );
}
