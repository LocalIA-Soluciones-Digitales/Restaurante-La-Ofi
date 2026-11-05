"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";
import { ordenar, TEXTO_BODEGA, tipo } from "@/lib/vinos";

/**
 * «D.O. Rueda · Verdejo 100 %» → { grupo: "D.O. Rueda", detalle: "Verdejo 100 %" }.
 * Si solo trae la denominación («D.O. Rioja»), es el grupo; si no, todo es detalle.
 */
export function partes(descripcion: string | null): { grupo: string | null; detalle: string | null } {
  if (!descripcion) return { grupo: null, detalle: null };
  const i = descripcion.indexOf(" · ");
  if (i >= 0) return { grupo: descripcion.slice(0, i), detalle: descripcion.slice(i + 3) };
  return /^D\.?O\.?/i.test(descripcion) ? { grupo: descripcion, detalle: null } : { grupo: null, detalle: descripcion };
}

/** Los vinos de cada denominación juntos, en el orden en que aparece cada una en la carta. */
function porDenominacion(items: CartaItem[]) {
  const grupos = new Map<string, CartaItem[]>();
  for (const it of items) {
    const g = partes(it.descripcion).grupo ?? "";
    grupos.set(g, [...(grupos.get(g) ?? []), it]);
  }
  return [...grupos].map(([grupo, vinos]) => ({ grupo: grupo || null, vinos }));
}

/** Precio de carta impresa: «14» o «14,50», sin el símbolo en cada línea. */
/** Sin tildes ni mayúsculas, para buscar «albarino» y encontrar «Albariño». */
const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Los tipos con solo los vinos que casan con la búsqueda (nombre, uva o denominación). */
export function filtrar(tipos: CartaSeccion[], q: string): CartaSeccion[] {
  const palabras = normal(q).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return tipos;
  return tipos
    .map((s) => ({
      ...s,
      items: s.items.filter((v) => {
        const texto = normal(`${v.nombre} ${v.descripcion ?? ""} ${tipo(s).titulo}`);
        return palabras.every((w) => texto.includes(w));
      }),
    }))
    .filter((s) => s.items.length > 0);
}

const precio = (v: CartaItem) => (v.precioCentimos === null ? "—" : formatCentimos(v.precioCentimos).replace(/,00\s?€$/, "").replace(/\s?€$/, ""));

function Vino({ vino, conGrupo = false }: { vino: CartaItem; conGrupo?: boolean }) {
  const { grupo, detalle } = partes(vino.descripcion);
  const sub = conGrupo ? [grupo, detalle].filter(Boolean).join(" · ") : detalle;
  return (
    <li className="py-2.5">
      <p className="flex items-baseline justify-between gap-6">
        <span className="font-display text-[1.2rem] leading-tight text-carbon lg:text-[1.3rem]">{vino.nombre}</span>
        <span className="shrink-0 font-display text-[1.2rem] tabular-nums text-carbon">
          {precio(vino)}
          <span className="ml-0.5 text-[0.85rem] text-carbon-muted lg:hidden">€</span>
        </span>
      </p>
      {sub ? <p className="mt-0.5 font-display text-[0.92rem] italic leading-snug text-carbon-muted lg:text-[0.95rem]">{sub}</p> : null}
    </li>
  );
}

/**
 * La carta de vinos como una carta impresa: papel, tipografía y filetes, sin
 * recuadros. Cada tipo (tintos, blancos, rosados, espumosos, dulces) con su
 * título fijo a la izquierda y, a la derecha, las denominaciones a dos columnas.
 * Arriba, «Vinos de la casa» (los que Carlos marca con la estrella en /admin/carta).
 */
