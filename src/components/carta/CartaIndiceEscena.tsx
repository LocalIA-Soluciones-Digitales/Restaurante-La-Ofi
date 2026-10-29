"use client";

import { useEffect, useRef, useState } from "react";
import { DishPhoto } from "@/components/media/DishPhoto";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { CartaSeccion } from "@/lib/restaurant/types";

/**
 * Índice de la carta a pantalla completa, en el azul de la barra: las secciones
 * en serifa grande con platos y precio desde, y en escritorio la foto de la
 * señalada al lado. Se abre desde la barra de la carta; elegir una sección
 * cierra el índice y salta a ella.
 */
export function CartaIndiceEscena({ secciones, activa, onClose }: { secciones: CartaSeccion[]; activa: string | null; onClose: () => void }) {
  const [senalada, setSenalada] = useState(() => Math.max(0, secciones.findIndex((s) => s.slug === activa)));
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cerrarRef.current?.focus();
    const previo = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = previo;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const platos = secciones.reduce((n, s) => n + s.items.length, 0);

  return (
    <div role="dialog" aria-modal="true" aria-label="Secciones de la carta" className="fixed inset-0 z-50 overflow-y-auto bg-noche text-crema motion-safe:animate-fade-up">
      <div className="container-wide flex min-h-full flex-col pb-10 pt-5 sm:pt-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ratan">
            La carta · {secciones.length} secciones<span className="hidden sm:inline"> · {platos} platos</span>
          </p>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-crema/25 px-4 text-sm font-semibold transition-colors hover:border-crema/60"
          >
            <Icon name="close" className="h-4 w-4" />
            Cerrar
          </button>
        </div>

        <div className="mt-8 grid flex-1 gap-10 lg:mt-12 lg:grid-cols-12 lg:gap-14">
          <ol className="lg:col-span-7">
            {secciones.map((s, i) => {
              const precios = s.items.map((it) => it.precioCentimos).filter((p): p is number => p !== null);
              const actual = s.slug === activa;
              return (
                <li key={s.id} className="border-b border-crema/10">
                  <a
                    href={`#${s.slug}`}
                    onClick={onClose}
                    onPointerEnter={() => setSenalada(i)}
                    onFocus={() => setSenalada(i)}
                    aria-current={actual ? "true" : undefined}
                    className="group flex items-baseline gap-4 py-3 sm:gap-6 sm:py-4"
                  >
                    <span aria-hidden="true" className="w-6 shrink-0 text-xs tabular-nums text-crema/50 transition-colors group-hover:text-ratan">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`min-w-0 flex-1 font-display text-[clamp(1.75rem,1.2rem+2.4vw,3.4rem)] font-light leading-[1.05] transition-[color,transform] duration-500 ease-out-expo group-hover:translate-x-2 group-hover:text-ratan ${
                        actual ? "italic text-ratan" : ""
                      }`}
                    >
                      {s.nombre}
                    </span>
                    <span className="shrink-0 text-right text-xs leading-snug text-crema/60 sm:text-sm">
                      {precios.length > 0 ? <span className="block text-crema">desde {formatCentimos(Math.min(...precios))}</span> : null}
                      {s.items.length} {s.items.length === 1 ? "plato" : "platos"}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>

          <div aria-hidden="true" className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-8 aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-noche-2">
              {secciones.map((s, i) => {
                const foto = s.items.find((it) => it.imagen)?.imagen;
                return foto ? (
                  <div
                    key={s.id}
                    className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out-expo ${i === senalada ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
                  >
                    <DishPhoto imagen={foto} sizes="(min-width: 1440px) 560px, 40vw" decorative />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
