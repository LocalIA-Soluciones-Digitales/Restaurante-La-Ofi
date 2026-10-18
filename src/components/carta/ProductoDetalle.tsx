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
import { encuadrePlato, esIlustrativa } from "@/lib/images";
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

      <div className="[perspective:1800px] w-full max-w-4xl lg:max-w-5xl">
        <div
          ref={setCardEl}
          className="relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[2rem] lg:h-[min(88svh,720px)] bg-crema shadow-lift [transform-style:preserve-3d] max-sm:animate-sheet-up sm:rounded-[2rem]"
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

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden lg:grid-cols-[min(70.4svh,576px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      {/* Media: la foto entera en su formato (4:5). En escritorio ocupa toda la
          altura de la ficha (su ancho sale de esa altura) y solo se desplaza el texto. */}
      <div className="relative bg-carbon">
        <div className="relative h-full">
          <div className="relative mx-auto aspect-[4/5] max-h-[60svh] w-full lg:h-full lg:max-h-none">
            {item.video ? (
              <video src={item.video} muted loop playsInline autoPlay={!prefersReducedMotion()} preload="metadata" className="h-full w-full object-cover" aria-label={item.nombre} />
            ) : imagen ? (
              <>
                <Image src={imagen.src} alt={imagen.alt} fill sizes="(min-width: 768px) 45vw, 100vw" className={`object-cover ${encuadrePlato(imagen.src)}`} />
                {esIlustrativa(imagen.src) ? (
                  <span className="absolute left-3 top-3 rounded-full bg-carbon/60 px-2.5 py-1 text-[0.68rem] font-medium text-crema backdrop-blur">
                    Imagen ilustrativa
                  </span>
                ) : null}
              </>
            ) : (
              <BrandPlaceholder label={item.nombre} icon="utensils" />
            )}
          </div>
          {item.imagenes.length > 1 && !item.video ? (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" role="group" aria-label="Fotos del plato">
              {item.imagenes.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  aria-pressed={i === foto}
                  onClick={() => setFoto(i)}
                  className="relative h-12 w-12 overflow-hidden rounded-xl border-2 border-crema/70 aria-pressed:border-crema aria-pressed:ring-2 aria-pressed:ring-marino"
                >
                  <Image src={img.src} alt="" fill sizes="48px" className="object-cover" />
                  <span className="sr-only">Foto {i + 1}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Información */}
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:min-h-0 lg:overflow-y-auto">
        <div>
          <div className="flex flex-wrap items-center gap-2 pr-12">
            <span className="eyebrow text-terracota">{seccion}</span>
            <span className="text-xs text-carbon-muted">{posicion}</span>
            <SourceBadge fuente={item.fuente} />
          </div>
          <h2 id="producto-titulo" className="mt-2 text-3xl leading-tight text-carbon sm:text-4xl">
            {item.nombre}
          </h2>
          <p className="mt-2 font-display text-2xl text-marino">
            {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="text-base text-carbon-muted">Precio en el local</span>}
          </p>
          {item.etiquetas.length > 0 || item.destacado ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Etiquetas">
              {item.destacado ? <li className="rounded-full bg-oliva px-2.5 py-0.5 text-xs font-semibold text-crema">Recomendado</li> : null}
              {item.etiquetas
                .filter((e) => !(e === "recomendado" && item.destacado))
                .map((e) => (
                  <li key={e} className="rounded-full bg-oliva-soft px-2.5 py-0.5 text-xs font-semibold text-oliva">
                    {ETIQUETAS[e]}
                  </li>
                ))}
            </ul>
          ) : null}
          {item.descripcion ? <p className="mt-4 leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
        </div>

        {item.ingredientes.length > 0 ? (
          <section aria-labelledby="ing-t">
            <h3 id="ing-t" className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">
              <Icon name="leaf" className="h-4 w-4 text-oliva" />
              Ingredientes
            </h3>
            <ol className="mt-3 grid gap-x-4 gap-y-1.5 rounded-2xl border border-carbon/10 bg-white p-4 text-sm sm:grid-cols-2">
              {item.ingredientes.map((ing, i) => (
                <li key={ing} className="flex items-baseline gap-2.5 text-carbon">
                  <span className="w-5 shrink-0 text-[0.7rem] font-semibold tabular-nums text-brasa/80">{String(i + 1).padStart(2, "0")}</span>
                  {ing}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {item.nutricion ? (
          <section aria-labelledby="nut-t" className="rounded-[1.5rem] border border-carbon/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="nut-t" className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">
                <Icon name="flame" className="h-4 w-4 text-brasa" />
                Información nutricional
              </h3>
              {item.nutricion.fuente !== "restaurante" ? (
                <span className="rounded-full bg-arena px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-carbon-muted">
                  {item.nutricion.fuente === "ejemplo" ? "Valores de ejemplo" : "Estimación"}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <Dato etiqueta="Kcal" valor={item.nutricion.calorias !== null ? `${item.nutricion.fuente === "estimacion" ? "≈" : ""}${item.nutricion.calorias}` : "—"} color="#9A4527" />
              <Dato etiqueta="Proteínas" valor={item.nutricion.proteinas !== null ? `${item.nutricion.proteinas} g` : "—"} color={MACRO_COLORES.proteinas} />
              <Dato etiqueta="Hidratos" valor={item.nutricion.carbohidratos !== null ? `${item.nutricion.carbohidratos} g` : "—"} color={MACRO_COLORES.carbohidratos} />
              <Dato etiqueta="Grasas" valor={item.nutricion.grasas !== null ? `${item.nutricion.grasas} g` : "—"} color={MACRO_COLORES.grasas} />
            </div>

            {macros.length > 0 ? (
              <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl bg-papel-2 p-4 min-[420px]:flex-row min-[420px]:gap-5">
                <MacroDonut segmentos={macros} kcal={item.nutricion.calorias} />
                <ul className="grid w-full flex-1 gap-2 text-sm">
                  {macros.map((m) => (
                    <li key={m.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-carbon-muted">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: MACRO_COLORES[m.key] }} />
                        {m.label}
                      </span>
                      <span className="whitespace-nowrap font-semibold tabular-nums text-carbon">
                        {m.gramos} g <span className="font-normal text-carbon-muted">· {m.pct} %</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-3 text-xs leading-relaxed text-carbon-muted">
              {item.nutricion.fuente === "ejemplo"
                ? "Valores ilustrativos de la demo: no son los del plato real."
                : item.nutricion.fuente === "estimacion"
                  ? `Valores orientativos por ${item.nutricion.racion ?? "ración"}, estimados a partir de los ingredientes con tablas de composición de alimentos. No son un análisis del plato.`
                  : `Valores aproximados por ${item.nutricion.racion ?? "ración"} facilitados por el restaurante.`}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="ale-t">
          <h3 id="ale-t" className="font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">
            Alérgenos
          </h3>
          {!item.alergenosConfirmados ? (
            <p className="mt-2 flex gap-2 rounded-2xl bg-terracota-soft/60 p-3 text-sm text-terracota">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
              Información de alérgenos pendiente de confirmar. Si tienes alguna alergia o intolerancia, pregunta al personal
              antes de pedir.
            </p>
          ) : alergenos.length === 0 ? (
            <p className="mt-2 text-sm text-carbon-muted">No contiene ninguno de los 14 alérgenos de declaración obligatoria.</p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {alergenos.map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-carbon">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-terracota-soft text-terracota">
                    <AllergenIcon alergeno={k} />
                  </span>
                  {getAlergeno(k).label}
                </li>
              ))}
            </ul>
          )}
        </section>

        {item.maridaje ? (
          <section aria-labelledby="mar-t" className="flex gap-3 rounded-2xl bg-[#1a0f12] p-4 text-crema">
            <Icon name="wine" className="mt-0.5 h-5 w-5 shrink-0 text-[#E8C9A8]" />
            <div>
              <h3 id="mar-t" className="font-sans text-xs font-semibold uppercase tracking-eyebrow text-[#E8C9A8]">
                Maridaje sugerido
              </h3>
              <p className="mt-1 text-sm">{item.maridaje}</p>
            </div>
          </section>
        ) : null}

        {item.modificadores.map((m) => {
          const elegidas = seleccion.find((s) => s.modificadorId === m.id)?.opcionIds ?? [];
          const unico = m.tipo === "unico";
          return (
            <fieldset key={m.id}>
              <legend className="font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">
                {m.nombre}
                {m.obligatorio ? <span className="ml-2 normal-case tracking-normal text-terracota">obligatorio</span> : null}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.opciones.map((o) => {
                  const activa = elegidas.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-terracota ${
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
          <>
            <label className="block">
              <span className="font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">Notas para cocina</span>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value.slice(0, 140))}
                rows={2}
                placeholder="Sin cebolla, muy hecho…"
                className="mt-2 w-full rounded-2xl border border-carbon/15 bg-white px-4 py-3 text-base text-carbon placeholder:text-carbon-muted/70 focus:border-marino focus:outline-none"
              />
            </label>

            {intentado && errores.length > 0 ? (
              <p role="alert" className="text-sm font-semibold text-terracota">
                {errores.join(" · ")}
              </p>
            ) : null}

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex items-center gap-3 border-t border-carbon/10 bg-crema/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
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
          </>
        ) : null}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-carbon/10 bg-papel-2 px-1 py-3">
      <span aria-hidden="true" className="mx-auto block h-1.5 w-6 rounded-full" style={{ background: color }} />
      <p className="mt-2 font-display text-lg leading-none tabular-nums text-carbon">{valor}</p>
      <p className="mt-1 truncate text-[0.6rem] font-semibold uppercase tracking-wide text-carbon-muted">{etiqueta}</p>
    </div>
  );
}