export function CartaBodega({ secciones, cabecera = true }: { secciones: CartaSeccion[]; cabecera?: boolean }) {
  const todos = useMemo(() => ordenar(secciones), [secciones]);
  const [q, setQ] = useState("");
  const buscando = q.trim().length > 0;
  const tipos = useMemo(() => filtrar(todos, q), [todos, q]);
  const [buscador, setBuscador] = useState(false);
  const [activo, setActivo] = useState<string | null>(null);

  // En el móvil, el tipo que se está leyendo queda marcado en la barra.
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setActivo(v.target.id.replace("bodega-", ""));
      },
      { rootMargin: "-160px 0px -55% 0px" },
    );
    document.querySelectorAll("section[id^='bodega-']").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tipos]);

  if (todos.length === 0) return null;
  const deLaCasa = buscando ? [] : tipos.flatMap((s) => s.items.filter((it) => it.destacado));
  const encontrados = tipos.reduce((n, s) => n + s.items.length, 0);

  return (
    <section id="la-bodega" aria-labelledby={cabecera ? "bodega-title" : "vinos-title"} className="scroll-mt-4 bg-[#F6F0E5] pb-20 text-carbon sm:pb-28">
      {/* Buscador e índice de tipos, fijos al bajar. */}
      <nav aria-label="Tipos de vino" className="sticky top-16 z-10 border-b border-tinta-line bg-[#F6F0E5]/92 backdrop-blur lg:top-[4.5rem]">
        <div className="container-wide flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-8">
          <label className={`relative lg:order-2 lg:ml-auto lg:block lg:w-80 ${buscador || buscando ? "block" : "hidden"}`}>
            <span className="sr-only">Buscar un vino</span>
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 60))}
              placeholder="Busca un vino, una uva o una D.O."
              autoFocus={buscador}
              className="h-11 w-full rounded-full border border-carbon/15 bg-white/70 pl-11 pr-4 text-[0.95rem] text-carbon placeholder:text-carbon-muted/80 focus:border-madera-oscura focus:bg-white focus:outline-none"
            />
          </label>
        <div className="flex items-center gap-2 lg:order-1">
          {/* Móvil: botones grandes de cada tipo, marcado el que se lee, y la lupa al final. */}
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-1.75rem),transparent)] [scrollbar-width:none] lg:hidden">
            {tipos.map((s) => (
              <a
                key={s.id}
                href={`#bodega-${s.slug}`}
                aria-current={activo === s.slug ? "true" : undefined}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/80 px-3.5 text-sm font-semibold text-carbon ring-1 ring-carbon/10 transition-colors aria-[current]:bg-carbon aria-[current]:text-crema aria-[current]:ring-carbon"
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-1 ring-black/5" style={{ background: tipo(s).color }} />
                {tipo(s).titulo}
                <span className="text-xs font-normal tabular-nums opacity-60">{s.items.length}</span>
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBuscador((b) => !b)}
            aria-expanded={buscador || buscando}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 ring-1 ring-carbon/10 aria-expanded:bg-carbon aria-expanded:text-crema lg:hidden"
          >
            <Icon name={buscador || buscando ? "close" : "search"} className="h-4 w-4" />
            <span className="sr-only">{buscador || buscando ? "Cerrar el buscador" : "Buscar un vino"}</span>
          </button>
          <div className="hidden gap-7 overflow-x-auto [scrollbar-width:none] lg:flex">
            {tipos.map((s) => (
              <a key={s.id} href={`#bodega-${s.slug}`} className="group inline-flex shrink-0 items-baseline gap-2 text-sm text-carbon-muted hover:text-carbon">
                <span aria-hidden="true" className="h-2 w-2 translate-y-[-1px] rounded-full" style={{ background: tipo(s).color }} />
                <span className="font-semibold text-carbon underline-offset-[6px] group-hover:underline">{tipo(s).titulo}</span>
                <span className="tabular-nums">{s.items.length}</span>
              </a>
            ))}
          </div>
        </div>
        </div>
      </nav>

      {buscando ? (
        <p role="status" className="container-wide pt-10 text-sm text-carbon-muted">
          {encontrados ? (
            <>
              {encontrados} {encontrados === 1 ? "vino" : "vinos"} para «{q.trim()}».{" "}
            </>
          ) : (
            <>No encontramos «{q.trim()}» en la carta: pregúntanos, puede que lo tengamos en bodega. </>
          )}
          <button type="button" onClick={() => setQ("")} className="font-semibold text-carbon underline underline-offset-4">
            Ver todos
          </button>
        </p>
      ) : null}

      <div className="container-wide">
        {cabecera ? (
          <div className="mx-auto max-w-3xl pt-20 text-center">
            <p className="kicker text-madera-oscura">Vinos · Cavas · Champagnes</p>
            <h2 id="bodega-title" className="mt-4 font-display text-[clamp(3rem,7vw,5.5rem)] font-light leading-[0.95] tracking-tight">
              Carta <em className="text-madera-oscura">de vinos</em>
            </h2>
            <p className="lead mx-auto mt-6">{TEXTO_BODEGA}</p>
          </div>
        ) : null}

        {deLaCasa.length > 0 ? (
          <div className="mx-auto max-w-3xl pt-12 text-center lg:pt-20">
            <p className="flex items-center justify-center gap-4 font-display text-[1.6rem] italic text-madera-oscura lg:text-2xl">
              <span aria-hidden="true" className="h-px w-12 bg-madera-oscura/40" />
              Vinos de la casa
              <span aria-hidden="true" className="h-px w-12 bg-madera-oscura/40" />
            </p>
            <p className="mt-2 text-sm text-carbon-muted">Los que elegimos para acompañar la carta.</p>
            <ul className="mt-5 grid gap-x-14 text-left sm:grid-cols-2 lg:mt-6">
              {deLaCasa.map((v) => (
                <Vino key={v.id} vino={v} conGrupo />
              ))}
            </ul>
          </div>
        ) : null}

        {tipos.map((s, n) => (
          <section
            key={s.id}
            id={`bodega-${s.slug}`}
            aria-labelledby={`bodega-${s.slug}-titulo`}
            className={`mt-4 grid scroll-mt-32 gap-7 border-tinta-line lg:mt-20 lg:scroll-mt-36 lg:grid-cols-12 lg:gap-14 lg:border-t lg:pt-14 ${n === 0 && deLaCasa.length === 0 ? "mt-9" : "border-t pt-9"}`}
          >
            {/* El tipo, fijo mientras se recorren sus vinos. */}
            <header className="lg:col-span-4">
              {/* Móvil: como en escritorio, el número, el tipo en cursiva y su filete de color. */}
              <div className="lg:hidden">
                <p className="flex items-baseline justify-between font-display text-sm tabular-nums text-carbon-muted">
                  {String(n + 1).padStart(2, "0")}
                  <span className="font-sans text-[0.68rem] uppercase tracking-[0.16em]">{s.items.length} vinos</span>
                </p>
                <p aria-hidden="true" className="mt-1 font-display text-[2.6rem] font-light italic leading-none tracking-tight">
                  {tipo(s).titulo}
                </p>
                <span aria-hidden="true" className="mt-4 block h-[3px] w-12 rounded-full" style={{ background: tipo(s).color }} />
                {tipo(s).nota ? <p className="mt-4 text-[0.95rem] leading-relaxed text-carbon-muted">{tipo(s).nota} Precio por botella.</p> : null}
              </div>
              <div className="lg:sticky lg:top-40">
                <p className="hidden font-display text-sm tabular-nums text-carbon-muted lg:block">{String(n + 1).padStart(2, "0")}</p>
                <h3
                  id={`bodega-${s.slug}-titulo`}
                  className="sr-only mt-2 font-display text-[clamp(3rem,5.5vw,4.75rem)] font-light italic leading-[0.95] tracking-tight lg:not-sr-only lg:block"
                >
                  {tipo(s).titulo}
                </h3>
                <span aria-hidden="true" className="mt-5 hidden h-[3px] w-14 rounded-full lg:block" style={{ background: tipo(s).color }} />
                {tipo(s).nota ? <p className="mt-5 hidden max-w-xs text-carbon-muted lg:block">{tipo(s).nota}</p> : null}
                <p className="mt-4 hidden text-xs uppercase tracking-[0.16em] text-carbon-muted lg:block">Precio por botella</p>
              </div>
            </header>

            {/* Las denominaciones a dos columnas, como en la carta impresa. */}
            <div className="gap-x-14 sm:columns-2 lg:col-span-8">
              {porDenominacion(s.items).map((g) => (
                <div
                  key={g.grupo ?? "otras"}
                  className="mb-8 break-inside-avoid lg:mb-9"
                >
                  <h4 className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-madera-oscura">
                    {g.grupo ?? "Otras"}
                    <span aria-hidden="true" className="h-px flex-1 bg-tinta-line" />
                  </h4>
                  <ul className="mt-1.5">
                    {g.vinos.map((v) => (
                      <Vino key={v.id} vino={v} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="mx-auto mt-16 max-w-2xl text-center text-sm text-carbon-muted">
          Precios en euros, IVA incluido. La disponibilidad de algunas referencias puede variar: pregúntanos.
        </p>
      </div>
    </section>
  );
}

/**
 * Al final de la carta, la entrada a la carta de vinos (/vinos): la vinoteca
 * entera, qué hay (por tipos) y un botón claro.
 */
export function BodegaDestacada({ secciones, href }: { secciones: CartaSeccion[]; href: string }) {
  const tipos = ordenar(secciones);
  if (tipos.length === 0) return null;
  return (
    <section id="la-bodega" aria-labelledby="bodega-title" className="bg-carbon py-16 text-crema sm:py-24">
      <div className="container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <figure className="lg:col-span-7">
          <div className="relative aspect-[3/2] overflow-hidden rounded-sm shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)]">
            <Photo img="comedorPanoramica" sizes="(min-width: 1024px) 55vw, 100vw" mobileBelow={0} decorative />
          </div>
        </figure>
        <div className="lg:col-span-5">
          <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
          <h2 id="bodega-title" className="mt-3 font-display text-[clamp(2.75rem,5vw,4.5rem)] font-light leading-[0.95] tracking-tight">
            Carta <em className="text-[#E2B98A]">de vinos</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-crema/80">{TEXTO_BODEGA}</p>
          <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-crema/70">
            {tipos.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: tipo(s).color }} />
                {tipo(s).titulo}
              </span>
            ))}
          </p>
          <Link href={href} className="btn mt-9 bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
            <Icon name="wine" className="h-4 w-4" />
            Ver la carta de vinos
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
