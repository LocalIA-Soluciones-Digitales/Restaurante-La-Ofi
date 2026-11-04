"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { filtrar, partes } from "@/components/carta/CartaBodega";
import { Icon } from "@/components/ui/Icon";
import { Botellas, botellasTexto, useEncargoVinos } from "@/components/vinos/EncargoVinos";
import { formatCentimos } from "@/lib/format";
import { IMAGES_REALES } from "@/lib/images";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";
import { ordenar, tipo } from "@/lib/vinos";

// La tienda de encargos de vino (/vinos/encargar) es una pantalla aparte, como el paso de
// pedido de una tienda: su propia barra con «Volver a la carta» y los pasos, tipos de vino
// a la izquierda, la lista de vinos por filas en el centro y el encargo siempre a la vista a
// la derecha (en el móvil, una barra abajo). La carta de /vinos se queda para consultar.

const precio = (v: CartaItem) => (v.precioCentimos === null ? null : formatCentimos(v.precioCentimos).replace(/,00(\s?€)$/, "$1"));

const PASOS = ["Elige tus vinos", "Tus datos", "Recoges y pagas"] as const;

/** Una fila: nombre, D.O. y uva; el precio alineado y el «+» (o «− 2 +»). */
function Fila({ vino }: { vino: CartaItem }) {
  const e = useEncargoVinos();
  const n = e?.cantidad(vino.id) ?? 0;
  const { grupo, detalle } = partes(vino.descripcion);
  const p = precio(vino);
  return (
    <li className={`-mx-3 flex items-center gap-3 rounded-xl px-3 py-3.5 transition-colors duration-150 sm:gap-5 ${n ? "bg-white shadow-card" : "hover:bg-white/60"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[1.15rem] leading-snug text-carbon sm:text-[1.2rem]">{vino.nombre}</p>
        {grupo || detalle ? (
          <p className="mt-0.5 truncate text-[0.85rem] text-carbon-muted">
            {grupo ? <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-madera-oscura">{grupo}</span> : null}
            {grupo && detalle ? <span aria-hidden="true"> · </span> : null}
            {detalle}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-right font-display text-[1.15rem] tabular-nums sm:w-16 sm:text-[1.2rem]">
        {p ?? <span className="font-sans text-xs text-carbon-muted">Pregúntanos</span>}
      </p>
      <div className="flex w-[6.25rem] shrink-0 justify-end">
        <Botellas vino={vino} />
      </div>
    </li>
  );
}

/** El encargo a la vista (columna derecha en escritorio): líneas, total y «Continuar». */
function Resumen() {
  const e = useEncargoVinos();
  if (!e) return null;
  const { lineas, botellas, total, abrir } = e;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-tinta-line">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">Tu encargo</h2>
        {botellas ? <span className="text-sm text-carbon-muted">{botellasTexto(botellas)}</span> : null}
      </div>

      {lineas.length === 0 ? (
        <div className="py-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F6F0E5] text-madera-oscura">
            <Icon name="wine" className="h-5 w-5" />
          </span>
          <p className="mx-auto mt-3 max-w-[15rem] text-sm leading-relaxed text-carbon-muted">Pulsa «+» en los vinos que quieras llevarte y aparecerán aquí.</p>
        </div>
      ) : (
        <ul className="-mx-1 mt-3 max-h-[44vh] divide-y divide-tinta-line overflow-y-auto overscroll-contain px-1">
          {lineas.map(({ vino, cantidad }) => (
            <li key={vino.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[1.02rem] leading-tight">{vino.nombre}</p>
                <p className="mt-0.5 text-xs tabular-nums text-carbon-muted">{formatCentimos(cantidad * (vino.precioCentimos ?? 0))}</p>
              </div>
              <Botellas vino={vino} variante="panel" />
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-1 flex items-baseline justify-between border-t-2 border-carbon pt-4">
        <dt className="text-sm text-carbon-muted">Total, se paga al recoger</dt>
        <dd className="font-display text-[1.75rem] leading-none tabular-nums">{formatCentimos(total)}</dd>
      </dl>
      <button type="button" onClick={abrir} disabled={botellas === 0} className="btn mt-5 w-full bg-carbon text-crema hover:bg-[#1f1c18] disabled:cursor-not-allowed disabled:opacity-40">
        Continuar con mis datos
        <Icon name="arrow" className="h-4 w-4" />
      </button>

      <ul className="mt-5 grid gap-2 text-[0.8rem] leading-snug text-carbon-muted">
        <li className="flex gap-2.5">
          <Icon name="check" className="mt-px h-4 w-4 shrink-0 text-oliva" />
          Al precio de la carta. Sin pago online.
        </li>
        <li className="flex gap-2.5">
          <Icon name="whatsapp" className="mt-px h-4 w-4 shrink-0 text-oliva" />
          Te avisamos cuando esté listo.
        </li>
        <li className="flex gap-2.5">
          <Icon name="pin" className="mt-px h-4 w-4 shrink-0 text-oliva" />
          Recogida en {SITE.address.street}, {SITE.address.locality}.
        </li>
      </ul>
    </div>
  );
}

/** En el móvil, el encargo va en una barra abajo que abre el panel. */
function BarraMovil() {
  const e = useEncargoVinos();
  if (!e || !e.hidratado || e.botellas === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-tinta-line bg-[#F6F0E5]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur lg:hidden">
      <button type="button" onClick={e.abrir} className="flex h-14 w-full items-center gap-3 rounded-2xl bg-carbon pl-4 pr-3 text-crema animate-sheet-up hover:bg-[#1f1c18]">
        <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#E2B98A] px-2 text-sm font-semibold tabular-nums text-carbon">{e.botellas}</span>
        <span className="flex-1 text-left font-semibold">Ver mi encargo</span>
        <span className="font-display text-lg tabular-nums">{formatCentimos(e.total)}</span>
        <Icon name="chevronRight" className="h-5 w-5" />
      </button>
    </div>
  );
}

export function TiendaVinos({ secciones, cartaHref }: { secciones: CartaSeccion[]; cartaHref: string }) {
  const todos = useMemo(() => ordenar(secciones), [secciones]);
  const [q, setQ] = useState("");
  const visibles = useMemo(() => filtrar(todos, q), [todos, q]);
  const [activa, setActiva] = useState(todos[0]?.slug ?? "");
  const pantalla = useRef<HTMLDivElement>(null);
  const buscando = q.trim().length > 0;
  const encontrados = visibles.reduce((a, s) => a + s.items.length, 0);

  // Es otra pantalla: la de la web queda debajo, sin desplazarse.
  useEffect(() => {
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = antes;
    };
  }, []);

  // El tipo que se está viendo queda marcado en la navegación.
  useEffect(() => {
    const root = pantalla.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setActiva((v.target as HTMLElement).dataset.slug ?? "");
      },
      { root, rootMargin: "-140px 0px -55% 0px" },
    );
    root.querySelectorAll("[data-slug]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visibles]);

  const ir = (slug: string) => {
    setActiva(slug);
    pantalla.current?.querySelector(`[data-slug="${slug}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buscador = (
    <label className="relative block">
      <span className="sr-only">Buscar un vino</span>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value.slice(0, 60))}
        placeholder="Vino, uva o D.O."
        className="h-11 w-full rounded-xl border border-carbon/15 bg-white pl-10 pr-3 text-[0.95rem] placeholder:text-carbon-muted/80 focus:border-carbon focus:outline-none"
      />
    </label>
  );

  return (
    <div ref={pantalla} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#F6F0E5] text-carbon">
      {/* Barra propia de la pantalla: volver, título y en qué paso estás. */}
      <header className="sticky top-0 z-20 border-b border-tinta-line bg-[#F6F0E5]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
          <a
            href={cartaHref}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full pl-2.5 pr-4 text-sm font-semibold ring-1 ring-carbon/15 transition-colors hover:bg-white"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
            <span className="sm:hidden">Volver</span>
            <span className="hidden sm:inline">Volver a la carta</span>
          </a>
          <div className="min-w-0 flex-1 border-l border-tinta-line pl-3 sm:pl-5">
            <p className="truncate font-display text-lg leading-tight">Encargo de vinos</p>
            <p className="truncate text-xs text-carbon-muted">Para llevar · {SITE.name}</p>
          </div>
          <ol aria-label="Pasos del encargo" className="hidden items-center gap-2 text-sm md:flex">
            {PASOS.map((paso, i) => (
              <li key={paso} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true" className="h-px w-6 bg-carbon/20" /> : null}
                <span
                  aria-current={i === 0 ? "step" : undefined}
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${i === 0 ? "bg-carbon text-crema" : "text-carbon-muted ring-1 ring-carbon/25"}`}
                >
                  {i + 1}
                </span>
                <span className={i === 0 ? "font-semibold" : "text-carbon-muted"}>{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* Cabecera con la vinoteca del salón de La Ofi. */}
      <section className="relative isolate overflow-hidden bg-carbon text-crema">
        <Image
          src={IMAGES_REALES.comedorPanoramica.src}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="-z-10 object-cover object-[55%_80%] opacity-55"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-carbon via-carbon/85 to-carbon/30" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-carbon/70 to-transparent" />
        <div className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="kicker text-[#E2B98A]">Navidad · Encargos para llevar</p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-light leading-[0.98] tracking-tight">
            Elige tus vinos <em className="text-[#E2B98A]">para llevar</em>
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-crema/75 sm:mt-5 sm:text-lg">
            Las botellas de nuestra carta para tus comidas y cenas de Navidad. Te las dejamos preparadas y pasas a recogerlas por La Ofi cuando quieras, en nuestro horario.
          </p>
          <ul className="mt-6 grid gap-2.5 text-sm text-crema/85 sm:mt-8 sm:flex sm:flex-wrap sm:gap-x-7">
            <li className="flex items-center gap-2.5">
              <Icon name="tag" className="h-4 w-4 text-[#E2B98A]" />
              Al precio de la carta
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="whatsapp" className="h-4 w-4 text-[#E2B98A]" />
              Te avisamos cuando esté listo
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="bag" className="h-4 w-4 text-[#E2B98A]" />
              Pagas al recoger, sin pago online
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)_21rem] lg:gap-10 lg:px-8 xl:gap-14">
        {/* Tipos de vino (escritorio). */}
        <aside className="hidden lg:block">
          <div className="sticky top-16 pt-10">
            {buscador}
            <nav aria-label="Tipos de vino" className="mt-6">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Tipos de vino</p>
              <ul className="mt-2 grid gap-0.5">
                {visibles.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => ir(s.slug)}
                      aria-current={activa === s.slug ? "true" : undefined}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[0.95rem] text-carbon-muted transition-colors hover:bg-white/70 hover:text-carbon aria-[current]:bg-white aria-[current]:font-semibold aria-[current]:text-carbon aria-[current]:shadow-card"
                    >
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: tipo(s).color }} />
                      <span className="flex-1">{tipo(s).titulo}</span>
                      <span className="text-xs font-normal tabular-nums text-carbon-muted">{s.items.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <div className="min-w-0 pb-32 lg:pb-20">
          <div className="pt-6 lg:hidden">{buscador}</div>

          {/* Tipos de vino (móvil), fijos bajo la barra. */}
          <nav aria-label="Tipos de vino" className="sticky top-16 z-10 -mx-4 mt-4 border-b border-tinta-line bg-[#F6F0E5]/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-3 [scrollbar-width:none]">
              {visibles.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => ir(s.slug)}
                  aria-current={activa === s.slug ? "true" : undefined}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/70 px-3.5 text-sm ring-1 ring-carbon/10 aria-[current]:bg-carbon aria-[current]:text-crema aria-[current]:ring-carbon"
                >
                  {tipo(s).titulo}
                  <span className="text-xs tabular-nums opacity-60">{s.items.length}</span>
                </button>
              ))}
            </div>
          </nav>

          {buscando ? (
            <p role="status" className="pt-6 text-sm text-carbon-muted">
              {encontrados ? `${encontrados} ${encontrados === 1 ? "vino" : "vinos"} para «${q.trim()}».` : `No encontramos «${q.trim()}»: pregúntanos, puede que lo tengamos en bodega.`}
            </p>
          ) : null}

          {visibles.map((s) => (
            <section key={s.slug} data-slug={s.slug} aria-labelledby={`tienda-${s.slug}`} className="scroll-mt-32 pt-8 first-of-type:pt-6 lg:scroll-mt-20 lg:pt-10 lg:first-of-type:pt-10">
              <div className="flex items-end justify-between gap-4 border-b-2 border-carbon pb-2.5">
                <h2 id={`tienda-${s.slug}`} className="flex items-center gap-2.5 font-display text-2xl leading-none sm:text-[1.75rem]">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: tipo(s).color }} />
                  {tipo(s).titulo}
                </h2>
                <p className="hidden truncate text-sm text-carbon-muted sm:block">{tipo(s).nota}</p>
              </div>
              <ul className="mt-1.5 grid gap-0.5">
                {s.items.map((vino) => (
                  <Fila key={vino.id} vino={vino} />
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-12 text-sm text-carbon-muted">
            Precios por botella, IVA incluido: los mismos que en la carta. Si falta algún vino, te llamamos para buscar otro.
          </p>
        </div>

        {/* El encargo, siempre a la vista (escritorio). */}
        <aside aria-label="Tu encargo" className="hidden lg:block">
          <div className="sticky top-16 pt-10">
            <Resumen />
          </div>
        </aside>
      </div>

      <BarraMovil />
    </div>
  );
}
