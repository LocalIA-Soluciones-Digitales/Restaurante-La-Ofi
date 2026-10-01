"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { AllergenList } from "@/components/menu/AllergenList";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ALERGENOS, normalizarAlergenos, type AlergenoKey } from "@/lib/allergens";
import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/**
 * Carta navegable. Patrón adaptado de CategoryMenu de Palomita-Bar (categorías +
 * filtro por alérgenos), con navegación por anclas para que funcione sin JS.
 * Reutilizable tal cual por el futuro /pedir (añadiendo el botón "Añadir").
 */
export function CartaView({ secciones }: { secciones: CartaSeccion[] }) {
  const [excluidos, setExcluidos] = useState<Set<AlergenoKey>>(new Set());

  const presentes = useMemo(() => {
    const set = new Set<AlergenoKey>();
    secciones.forEach((s) => s.items.forEach((i) => normalizarAlergenos(i.alergenos).forEach((k) => set.add(k))));
    return ALERGENOS.filter((a) => set.has(a.key));
  }, [secciones]);

  const visibles = useMemo(
    () =>
      secciones.map((s) => ({
        ...s,
        items: s.items.filter((i) => !normalizarAlergenos(i.alergenos).some((k) => excluidos.has(k))),
      })),
    [secciones, excluidos],
  );

  const toggle = (key: AlergenoKey) =>
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      <nav aria-label="Categorías de la carta" className="sticky top-[4.5rem] z-20 -mx-4 border-b border-carbon/10 bg-crema/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-3">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.slug}`} className="inline-flex min-h-10 items-center rounded-full bg-arena px-4 text-sm font-semibold text-carbon transition-colors hover:bg-marino hover:text-crema">
                {s.nombre}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {presentes.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-carbon">Ocultar platos con:</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {presentes.map((a) => {
              const activo = excluidos.has(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => toggle(a.key)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                    activo ? "border-terracota bg-terracota text-crema" : "border-carbon/15 bg-white text-carbon hover:border-carbon/30"
                  }`}
                >
                  <AllergenIcon alergeno={a.key} />
                  {activo ? "Sin " : ""}
                  {a.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-10 space-y-14">
        {visibles.map((s) => (
          <section key={s.id} id={s.slug} aria-labelledby={`cat-${s.slug}`} className="scroll-mt-36">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id={`cat-${s.slug}`} className="text-3xl text-carbon sm:text-4xl">
                {s.nombre}
              </h2>
              <SourceBadge fuente={s.items[0]?.fuente ?? "supabase"} />
            </div>
            {s.nota ? <p className="mt-2 max-w-2xl text-sm text-carbon-muted">{s.nota}</p> : null}
            {s.items.length === 0 ? (
              <p className="mt-6 text-sm text-carbon-muted">Ningún plato de esta sección cumple el filtro de alérgenos.</p>
            ) : (
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {s.items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ item }: { item: CartaItem }) {
  return (
    <li className="flex gap-4 rounded-[1.5rem] border border-carbon/10 bg-white p-4 shadow-card sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl leading-snug text-carbon">{item.nombre}</h3>
          <p className="shrink-0 font-semibold text-marino">
            {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="text-sm font-medium text-carbon-muted">Consultar</span>}
          </p>
        </div>
        {item.destacado ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-oliva">Recomendado</p>
        ) : null}
        {item.descripcion ? <p className="mt-2 text-sm leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
        <AllergenList alergenos={item.alergenos} />
      </div>
      {item.imagen ? (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-arena sm:h-28 sm:w-28">
          <Image src={item.imagen.src} alt={item.imagen.alt} fill sizes="112px" className="object-cover" />
        </div>
      ) : null}
    </li>
  );
}
