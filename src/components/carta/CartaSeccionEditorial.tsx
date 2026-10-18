"use client";

import { useRef } from "react";
import { AnadirControl } from "@/components/carta/AnadirControl";
import { MACRO_COLORES } from "@/components/carta/MacroDonut";
import type { OrigenRect } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { DishPhoto } from "@/components/media/DishPhoto";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import { ETIQUETAS } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import { esIlustrativa } from "@/lib/images";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/**
 * Una sección de la carta en tarjetas: foto del plato, precio, kcal, macros de un
 * vistazo y, si hay cesta, "+ Añadir". Toda la tarjeta abre la ficha completa.
 */
export function CartaSeccionEditorial({
  seccion,
  indice,
  cart,
  onOpen,
}: {
  seccion: CartaSeccion;
  indice: number;
  cart?: CartaCartControls;
  onOpen: (index: number, origen: OrigenRect | null) => void;
}) {
  return (
    <section id={seccion.slug} aria-labelledby={`cat-${seccion.slug}`} className="scroll-mt-40 border-t border-tinta-line pt-10 sm:pt-14">
      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span aria-hidden="true" className="font-display text-lg tabular-nums text-brasa">
          {String(indice + 1).padStart(2, "0")}
        </span>
        <h2 id={`cat-${seccion.slug}`} className="t-h2 text-carbon">
          {seccion.nombre}
        </h2>
        <span className="text-sm text-carbon-muted">
          {seccion.items.length} {seccion.items.length === 1 ? "plato" : "platos"}
        </span>
        <SourceBadge fuente={seccion.items[0]?.fuente ?? "supabase"} />
      </header>
      {seccion.nota ? <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-carbon-muted">{seccion.nota}</p> : null}

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {seccion.items.map((item, i) => (
          <PlatoCard key={item.id} item={item} cart={cart} onOpen={(origen) => onOpen(i, origen)} />
        ))}
      </ul>
    </section>
  );
}

function PlatoCard({ item, cart, onOpen }: { item: CartaItem; cart?: CartaCartControls; onOpen: (o: OrigenRect | null) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const alergenos = normalizarAlergenos(item.alergenos);
  const etiquetas = item.etiquetas.filter((e) => e !== "recomendado" && e !== "para_picar").slice(0, 2);
  const n = item.nutricion;
  const texto = item.descripcion ?? (item.ingredientes.length > 0 ? item.ingredientes.join(" · ") : null);
  const pedible = Boolean(cart?.sePuedePedir(item));
  const enCesta = cart ? cart.cantidad(item.id) : 0;

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    onOpen(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
  };

  return (
    <li
      ref={ref}
      className={`group relative flex flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-card ring-1 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        enCesta > 0 ? "ring-marino/40" : "ring-carbon/[0.07]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-papel-3">
        {item.imagen ? (
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <DishPhoto imagen={item.imagen} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" decorative />
          </div>
        ) : (
          <BrandPlaceholder label={item.nombre} icon={item.estacion === "barra" ? "wine" : "utensils"} iconOnly />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-carbon/35 to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {item.destacado ? <Chip className="bg-oliva text-crema">Recomendado</Chip> : null}
            {etiquetas.map((e) => (
              <Chip key={e} className="bg-crema/90 text-carbon">
                {ETIQUETAS[e]}
              </Chip>
            ))}
          </div>
          {n?.calorias != null ? (
            <Chip className="shrink-0 bg-carbon/75 text-crema">
              <Icon name="flame" className="h-3 w-3" />
              {n.fuente === "estimacion" ? "≈ " : ""}
              {n.calorias} kcal
            </Chip>
          ) : null}
        </div>
        {item.imagen && esIlustrativa(item.imagen.src) ? (
          <span className="absolute bottom-2 left-3 text-[0.65rem] font-medium text-crema/85">Imagen ilustrativa</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[1.25rem] leading-snug text-carbon transition-colors group-hover:text-brasa">
            {/* Toda la tarjeta abre la ficha: un único control con nombre accesible. */}
            <button type="button" onClick={abrir} className="text-left after:absolute after:inset-0 after:content-['']">
              {item.nombre}
            </button>
          </h3>
          <span className="shrink-0 pt-0.5 font-display text-lg tabular-nums text-carbon">
            {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="font-sans text-xs text-carbon-muted">En el local</span>}
          </span>
        </div>
        {texto ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-carbon-muted">{texto}</p> : null}

        {n && n.proteinas !== null && n.carbohidratos !== null && n.grasas !== null ? (
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-carbon-muted">
            <Macro color={MACRO_COLORES.proteinas} label="Proteínas" valor={n.proteinas} />
            <Macro color={MACRO_COLORES.carbohidratos} label="Hidratos" valor={n.carbohidratos} />
            <Macro color={MACRO_COLORES.grasas} label="Grasas" valor={n.grasas} />
          </dl>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {alergenos.length > 0 ? (
            <ul className="flex flex-wrap gap-1" aria-label="Alérgenos">
              {alergenos.map((k) => (
                <li key={k} title={getAlergeno(k).label} className="grid h-6 w-6 place-items-center rounded-full text-brasa ring-1 ring-brasa/25">
                  <AllergenIcon alergeno={k} className="h-3.5 w-3.5" />
                  <span className="sr-only">{getAlergeno(k).label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span aria-hidden="true" className="inline-flex items-center gap-1 text-xs font-semibold text-carbon-muted transition-colors group-hover:text-brasa">
              Ver ficha
              <Icon name="chevronRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
          {pedible && cart ? <AnadirControl item={item} cart={cart} onRequiereFicha={abrir} /> : null}
        </div>
      </div>
    </li>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider backdrop-blur ${className}`}>
      {children}
    </span>
  );
}

function Macro({ color, label, valor }: { color: string; label: string; valor: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: color }} />
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums text-carbon">{valor} g</dd>
    </div>
  );
}
