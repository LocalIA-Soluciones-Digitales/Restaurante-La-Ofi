"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import { creditoFoto, IMAGES, type ImageKey } from "@/lib/images";

export interface Momento {
  titulo: string;
  texto: string;
  href: string;
  img: ImageKey;
}

/**
 * Índice de La Ofi como lista de filas (no tarjetas): título, una línea y
 * "Saber más". En escritorio la foto de la derecha cambia con la fila señalada;
 * en móvil no hay foto (la lista es lo que importa).
 */
export function ParaCadaMomento({ items }: { items: Momento[] }) {
  const [activo, setActivo] = useState(0);
  const actual = items[activo] ?? items[0]!;
  const credito = creditoFoto(IMAGES[actual.img]);

  return (
    <section aria-labelledby="momentos-title" className="cv-auto section bg-papel-2">
      <div className="container-wide">
        <SectionRule id="momentos-title" title="Para cada momento" aside={<span>{items.length} formas de venir</span>} />

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <ul className="border-t border-tinta-line lg:col-span-7">
            {items.map((m, i) => (
              <li key={m.href} className="border-b border-tinta-line">
                <Link
                  href={m.href}
                  onPointerEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  className="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-4 py-5 sm:py-6"
                >
                  <span aria-hidden="true" className="text-xs tabular-nums text-carbon-muted">
                    0{i + 1}
                  </span>
                  <span>
                    <span
                      className={`block font-display text-[clamp(1.35rem,1.1rem+0.9vw,1.9rem)] font-light leading-tight transition-colors duration-300 ${
                        activo === i ? "text-brasa" : "text-carbon group-hover:text-brasa"
                      }`}
                    >
                      {m.titulo}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-carbon-muted">{m.texto}</span>
                  </span>
                  <span className="kicker hidden items-center gap-2 text-carbon sm:inline-flex">
                    Saber más
                    <Icon name="arrow" className="h-4 w-4 text-brasa transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <Icon name="arrow" className="h-4 w-4 text-brasa sm:hidden" />
                </Link>
              </li>
            ))}
          </ul>

          <figure aria-hidden="true" className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28">
              <div className="relative aspect-[4/5] overflow-hidden bg-papel-3">
                {items.map((m, i) => (
                  <div key={m.href} className={`absolute inset-0 transition-opacity duration-500 ease-out ${i === activo ? "opacity-100" : "opacity-0"}`}>
                    <Photo img={m.img} sizes="38vw" mobileBelow={9999} decorative />
                  </div>
                ))}
              </div>
              {credito ? <figcaption className="mt-2 text-[0.68rem] text-carbon-muted">{credito}</figcaption> : null}
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
