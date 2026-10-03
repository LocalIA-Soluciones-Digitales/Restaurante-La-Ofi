"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CartaSeccionEditorial } from "@/components/carta/CartaSeccionEditorial";
import { FiltroAlergenos } from "@/components/carta/FiltroAlergenos";
import { ProductoCard } from "@/components/carta/ProductoCard";
import { ProductoDetalle, type OrigenRect } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { AlergenoKey } from "@/lib/allergens";
import { FILTROS_RAPIDOS, MOMENTOS, filtrarCarta, hayFiltros, SIN_FILTROS, type FiltroRapido, type FiltrosCarta } from "@/lib/carta";
import type { CartaSeccion, MomentoCarta } from "@/lib/restaurant/types";

/**
 * Carta interactiva: categorías pegajosas con scroll-spy, buscador, filtros por
 * momento del día, etiquetas y los 14 alérgenos, y ficha de producto.
 * - Sin `cart` (/carta): carta editorial, como en papel; la UI se esconde tras
 *   "Buscar y filtrar" para que mande la comida.
 * - Con `cart` (/pedir): tarjetas con "+ añadir" y contador.
 */
export function CartaInteractiva({
  secciones,
  cart,
  stickyTop = "top-16 lg:top-[4.5rem]",
}: {
  secciones: CartaSeccion[];
  cart?: CartaCartControls;
  /** Offset de la barra pegajosa (bajo la cabecera del sitio). */
  stickyTop?: string;
}) {
  const [filtros, setFiltros] = useState<FiltrosCarta>(SIN_FILTROS);
  const [activa, setActiva] = useState<string | null>(secciones[0]?.slug ?? null);
  const [detalle, setDetalle] = useState<{ seccion: string; index: number; origen: OrigenRect | null } | null>(null);
  const [alergenosAbierto, setAlergenosAbierto] = useState(false);
  const [panel, setPanel] = useState(false);
  const navRef = useRef<HTMLUListElement>(null);
  const editorial = !cart;

  const { secciones: visibles, ocultosSinConfirmar } = useMemo(() => filtrarCarta(secciones, filtros), [secciones, filtros]);
  const conItems = useMemo(() => visibles.filter((s) => s.items.length > 0), [visibles]);
  const total = conItems.reduce((a, s) => a + s.items.length, 0);
  const nFiltros = (filtros.texto ? 1 : 0) + (filtros.momento ? 1 : 0) + filtros.rapidos.size + filtros.sinAlergenos.size;

  // Scroll-spy: la sección más visible bajo la barra pegajosa.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length === 0) return;
        const top = vis.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiva(top.target.id);
      },
      { rootMargin: "-170px 0px -55% 0px", threshold: 0 },
    );
    conItems.forEach((s) => {
      const el = document.getElementById(s.slug);
      if (el) io.observe(el);
    });
    // Por encima de la primera categoría ninguna cruza la franja: activa la primera.
    const primera = conItems[0] ? document.getElementById(conItems[0].slug) : null;
    const onScroll = () => {
      if (primera && primera.getBoundingClientRect().top > 170) setActiva(conItems[0]!.slug);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [conItems]);

  // La categoría activa siempre visible en la barra horizontal.
  useEffect(() => {
    const pill = navRef.current?.querySelector<HTMLElement>(`[data-slug="${activa}"]`);
    pill?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activa]);

  const set = (p: Partial<FiltrosCarta>) => setFiltros((f) => ({ ...f, ...p }));
  const toggleRapido = (k: FiltroRapido) =>
    setFiltros((f) => {
      const r = new Set(f.rapidos);
      if (r.has(k)) r.delete(k);
      else r.add(k);
      return { ...f, rapidos: r };
    });

  const seccionDetalle = detalle ? conItems.find((s) => s.slug === detalle.seccion) : undefined;

  const buscador = (
    <label className="relative min-w-[12rem] flex-1">
      <span className="sr-only">Buscar en la carta</span>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
      <input
        type="search"
        value={filtros.texto}
        onChange={(e) => set({ texto: e.target.value })}
        placeholder="Buscar plato o ingrediente"
        className={`h-11 w-full border border-carbon/20 bg-white pl-10 pr-4 text-base text-carbon placeholder:text-carbon-muted focus:border-carbon focus:outline-none ${editorial ? "rounded-md" : "rounded-full"}`}
      />
    </label>
  );

  const botonAlergenos = (
    <button
      type="button"
      onClick={() => setAlergenosAbierto(true)}
      aria-haspopup="dialog"
      className={`inline-flex h-11 items-center gap-2 border px-4 text-sm font-semibold transition-colors ${editorial ? "rounded-md" : "rounded-full"} ${
        filtros.sinAlergenos.size > 0 ? "border-brasa bg-brasa text-crema" : "border-carbon/20 bg-white text-carbon hover:border-carbon/40"
      }`}
    >
      <Icon name="filter" className="h-4 w-4" />
      Alérgenos
      {filtros.sinAlergenos.size > 0 ? <span className="rounded-full bg-crema/25 px-1.5 text-xs">{filtros.sinAlergenos.size}</span> : null}
    </button>
  );

  const chips = (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filtros rápidos">
      {MOMENTOS.map((m) => (
        <Chip
          key={m.key}
          activo={filtros.momento === m.key}
          editorial={editorial}
          onClick={() => set({ momento: filtros.momento === m.key ? null : (m.key as MomentoCarta) })}
          icon={m.key === "desayuno" ? "sunrise" : m.key === "mediodia" ? "sun" : "sunset"}
        >
          {m.label}
        </Chip>
      ))}
      <span aria-hidden="true" className="mx-1 w-px shrink-0 bg-carbon/10" />
      {FILTROS_RAPIDOS.map((r) => (
        <Chip key={r.key} activo={filtros.rapidos.has(r.key)} editorial={editorial} onClick={() => toggleRapido(r.key)}>
          {r.label}
        </Chip>
      ))}
    </div>
  );

  return (
    <div>
      {editorial ? (
        <div data-header-fixed className={`sticky ${stickyTop} z-20 -mx-4 border-b border-tinta-line bg-crema/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10`}>
          <div className="flex items-center gap-4">
            <nav aria-label="Categorías de la carta" className="min-w-0 flex-1">
              <ul ref={navRef} className="no-scrollbar flex gap-6 overflow-x-auto">
                {conItems.map((s) => (
                  <li key={s.id} className="shrink-0">
                    <a
                      href={`#${s.slug}`}
                      data-slug={s.slug}
                      aria-current={activa === s.slug ? "true" : undefined}
                      className="relative inline-flex min-h-[3.25rem] items-center text-[0.95rem] font-medium text-carbon-muted transition-colors hover:text-carbon aria-[current=true]:text-carbon after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-brasa after:transition-transform aria-[current=true]:after:scale-x-100"
                    >
                      {s.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              aria-expanded={panel}
              aria-controls="carta-filtros"
              onClick={() => setPanel((p) => !p)}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-carbon"
            >
              <Icon name={panel ? "close" : "search"} className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar y filtrar</span>
              <span className="sr-only sm:hidden">Buscar y filtrar</span>
              {nFiltros > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brasa px-1 text-[0.7rem] text-crema">{nFiltros}</span> : null}
            </button>
          </div>
          {panel ? (
            <div id="carta-filtros" className="grid gap-3 border-t border-tinta-line py-4 motion-safe:animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                {buscador}
                {botonAlergenos}
              </div>
              {chips}
            </div>
          ) : null}
        </div>
      ) : (
        <div data-header-fixed className={`sticky ${stickyTop} z-20 -mx-4 border-b border-carbon/10 bg-crema/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-b-3xl lg:px-4`}>
          <nav aria-label="Categorías de la carta">
            <ul ref={navRef} className="no-scrollbar flex gap-2 overflow-x-auto">
              {conItems.map((s) => (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.slug}`}
                    data-slug={s.slug}
                    aria-current={activa === s.slug ? "true" : undefined}
                    className="inline-flex min-h-10 items-center rounded-full bg-arena px-4 text-sm font-semibold text-carbon transition-colors hover:bg-arena-2 aria-[current=true]:bg-marino aria-[current=true]:text-crema"
                  >
                    {s.nombre}
                    <span className="ml-1.5 text-xs opacity-80">{s.items.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {buscador}
            {botonAlergenos}
          </div>
          <div className="mt-2">{chips}</div>
        </div>
      )}

      {/* Estado del filtrado */}
      <div aria-live="polite" className="mt-4 min-h-6 text-sm text-carbon-muted">
        {hayFiltros(filtros) ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {total} {total === 1 ? "plato" : "platos"}
            </span>
            <button type="button" onClick={() => setFiltros(SIN_FILTROS)} className="font-semibold text-brasa underline-offset-4 hover:underline">
              Quitar filtros
            </button>
          </p>
        ) : null}
        {ocultosSinConfirmar > 0 ? (
          <p className="mt-2 flex gap-2 border-l-2 border-brasa bg-brasa-soft/50 p-3 text-brasa">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
            {ocultosSinConfirmar} {ocultosSinConfirmar === 1 ? "plato oculto" : "platos ocultos"} porque sus alérgenos aún no están confirmados.
            Pregunta al personal.
          </p>
        ) : null}
      </div>

      {conItems.length === 0 ? (
        <div className="mt-10 border-y border-tinta-line py-12 text-center">
          <p className="font-display text-2xl text-carbon">Ningún plato cumple los filtros</p>
          <button type="button" onClick={() => setFiltros(SIN_FILTROS)} className="btn-secondary mt-5">
            Ver toda la carta
          </button>
        </div>
      ) : null}

      {editorial ? (
        <div className="mt-4 space-y-16 sm:space-y-20">
          {conItems.map((s, i) => (
            <CartaSeccionEditorial
              key={s.id}
              seccion={s}
              indice={i}
              onOpen={(index, origen) => setDetalle({ seccion: s.slug, index, origen })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-16">
          {conItems.map((s) => (
            <section key={s.id} id={s.slug} aria-labelledby={`cat-${s.slug}`} className="scroll-mt-56">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id={`cat-${s.slug}`} className="text-3xl text-carbon sm:text-4xl">
                  {s.nombre}
                </h2>
                <SourceBadge fuente={s.items[0]?.fuente ?? "supabase"} />
              </div>
              {s.nota ? <p className="mt-2 max-w-2xl text-sm text-carbon-muted">{s.nota}</p> : null}
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {s.items.map((item, i) => (
                  <ProductoCard
                    key={item.id}
                    item={item}
                    cart={cart}
                    onOpen={(origen) => setDetalle({ seccion: s.slug, index: i, origen })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {detalle && seccionDetalle ? (
        <ProductoDetalle
          items={seccionDetalle.items}
          index={Math.min(detalle.index, seccionDetalle.items.length - 1)}
          seccion={seccionDetalle.nombre}
          origen={detalle.origen}
          cart={cart}
          onClose={() => setDetalle(null)}
          onNavigate={(index) => setDetalle((d) => (d ? { ...d, index, origen: null } : d))}
        />
      ) : null}

      {alergenosAbierto ? (
        <FiltroAlergenos
          seleccion={filtros.sinAlergenos}
          onChange={(sinAlergenos: Set<AlergenoKey>) => set({ sinAlergenos })}
          onClose={() => setAlergenosAbierto(false)}
        />
      ) : null}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  icon,
  editorial,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  icon?: "sunrise" | "sun" | "sunset";
  editorial: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 border border-carbon/20 bg-white px-3.5 text-sm font-medium text-carbon transition-colors hover:border-carbon/40 aria-pressed:border-carbon aria-pressed:bg-carbon aria-pressed:text-crema ${
        editorial ? "rounded-md" : "rounded-full"
      }`}
    >
      {icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
