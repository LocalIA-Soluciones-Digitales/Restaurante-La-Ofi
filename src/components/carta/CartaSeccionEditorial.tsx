"use client";

import { useRef, useState } from "react";
import type { OrigenRect } from "@/components/carta/ProductoDetalle";
import { DishPhoto } from "@/components/media/DishPhoto";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import { ETIQUETAS } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import { esIlustrativa } from "@/lib/images";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/**
 * Una sección de la carta como en papel: nombre, precio alineado, ingredientes
 * debajo. Si la sección tiene fotos reales, en escritorio acompaña una foto
 * fija que cambia con el plato que se señala (ratón o teclado); en móvil, sin
 * hover, la foto abre la sección y los platos con foto llevan miniatura.
 */
export function CartaSeccionEditorial({
  seccion,
  indice,
  onOpen,
}: {
  seccion: CartaSeccion;
  indice: number;
  onOpen: (index: number, origen: OrigenRect | null) => void;
}) {
  const conFoto = seccion.items.filter((i) => i.imagen);
  const [senalado, setSenalado] = useState<string | null>(null);
  const foto = (senalado ? conFoto.find((i) => i.id === senalado) : null) ?? conFoto[0] ?? null;

  return (
    <section id={seccion.slug} aria-labelledby={`cat-${seccion.slug}`} className="scroll-mt-40 border-t border-tinta-line pt-10 sm:pt-14">
      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span aria-hidden="true" className="font-display text-lg tabular-nums text-brasa">
          {String(indice + 1).padStart(2, "0")}
        </span>
        <h2 id={`cat-${seccion.slug}`} className="t-h2 text-carbon">
          {seccion.nombre}
        </h2>
        <SourceBadge fuente={seccion.items[0]?.fuente ?? "supabase"} />
      </header>
      {seccion.nota ? <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-carbon-muted">{seccion.nota}</p> : null}

      <div className={`mt-8 grid gap-10 ${foto ? "lg:grid-cols-12 lg:gap-14" : ""}`}>
        {foto ? (
          <div className="lg:order-2 lg:col-span-5">
            <div className="relative aspect-[4/3] overflow-hidden bg-papel-3 lg:sticky lg:top-44 lg:aspect-[4/5]">
              {conFoto.map((i) => (
                <div
                  key={i.id}
                  className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${i.id === foto.id ? "opacity-100" : "opacity-0"}`}
                >
                  <DishPhoto imagen={i.imagen!} sizes="(min-width: 1024px) 38vw, 100vw" decorative />
                </div>
              ))}
              <p className="absolute bottom-0 left-0 bg-crema/90 px-3 py-1.5 font-display text-sm text-carbon">
                {foto.nombre}
                {esIlustrativa(foto.imagen!.src) ? <span className="ml-2 font-sans text-[0.68rem] text-carbon-muted">Imagen ilustrativa</span> : null}
              </p>
            </div>
          </div>
        ) : null}

        <ul className={`${foto ? "lg:order-1 lg:col-span-7" : "grid gap-x-14 md:grid-cols-2"}`}>
          {seccion.items.map((item, i) => (
            <Plato
              key={item.id}
              item={item}
              onOpen={(origen) => onOpen(i, origen)}
              onSenalar={() => item.imagen && setSenalado(item.id)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Plato({ item, onOpen, onSenalar }: { item: CartaItem; onOpen: (o: OrigenRect | null) => void; onSenalar: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const alergenos = normalizarAlergenos(item.alergenos);
  const etiquetas = item.etiquetas.filter((e) => e !== "recomendado" && e !== "para_picar").slice(0, 2);
  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    onOpen(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
  };

  return (
    <li ref={ref} className="group relative border-b border-dotted border-tinta-line py-5" onMouseEnter={onSenalar}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-[1.3rem] leading-snug text-carbon transition-colors group-hover:text-brasa">
              {/* Toda la fila abre la ficha; el foco también cambia la foto. */}
              <button type="button" onClick={abrir} onFocus={onSenalar} className="text-left after:absolute after:inset-0 after:content-['']">
                {item.nombre}
              </button>
            </h3>
            {item.destacado ? <span className="text-xs font-semibold italic text-brasa">Recomendado</span> : null}
            <span aria-hidden="true" className="mb-1.5 hidden flex-1 border-b border-dotted border-carbon/25 sm:block" />
            <span className="ml-auto shrink-0 font-display text-[1.15rem] tabular-nums text-carbon">
              {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="font-sans text-xs text-carbon-muted">En el local</span>}
            </span>
          </div>
          {item.descripcion ? <p className="mt-1 text-[0.95rem] leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
          {alergenos.length > 0 || etiquetas.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {etiquetas.map((e) => (
                <span key={e} className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-oliva">
                  {ETIQUETAS[e]}
                </span>
              ))}
              {alergenos.length > 0 ? (
                <ul className="flex flex-wrap gap-1" aria-label="Alérgenos">
                  {alergenos.map((k) => (
                    <li key={k} title={getAlergeno(k).label} className="grid h-6 w-6 place-items-center rounded-full text-brasa ring-1 ring-brasa/25">
                      <AllergenIcon alergeno={k} className="h-3.5 w-3.5" />
                      <span className="sr-only">{getAlergeno(k).label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        {item.imagen ? (
          <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden bg-papel-3 lg:hidden">
            <DishPhoto imagen={item.imagen} sizes="72px" decorative />
          </div>
        ) : null}
      </div>
    </li>
  );
}
