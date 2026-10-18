"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { MACRO_COLORES, MacroDonut } from "@/components/carta/MacroDonut";
import type { CartaCartControls } from "@/components/carta/types";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import {
  ETIQUETAS,
  precioConModificadores,
  repartoMacros,
  validarSeleccion,
  type SeleccionModificador,
} from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import { esIlustrativa } from "@/lib/images";
import { vibrar } from "@/lib/haptics";
import type { CartaItem } from "@/lib/restaurant/types";

export interface OrigenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Ficha de producto (modal). Portada de ProductDetailModal de Palomita-Bar:
 * entra "volteándose" desde la tarjeta pulsada, navega entre los platos de la
 * sección con flechas/teclado y, si hay cesta, permite elegir modificadores,
 * notas para cocina y cantidad. Accesible: useDialogA11y (foco, Escape, Tab).
 */
export function ProductoDetalle({
  items,
  index,
  seccion,
  origen,
  cart,
  onClose,
  onNavigate,
}: {
  items: CartaItem[];
  index: number;
  seccion: string;
  origen: OrigenRect | null;
  cart?: CartaCartControls;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const item = items[index]!;
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);

  // Volteo desde la tarjeta de origen (solo la primera vez que se abre).
  useLayoutEffect(() => {
    if (!cardEl || !origen || prefersReducedMotion()) return;
    const final = cardEl.getBoundingClientRect();
    const dx = origen.left + origen.width / 2 - (final.left + final.width / 2);
    const dy = origen.top + origen.height / 2 - (final.top + final.height / 2);
    const sx = Math.max(origen.width / final.width, 0.05);
    const sy = Math.max(origen.height / final.height, 0.05);
    cardEl.style.transition = "none";
    cardEl.style.opacity = "0.4";
    cardEl.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotateY(-100deg)`;
    void cardEl.getBoundingClientRect();
    const raf = requestAnimationFrame(() => {
      cardEl.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease-out";
      cardEl.style.transform = "none";
      cardEl.style.opacity = "1";
    });
    return () => cancelAnimationFrame(raf);
    // Solo al montar: navegar entre platos no repite el volteo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardEl]);

  const prev = () => onNavigate((index - 1 + items.length) % items.length);
  const next = () => onNavigate((index + 1) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, input")) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="producto-titulo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {items.length > 1 ? (
        <button type="button" onClick={prev} className="mr-4 hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-crema/15 text-crema hover:bg-crema/25 lg:grid">
          <Icon name="chevronLeft" />
          <span className="sr-only">Plato anterior</span>
        </button>
      ) : null}

      <div className="[perspective:1800px] w-full max-w-4xl lg:max-w-[min(94vw,1140px)]">
        <div
          ref={setCardEl}
          className="relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[2rem] lg:h-[min(86svh,680px)] bg-crema shadow-lift [transform-style:preserve-3d] max-sm:animate-sheet-up sm:rounded-[2rem]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-crema/90 text-carbon shadow-card backdrop-blur hover:bg-white"
          >
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
          <Detalle key={item.id} item={item} seccion={seccion} cart={cart} onAdded={onClose} posicion={`${index + 1} / ${items.length}`} />
          {items.length > 1 ? (
            <div className="flex items-center justify-between border-t border-carbon/10 px-4 py-2 lg:hidden">
              <button type="button" onClick={prev} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-carbon">
                <Icon name="chevronLeft" className="h-4 w-4" /> Anterior
              </button>
              <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-carbon">
                Siguiente <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {items.length > 1 ? (
        <button type="button" onClick={next} className="ml-4 hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-crema/15 text-crema hover:bg-crema/25 lg:grid">
          <Icon name="chevronRight" />
          <span className="sr-only">Plato siguiente</span>
        </button>
      ) : null}
    </div>
  );
}

function Detalle({
  item,
  seccion,
  cart,
  onAdded,
  posicion,
}: {
  item: CartaItem;
  seccion: string;
  cart?: CartaCartControls;
  onAdded: () => void;
  posicion: string;
}) {
  const [foto, setFoto] = useState(0);
  const [seleccion, setSeleccion] = useState<SeleccionModificador[]>([]);
  const [notas, setNotas] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [intentado, setIntentado] = useState(false);
  const [conNota, setConNota] = useState(false);

  const macros = useMemo(() => repartoMacros(item.nutricion), [item.nutricion]);
  const alergenos = normalizarAlergenos(item.alergenos);
  const errores = validarSeleccion(item, seleccion);
  const unitario = precioConModificadores(item, seleccion);
  const pedible = Boolean(cart?.sePuedePedir(item));
  const imagen = item.imagenes[foto] ?? null;

  const toggle = (modId: string, opId: string, unico: boolean) =>
    setSeleccion((prev) => {
      const actual = prev.find((s) => s.modificadorId === modId)?.opcionIds ?? [];
      const nuevas = unico ? [opId] : actual.includes(opId) ? actual.filter((x) => x !== opId) : [...actual, opId];
      return [...prev.filter((s) => s.modificadorId !== modId), { modificadorId: modId, opcionIds: nuevas }];
    });

  const anadir = () => {
    setIntentado(true);
    if (!cart || errores.length > 0) return;
    cart.anadir(item, { seleccion, notas: notas.trim() || undefined, cantidad });
    vibrar(15);
    onAdded();
  };

  const n = item.nutricion;
  const nota =
    n?.fuente === "ejemplo"
      ? "Valores ilustrativos de la demo, no reales."
      : n?.fuente === "estimacion"
        ? `Estimación orientativa por ${n.racion ?? "ración"}, calculada a partir de los ingredientes. No es un análisis del plato.`
        : `Valores aproximados por ${n?.racion ?? "ración"} facilitados por el restaurante.`;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden lg:grid-cols-[min(86svh,680px,52%)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      {/* Foto cuadrada (recortada centrada en el plato). En escritorio ocupa toda
          la altura de la ficha; su ancho sale de esa altura. */}
      <div className="relative bg-carbon">
        <div className="relative mx-auto aspect-square max-h-[48svh] w-full lg:h-full lg:max-h-none">
          {item.video ? (
            <video src={item.video} muted loop playsInline autoPlay={!prefersReducedMotion()} preload="metadata" className="h-full w-full object-cover" aria-label={item.nombre} />
          ) : imagen ? (
            <>
              <Image src={imagen.src} alt={imagen.alt} fill sizes="(min-width: 1024px) 680px, 100vw" className="object-cover" />
              {esIlustrativa(imagen.src) ? (
                <span className="absolute left-3 top-3 rounded-full bg-carbon/60 px-2.5 py-1 text-[0.68rem] font-medium text-crema backdrop-blur">
                  Imagen ilustrativa
                </span>
              ) : null}
            </>
          ) : (
            <BrandPlaceholder label={item.nombre} icon="utensils" />
          )}
          {item.imagenes.length > 1 && !item.video ? (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" role="group" aria-label="Fotos del plato">
              {item.imagenes.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  aria-pressed={i === foto}
                  onClick={() => setFoto(i)}
                  className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-crema/70 aria-pressed:border-crema aria-pressed:ring-2 aria-pressed:ring-marino"
                >
                  <Image src={img.src} alt="" fill sizes="44px" className="object-cover" />
                  <span className="sr-only">Foto {i + 1}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Información: en escritorio cabe sin desplazar; si un plato trae mucho
          (modificadores, notas), solo se desplaza esta parte. La barra de añadir
          va fuera del área que se desplaza, siempre abajo. */}
      <div className="flex flex-col lg:min-h-0">
        <div className="flex flex-col gap-4 p-6 sm:px-8 sm:pt-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <header className="pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow text-terracota">{seccion}</span>
              <span className="text-xs text-carbon-muted">{posicion}</span>
              <SourceBadge fuente={item.fuente} />
            </div>
            <h2 id="producto-titulo" className="mt-1.5 text-[1.9rem] leading-tight text-carbon">
              {item.nombre}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-display text-2xl text-marino">
                {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="text-base text-carbon-muted">Precio en el local</span>}
              </span>
              {item.destacado ? <span className="rounded-full bg-oliva px-2.5 py-0.5 text-xs font-semibold text-crema">Recomendado</span> : null}
              {item.etiquetas
                .filter((e) => !(e === "recomendado" && item.destacado))
                .map((e) => (
                  <span key={e} className="rounded-full bg-oliva-soft px-2.5 py-0.5 text-xs font-semibold text-oliva">
                    {ETIQUETAS[e]}
                  </span>
                ))}
            </div>
            {item.descripcion ? <p className="mt-2 text-sm leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
          </header>

          {item.ingredientes.length > 0 ? (
            <section aria-labelledby="ing-t">
              <h3 id="ing-t" className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-eyebrow text-carbon">
                <Icon name="leaf" className="h-3.5 w-3.5 text-oliva" />
                Ingredientes
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {item.ingredientes.map((ing) => (
                  <li key={ing} className="rounded-full border border-carbon/10 bg-white px-2.5 py-0.5 text-[0.8rem] text-carbon">
                    {ing}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {n ? (
            <section aria-labelledby="nut-t" className="rounded-2xl border border-carbon/10 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 id="nut-t" className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-eyebrow text-carbon">
                  <Icon name="flame" className="h-3.5 w-3.5 text-brasa" />
                  Información nutricional
                </h3>
                {n.fuente !== "restaurante" ? (
                  <span className="rounded-full bg-arena px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-carbon-muted">
                    {n.fuente === "ejemplo" ? "Ejemplo" : "Estimación"}
                  </span>
                ) : null}
              </div>
              <div className="mt-2.5 flex items-center gap-4">
                {macros.length > 0 ? (
                  <MacroDonut segmentos={macros} kcal={n.calorias} className="h-24 w-24" />
                ) : n.calorias !== null ? (
                  <p className="font-display text-3xl text-carbon">
                    {n.calorias} <span className="font-sans text-xs uppercase text-carbon-muted">kcal</span>
                  </p>
                ) : null}
                <ul className="grid flex-1 gap-1.5">
                  {macros.map((m) => (
                    <li key={m.key}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-carbon-muted">{m.label}</span>
                        <span className="whitespace-nowrap font-semibold tabular-nums text-carbon">
                          {m.gramos} g <span className="text-xs font-normal text-carbon-muted">{m.pct} %</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-arena">
                        <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: MACRO_COLORES[m.key] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2.5 text-[0.7rem] leading-snug text-carbon-muted">{nota}</p>
            </section>
          ) : null}

          <section aria-labelledby="ale-t">
            <h3 id="ale-t" className="sr-only">
              Alérgenos
            </h3>
            {!item.alergenosConfirmados ? (
              <p className="flex gap-2 rounded-xl bg-terracota-soft/60 px-3 py-2.5 text-[0.8rem] leading-snug text-terracota">
                <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Alérgenos sin confirmar: si tienes alguna alergia o intolerancia, pregunta al personal.
              </p>
            ) : alergenos.length === 0 ? (
              <p className="text-sm text-carbon-muted">Sin ninguno de los 14 alérgenos de declaración obligatoria.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5" aria-label="Alérgenos">
                {alergenos.map((k) => (
                  <li key={k} className="inline-flex items-center gap-1.5 rounded-full bg-terracota-soft px-2.5 py-1 text-xs font-semibold text-terracota">
                    <AllergenIcon alergeno={k} className="h-3.5 w-3.5" />
                    {getAlergeno(k).label}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {item.maridaje ? (
            <p className="flex gap-2 rounded-xl bg-[#1a0f12] px-3 py-2.5 text-sm text-crema">
              <Icon name="wine" className="mt-0.5 h-4 w-4 shrink-0 text-[#E8C9A8]" />
              <span>
                <span className="font-semibold text-[#E8C9A8]">Maridaje: </span>
                {item.maridaje}
              </span>
            </p>
          ) : null}

          {item.modificadores.map((m) => {
            const elegidas = seleccion.find((s) => s.modificadorId === m.id)?.opcionIds ?? [];
            const unico = m.tipo === "unico";
            return (
              <fieldset key={m.id}>
                <legend className="font-sans text-xs font-semibold uppercase tracking-eyebrow text-carbon">
                  {m.nombre}
                  {m.obligatorio ? <span className="ml-2 normal-case tracking-normal text-terracota">obligatorio</span> : null}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.opciones.map((o) => {
                    const activa = elegidas.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-terracota ${
                          activa ? "border-marino bg-marino text-crema" : "border-carbon/15 bg-white text-carbon hover:border-carbon/30"
                        } ${!pedible ? "cursor-default" : ""}`}
                      >
                        <input
                          type={unico ? "radio" : "checkbox"}
                          name={`mod-${m.id}`}
                          className="sr-only"
                          checked={activa}
                          disabled={!pedible}
                          onChange={() => toggle(m.id, o.id, unico)}
                        />
                        {o.nombre}
                        {o.precio_extra_centimos > 0 ? <span className="opacity-75">+{formatCentimos(o.precio_extra_centimos)}</span> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {pedible ? (
            conNota ? (
              <label className="block">
                <span className="font-sans text-xs font-semibold uppercase tracking-eyebrow text-carbon">Nota para cocina</span>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value.slice(0, 140))}
                  autoFocus
                  placeholder="Sin cebolla, muy hecho…"
                  className="mt-2 h-11 w-full rounded-full border border-carbon/15 bg-white px-4 text-base text-carbon placeholder:text-carbon-muted/70 focus:border-marino focus:outline-none"
                />
              </label>
            ) : (
              <button type="button" onClick={() => setConNota(true)} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marino hover:underline">
                <Icon name="plus" className="h-3.5 w-3.5" />
                Añadir nota para cocina
              </button>
            )
          ) : null}

          {pedible && intentado && errores.length > 0 ? (
            <p role="alert" className="text-sm font-semibold text-terracota">
              {errores.join(" · ")}
            </p>
          ) : null}
        </div>

        {pedible ? (
          <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-carbon/10 bg-crema/95 px-6 py-3.5 backdrop-blur sm:px-8 lg:static">
            <div className="flex items-center rounded-full border border-carbon/15 bg-white">
              <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="grid h-11 w-11 place-items-center text-carbon" disabled={cantidad <= 1}>
                <Icon name="minus" className="h-4 w-4" />
                <span className="sr-only">Una menos</span>
              </button>
              <span aria-live="polite" className="min-w-8 text-center font-semibold tabular-nums">
                {cantidad}
              </span>
              <button type="button" onClick={() => setCantidad((c) => Math.min(20, c + 1))} className="grid h-11 w-11 place-items-center text-carbon">
                <Icon name="plus" className="h-4 w-4" />
                <span className="sr-only">Una más</span>
              </button>
            </div>
            <button type="button" onClick={anadir} className="btn-primary flex-1">
              <Icon name="bag" className="h-4 w-4" />
              Añadir {unitario !== null ? `· ${formatCentimos(unitario * cantidad)}` : ""}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
