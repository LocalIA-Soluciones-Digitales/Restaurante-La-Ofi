"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/media/Photo";
import { href, type Locale } from "@/lib/i18n";
import type { ImageKey } from "@/lib/images";

// Fotos del fotógrafo (2026-10-17). Aforos publicados (Deia 09/2025, AVDG 03/2025).
const PANELES: { id: string; nombre: string; linea: string; img: ImageKey }[] = [
  { id: "barra", nombre: "La barra", linea: "Café desde las 7:30 y pintxos en barra.", img: "barra" },
  { id: "comedor", nombre: "El comedor", linea: "Lámparas de ratán y luz natural. Unos 70 comensales.", img: "comedorRatan" },
  { id: "despacho", nombre: "El Despacho", linea: "Comedor privado para comidas de trabajo.", img: "despacho" },
  { id: "terraza", nombre: "La terraza", linea: "Cubierta, para hasta 220 personas.", img: "terraza" },
];

/**
 * Los cuatro espacios como paneles verticales a toda altura: el señalado (ratón
 * o teclado) se abre y muestra su nombre, una línea y el enlace; los demás se
 * quedan como franjas con el nombre en vertical. En móvil, carrusel con snap.
 */
export function EspaciosPaneles({ locale }: { locale: Locale }) {
  const [activo, setActivo] = useState(1);

  // Sin margen abajo: la banda del menú del día sale de este crema con un fundido.
  return (
    <section aria-labelledby="espacios-title" className="section bg-crema pb-0 pt-0 sm:pb-0 sm:pt-0">
      <div className="container-wide">
        <div className="mx-auto max-w-xl text-center">
          <p className="kicker text-brasa">Los espacios</p>
          <h2 id="espacios-title" className="t-h2 mt-3 text-carbon">
            Cuatro espacios bajo el mismo techo
          </h2>
        </div>
      </div>

      {/* Como Lingers: el nombre enorme y tenue, y los paneles montados sobre su
          parte baja (letras y fotos en una sola pieza). En móvil, de borde a borde
          y con el carrusel tapando el pie, como en escritorio. */}
      <div aria-hidden="true" className="pointer-events-none mt-4 select-none overflow-clip lg:mt-10">
        <p className="title-in whitespace-nowrap text-center font-display text-[25vw] font-light uppercase leading-[0.82] tracking-[0.02em] text-carbon/[0.14] lg:text-[19vw]">
          La Ofi
        </p>
      </div>

      <div className="relative -mt-[7.5vw] px-4 sm:px-6 lg:-mt-[3.5vw] lg:px-0">
        {/* Escritorio: paneles que se abren */}
        <ul className="relative hidden h-[78svh] min-h-[34rem] gap-2 lg:flex">
          {PANELES.map((p, i) => {
            const abierto = activo === i;
            return (
              <li
                key={p.id}
                style={{ flexGrow: abierto ? 4.2 : 1 }}
                className="relative min-w-0 basis-0 overflow-hidden bg-noche transition-[flex-grow] duration-700 ease-out-expo motion-reduce:transition-none"
              >
                <Link
                  href={href(locale, `/espacios#${p.id}`)}
                  onPointerEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  aria-label={`${p.nombre}: ${p.linea}`}
                  className="absolute inset-0 block text-crema"
                >
                  <span className={`absolute inset-0 transition-transform duration-[1.2s] ease-out-expo ${abierto ? "scale-100" : "scale-110"}`}>
                    <Photo img={p.img} sizes="75vw" mobileBelow={0} decorative />
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 bg-gradient-to-t from-noche/85 via-noche/25 to-noche/10 transition-opacity duration-500 ${abierto ? "opacity-100" : "opacity-90"}`}
                  />
                  <span aria-hidden="true" className={`absolute inset-0 bg-noche/35 transition-opacity duration-500 ${abierto ? "opacity-0" : "opacity-100"}`} />

                  <span aria-hidden="true" className="absolute left-6 top-6 text-xs tabular-nums text-crema/80">
                    0{i + 1}
                  </span>

                  {/* Cerrado: el nombre en vertical */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-8 left-1/2 -translate-x-1/2 rotate-180 whitespace-nowrap font-display text-[1.6rem] font-light [writing-mode:vertical-rl] transition-opacity duration-300 ${
                      abierto ? "opacity-0" : "opacity-100 delay-200"
                    }`}
                  >
                    {p.nombre}
                  </span>

                  {/* Abierto: nombre, línea y enlace (ancho fijo: el texto no se recoloca al abrir) */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-10 left-10 w-[26rem] transition-[opacity,transform] duration-500 ease-out-expo ${
                      abierto ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-4 opacity-0"
                    }`}
                  >
                    <span className="block font-display text-[clamp(2.4rem,1.6rem+2.2vw,4rem)] font-light leading-none tracking-[-0.02em]">{p.nombre}</span>
                    <span className="mt-4 block text-[1rem] text-crema/80">{p.linea}</span>
                    <span className="btn-line mt-7 text-crema">
                      <span>Ver espacio</span>
                      <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Móvil y tableta: carrusel */}
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:hidden">
          {PANELES.map((p) => (
            <li key={p.id} className="w-[78vw] max-w-[22rem] shrink-0 snap-start">
              <Link href={href(locale, `/espacios#${p.id}`)} className="relative block aspect-[3/4] overflow-hidden bg-noche text-crema">
                <Photo img={p.img} sizes="78vw" mobileBelow={9999} decorative />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-noche/85 via-noche/10 to-transparent" />
                <span className="absolute inset-x-5 bottom-5">
                  <span className="block font-display text-3xl font-light">{p.nombre}</span>
                  <span className="mt-1 block text-sm text-crema/80">{p.linea}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
