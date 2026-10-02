"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { OrigenRect } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import { ETIQUETAS } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import { vibrar } from "@/lib/haptics";
import type { CartaItem } from "@/lib/restaurant/types";

/**
 * Tarjeta de plato: foto (o vídeo corto), nombre, descripción, precio, alérgenos
 * con icono, kcal si hay dato, etiquetas y "+ añadir" con contador en línea. Un
 * plato con modificadores obligatorios abre la ficha en vez de añadirse directo.
 */
export function ProductoCard({
  item,
  cart,
  onOpen,
}: {
  item: CartaItem;
  cart?: CartaCartControls;
  onOpen: (origen: OrigenRect | null) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [bump, setBump] = useState(0);
  const alergenos = normalizarAlergenos(item.alergenos);
  const cantidad = cart?.cantidad(item.id) ?? 0;
  const pedible = Boolean(cart?.sePuedePedir(item));
  const requiereFicha = item.modificadores.some((m) => m.obligatorio);

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    onOpen(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
  };

  const anadir = () => {
    if (!cart) return;
    if (requiereFicha) return abrir();
    cart.anadir(item);
    vibrar(12);
    setBump((b) => b + 1);
  };

  return (
    <li
      ref={ref}
      className={`group relative flex gap-4 rounded-[1.5rem] border bg-white p-4 shadow-card transition-[box-shadow,border-color] hover:shadow-lift sm:p-5 ${
        cantidad > 0 ? "border-marino/40" : "border-carbon/10"
      }`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl leading-snug text-carbon">
          {/* El nombre abre la ficha: un único control con nombre accesible, toda la tarjeta clicable. */}
          <button type="button" onClick={abrir} className="text-left after:absolute after:inset-0 after:rounded-[1.5rem] after:content-['']">
            {item.nombre}
          </button>
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-marino">
            {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="font-medium text-carbon-muted">Precio en el local</span>}
          </span>
          {item.nutricion?.calorias != null ? (
            <span className="inline-flex items-center gap-1 text-carbon-muted">
              <Icon name="flame" className="h-3.5 w-3.5" />
              {item.nutricion.calorias} kcal{item.nutricion.fuente === "ejemplo" ? " (ejemplo)" : ""}
            </span>
          ) : null}
        </div>
        {item.destacado || item.etiquetas.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {item.destacado ? <span className="rounded-full bg-oliva px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-crema">Recomendado</span> : null}
            {item.etiquetas
              .filter((e) => e !== "recomendado")
              .slice(0, 3)
              .map((e) => (
                <span key={e} className="rounded-full bg-oliva-soft px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-oliva">
                  {ETIQUETAS[e]}
                </span>
              ))}
          </p>
        ) : null}
        {item.descripcion ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
        {alergenos.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Alérgenos">
            {alergenos.map((k) => (
              <li key={k} title={getAlergeno(k).label} className="grid h-7 w-7 place-items-center rounded-full bg-terracota-soft text-terracota">
                <AllergenIcon alergeno={k} className="h-4 w-4" />
                <span className="sr-only">{getAlergeno(k).label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative flex shrink-0 flex-col items-end justify-between gap-3">
        {item.imagen ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-arena sm:h-28 sm:w-28">
            <Image src={item.imagen.src} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
        ) : null}
        {pedible ? (
          <div className="relative z-10">
            {cantidad > 0 && !requiereFicha ? (
              <div className="flex items-center rounded-full bg-marino text-crema shadow-card">
                <button type="button" onClick={() => cart!.quitarUno(item.id)} className="grid h-10 w-10 place-items-center">
                  <Icon name="minus" className="h-4 w-4" />
                  <span className="sr-only">Quitar uno de {item.nombre}</span>
                </button>
                <span key={bump} aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums motion-safe:animate-bump">
                  {cantidad}
                </span>
                <button type="button" onClick={anadir} className="grid h-10 w-10 place-items-center">
                  <Icon name="plus" className="h-4 w-4" />
                  <span className="sr-only">Añadir otro {item.nombre}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={anadir}
                className="inline-flex h-10 items-center gap-1 rounded-full bg-marino px-4 text-sm font-semibold text-crema shadow-card transition-transform hover:bg-marino-700 active:scale-95"
              >
                <Icon name="plus" className="h-4 w-4" />
                {cantidad > 0 ? `${cantidad} · Añadir` : "Añadir"}
                <span className="sr-only"> {item.nombre}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
