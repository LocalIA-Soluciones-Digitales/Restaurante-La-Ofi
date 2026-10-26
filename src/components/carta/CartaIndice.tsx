"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ImagenRef } from "@/lib/restaurant/types";

export interface EntradaIndice {
  slug: string;
  nombre: string;
  platos: number;
  /** Precio más bajo de la sección, ya formateado ("2,10 €"). */
  desde: string | null;
  foto: ImagenRef | null;
}

/**
 * Índice de la carta como el de una carta impresa: secciones en grande,
 * numeradas, con platos y precio desde. En escritorio, una sola foto al lado
 * que cambia con la sección señalada (como el menú desplegable del sitio).
 */
export function CartaIndice({ entradas }: { entradas: EntradaIndice[] }) {
  const [activa, setActiva] = useState(0);
  const conFoto = entradas.filter((e) => e.foto);

  return (
    <nav aria-label="Secciones de la carta" className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <ol className="border-t border-tinta-line lg:col-span-7">
        {entradas.map((e, i) => (
          <li key={e.slug} className="border-b border-tinta-line">
            <a
              href={`#${e.slug}`}
              onPointerEnter={() => setActiva(i)}
              onFocus={() => setActiva(i)}
              className="group flex items-baseline gap-4 py-3.5 sm:gap-6 sm:py-4 lg:py-5"
            >
              <span aria-hidden="true" className="w-6 shrink-0 text-xs tabular-nums text-carbon-muted transition-colors group-hover:text-brasa">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 font-display text-[1.5rem] font-light leading-[1.1] text-carbon transition-[color,transform] duration-300 ease-out group-hover:translate-x-1 group-hover:text-brasa sm:text-4xl lg:text-[2.6rem]">
                {e.nombre}
              </span>
              <span className="shrink-0 text-right text-xs leading-snug text-carbon-muted sm:text-sm">
                {e.desde ? <span className="block font-semibold text-carbon">desde {e.desde}</span> : null}
                {e.platos} {e.platos === 1 ? "plato" : "platos"}
              </span>
              <Icon name="arrow" className="hidden h-5 w-5 shrink-0 rotate-90 self-center text-carbon/30 transition-colors group-hover:text-brasa sm:block" />
            </a>
          </li>
        ))}
      </ol>

      {conFoto.length > 0 ? (
        <div aria-hidden="true" className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-papel-3">
              {entradas.map((e, i) =>
                e.foto ? (
                  <Image
                    key={e.slug}
                    src={e.foto.src}
                    alt=""
                    fill
                    sizes="(min-width: 1440px) 560px, 40vw"
                    className={`object-cover transition-[opacity,transform] duration-700 ease-out ${i === activa ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
                  />
                ) : null,
              )}
            </div>
            <p className="mt-3 flex items-center justify-between text-xs text-carbon-muted">
              <span>{entradas[activa]?.nombre}</span>
              <span className="tabular-nums">
                {String(activa + 1).padStart(2, "0")} / {String(entradas.length).padStart(2, "0")}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
