"use client";

import { useEffect, useRef, useState } from "react";
import { AnadirControl } from "@/components/carta/AnadirControl";
import type { OrigenRect } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { MiniaturaPlato } from "@/components/carta/MiniaturaPlato";
import { DishPhoto } from "@/components/media/DishPhoto";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import { ETIQUETAS } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/**
 * Una sección de la carta "en escena": abre con una foto panorámica (paralaje,
 * como las bandas de la home) y el nombre enorme encima; debajo, los platos en
 * filas editoriales. En escritorio, la foto del plato señalado flota junto al
 * cursor; en móvil cada fila lleva su miniatura. Toda la fila abre la ficha.
 */
export function CartaSeccionEscena({
  seccion,
  indice,
  total,
  cart,
  onOpen,
}: {
  seccion: CartaSeccion;
  indice: number;
  total: number;
  cart?: CartaCartControls;
  onOpen: (index: number, origen: OrigenRect | null) => void;
}) {
  const portada = seccion.items.find((it) => it.imagen)?.imagen ?? null;
  const precios = seccion.items.map((it) => it.precioCentimos).filter((p): p is number => p !== null);
  const desde = precios.length > 0 ? formatCentimos(Math.min(...precios)) : null;
  const [senalado, setSenalado] = useState<number | null>(null);
  const flotante = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [puntero, setPuntero] = useState(false);

  // La foto flotante solo con ratón (puntero fino y hover): en táctil no hay cursor.
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    const update = () => setPuntero(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Sigue al cursor con un poco de inercia (rAF); sin animación si se pide menos movimiento.
  useEffect(() => {
    const lista = listaRef.current;
    const el = flotante.current;
    if (!puntero || !lista || !el) return;
    const inercia = prefersReducedMotion() ? 1 : 0.16;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, primero = true;
    const paso = () => {
      x += (tx - x) * inercia;
      y += (ty - y) * inercia;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(paso) : 0;
    };
    const mover = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (primero) {
        x = tx;
        y = ty;
        primero = false;
      }
      if (!raf) raf = requestAnimationFrame(paso);
    };
    lista.addEventListener("pointermove", mover);
    return () => {
      lista.removeEventListener("pointermove", mover);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [puntero]);

  return (
    <section id={seccion.slug} aria-labelledby={`cat-${seccion.slug}`} className="scroll-mt-28 pt-12 first:pt-4 sm:pt-20 sm:first:pt-8">
      <header className="relative isolate flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-noche p-5 text-crema sm:aspect-[16/7] sm:p-8 lg:aspect-[21/8] lg:p-10">
        {portada ? (
          <div className="parallax absolute inset-0 -z-10">
            <DishPhoto imagen={portada} sizes="(min-width: 1440px) 1360px, 100vw" decorative />
          </div>
        ) : null}
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-noche/90 via-noche/25 to-noche/40" />
        <p className="flex items-center justify-between gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-crema/80">
          <span className="tabular-nums">
            {String(indice + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span>
            {seccion.items.length} {seccion.items.length === 1 ? "plato" : "platos"}
            {desde ? ` · desde ${desde}` : ""}
          </span>
        </p>
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end lg:gap-10">
          <h2
            id={`cat-${seccion.slug}`}
            className="font-display text-[clamp(2.5rem,1.3rem+5.2vw,6.75rem)] font-light leading-[0.92] tracking-[-0.025em] text-balance lg:col-span-8"
          >
            {seccion.nombre}
          </h2>
          {seccion.nota ? <p className="max-w-md text-sm italic leading-relaxed text-crema/80 lg:col-span-4 lg:justify-self-end lg:text-right">{seccion.nota}</p> : null}
        </div>
      </header>

      <ul ref={listaRef} onPointerLeave={() => setSenalado(null)} className="mt-2 sm:mt-4">
        {seccion.items.map((item, i) => (
          <Fila key={item.id} item={item} seccion={seccion.nombre} cart={cart} onEnter={() => setSenalado(i)} onOpen={(origen) => onOpen(i, origen)} />
        ))}
      </ul>

      {/* Foto que acompaña al cursor (solo escritorio con ratón). */}
      {puntero ? (
        <div ref={flotante} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30">
          <div
            className={`relative ml-10 aspect-[4/5] w-[16rem] -translate-y-1/2 overflow-hidden rounded-2xl bg-papel-3 shadow-[0_30px_60px_-20px_rgb(11_20_36/0.55)] transition-[opacity,transform] duration-500 ease-out-expo ${
              senalado !== null && seccion.items[senalado]?.imagen ? "rotate-[-2deg] scale-100 opacity-100" : "rotate-0 scale-90 opacity-0"
            }`}
          >
            {seccion.items.map((it, i) =>
              it.imagen ? (
                <div key={it.id} className={`absolute inset-0 transition-opacity duration-300 ${i === senalado ? "opacity-100" : "opacity-0"}`}>
                  <DishPhoto imagen={it.imagen} sizes="256px" decorative />
                </div>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Fila({
  item,
  seccion,
  cart,
  onEnter,
  onOpen,
}: {
  item: CartaItem;
  seccion: string;
  cart?: CartaCartControls;
  onEnter: () => void;
  onOpen: (o: OrigenRect | null) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const alergenos = normalizarAlergenos(item.alergenos);
  const etiquetas = item.etiquetas.filter((e) => e !== "recomendado" && e !== "para_picar").slice(0, 2);
  const kcal = item.nutricion?.calorias ?? null;
  const texto = item.descripcion ?? (item.ingredientes.length > 0 ? item.ingredientes.join(" · ") : null);
  const pedible = Boolean(cart?.sePuedePedir(item));

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    onOpen(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
  };

  return (
    <li ref={ref} onPointerEnter={onEnter} className="group relative border-b border-tinta-line">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-4 sm:gap-6 lg:grid-cols-[5rem_minmax(0,1fr)_auto] lg:py-5">
        {/* Todos los platos con su imagen pequeña: la foto si la hay; si no, su tipo ilustrado. */}
        {item.imagen ? (
          <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-xl bg-papel-3 lg:h-20 lg:w-20">
            <DishPhoto imagen={item.imagen} sizes="80px" decorative />
          </div>
        ) : (
          <MiniaturaPlato nombre={item.nombre} seccion={seccion} className="h-[4.5rem] w-[4.5rem] lg:h-20 lg:w-20" />
        )}

        <div className="min-w-0">
          <h3 className="font-display text-[1.2rem] font-light leading-tight text-carbon transition-[color,transform] duration-500 ease-out-expo group-hover:text-brasa sm:text-[1.5rem] lg:text-[2rem] lg:group-hover:translate-x-2">
            {/* Toda la fila abre la ficha: un único control con nombre accesible. */}
            <button type="button" onClick={abrir} className="text-left after:absolute after:inset-0 after:content-['']">
              {item.nombre}
            </button>
          </h3>
          {texto ? <p className="mt-1 line-clamp-2 max-w-[44rem] text-sm leading-relaxed text-carbon-muted">{texto}</p> : null}
          {item.destacado || etiquetas.length > 0 || kcal != null || alergenos.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-carbon-muted">
              {item.destacado ? <span className="font-semibold uppercase tracking-wider text-oliva">Recomendado</span> : null}
              {etiquetas.map((e) => (
                <span key={e} className="font-semibold uppercase tracking-wider">
                  {ETIQUETAS[e]}
                </span>
              ))}
              {kcal != null ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="flame" className="h-3 w-3" />
                  {item.nutricion?.fuente === "estimacion" ? "≈ " : ""}
                  {kcal} kcal
                </span>
              ) : null}
              {alergenos.length > 0 ? (
                <ul className="flex flex-wrap gap-1" aria-label="Alérgenos">
                  {alergenos.map((k) => (
                    <li key={k} title={getAlergeno(k).label} className="grid h-5 w-5 place-items-center rounded-full text-brasa ring-1 ring-brasa/25">
                      <AllergenIcon alergeno={k} className="h-3 w-3" />
                      <span className="sr-only">{getAlergeno(k).label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-display text-lg tabular-nums text-carbon lg:text-2xl">
            {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="font-sans text-xs text-carbon-muted">En el local</span>}
          </span>
          {pedible && cart ? <AnadirControl item={item} cart={cart} onRequiereFicha={abrir} compacto /> : null}
        </div>
      </div>
    </li>
  );
}
