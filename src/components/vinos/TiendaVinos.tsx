"use client";

import { useMemo, useState } from "react";
import { filtrar, partes } from "@/components/carta/CartaBodega";
import { Icon } from "@/components/ui/Icon";
import { Botellas, useEncargoVinos } from "@/components/vinos/EncargoVinos";
import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";
import { ordenar, tipo } from "@/lib/vinos";

// La tienda de encargos de vino (/vinos/encargar), compuesta como la lista de precios de una
// vinoteca: la selección de la casa en una banda oscura y, por tipo, fichas sombreadas con
// nombre, D.O. y uva, precio y un «+» de contorno. Sin fotos. La carta de /vinos
// se queda solo para consultar.

const precio = (v: CartaItem) => (v.precioCentimos === null ? null : formatCentimos(v.precioCentimos).replace(/,00(\s?€)$/, "$1"));

/** «D.O. RUEDA · Verdejo 100 %», la línea pequeña bajo el nombre. */
function Origen({ vino, claro = false }: { vino: CartaItem; claro?: boolean }) {
  const { grupo, detalle } = partes(vino.descripcion);
  if (!grupo && !detalle) return null;
  return (
    <p className={`mt-1 text-[0.9rem] leading-snug ${claro ? "text-crema/60" : "text-carbon-muted"}`}>
      {grupo ? <span className={`block text-[0.66rem] font-semibold sm:inline uppercase tracking-[0.16em] ${claro ? "text-[#E2B98A]" : "text-madera-oscura"}`}>{grupo}</span> : null}
      {grupo && detalle ? (
        <span aria-hidden="true" className="mx-2 hidden opacity-50 sm:inline">
          ·
        </span>
      ) : null}
      {detalle ? <span className="font-display italic">{detalle.replace(/ %/g, " %")}</span> : null}
    </p>
  );
}

/**
 * Una ficha por vino, sombreada sobre el fondo (sin bordes ni fotos): nombre, D.O. y uva y,
 * abajo, el precio y el «+». Al encargarlo, la ficha se oscurece un punto y se marca.
 */
function Ficha({ vino, oscuro = false }: { vino: CartaItem; oscuro?: boolean }) {
  const e = useEncargoVinos();
  const n = e?.cantidad(vino.id) ?? 0;
  const p = precio(vino);
  const fondo = oscuro
    ? n
      ? "bg-white/[0.11] ring-1 ring-[#E2B98A]/60"
      : "bg-white/[0.05] hover:bg-white/[0.08]"
    : n
      ? "bg-[#EADFCB] ring-1 ring-madera-oscura/50"
      : "bg-[#EFE6D6] hover:bg-[#EADFCB]";
  return (
    <li className={`flex flex-col rounded-2xl p-5 transition-colors duration-200 sm:p-6 ${fondo}`}>
      <h3 className="font-display text-[1.5rem] leading-tight">{vino.nombre}</h3>
      <Origen vino={vino} claro={oscuro} />
      <div className="mt-auto flex items-center justify-between gap-4 pt-4 sm:pt-6">
        <p className="font-display text-[1.6rem] leading-none tabular-nums">
          {p ?? <span className="font-sans text-sm opacity-70">Pregúntanos</span>}
          {p ? <span className={`ml-2 font-sans text-[0.62rem] uppercase tracking-[0.16em] ${oscuro ? "text-crema/50" : "text-carbon-muted"}`}>la botella</span> : null}
        </p>
        <Botellas vino={vino} variante={oscuro ? "oscuro" : "tienda"} />
      </div>
    </li>
  );
}

/** La selección de la casa: una banda oscura, como la pizarra de recomendaciones de la barra. */
function Seleccion({ vinos }: { vinos: CartaItem[] }) {
  return (
    <section aria-labelledby="seleccion" className="bg-carbon text-crema">
      <div className="container-wide py-16 sm:py-20">
        <p className="kicker text-[#E2B98A]">Selección de la casa</p>
        <h2 id="seleccion" className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-light leading-none">
          Los que <em className="text-[#E2B98A]">recomendamos</em>
        </h2>
        <p className="mt-4 max-w-md text-crema/60">Los que elegimos para acompañar nuestra carta y los que más nos piden para llevar.</p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {vinos.map((vino) => (
            <Ficha key={vino.id} vino={vino} oscuro />
          ))}
        </ul>
      </div>
    </section>
  );
}

const PASOS = [
  { titulo: "Elige tus botellas", texto: "Pulsa «+» en los vinos que quieras llevarte." },
  { titulo: "Te avisamos", texto: "Por WhatsApp o teléfono, cuando esté listo." },
  { titulo: "Recoges y pagas", texto: "En La Ofi, al precio de la carta." },
] as const;

export function TiendaVinos({ secciones, cartaHref }: { secciones: CartaSeccion[]; cartaHref: string }) {
  const todos = useMemo(() => ordenar(secciones), [secciones]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [q, setQ] = useState("");
  const buscando = q.trim().length > 0;
  const visibles = useMemo(() => filtrar(todos, q).filter((s) => filtro === "todos" || s.slug === filtro), [todos, q, filtro]);
  const recomendados = filtro === "todos" && !buscando ? todos.flatMap((s) => s.items.filter((v) => v.destacado)) : [];
  const total = todos.reduce((a, s) => a + s.items.length, 0);
  const encontrados = visibles.reduce((a, s) => a + s.items.length, 0);

  return (
    <div className="bg-[#F6F0E5] pb-36 text-carbon">
      <header className="container-wide pb-14 pt-28 sm:pt-32 lg:pb-16 lg:pt-40">
        <a href={cartaHref} className="inline-flex items-center gap-2 text-sm text-carbon-muted transition-colors hover:text-carbon">
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          Carta de vinos
        </a>
        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-6">
            <p className="kicker text-madera-oscura">Navidad · Encargos para llevar</p>
            <h1 className="mt-4 font-display text-[clamp(2.75rem,6vw,4.75rem)] font-light leading-[0.95] tracking-tight">
              Encarga tus vinos <em className="text-madera-oscura">para llevar</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-carbon-muted">
              Elige las botellas para tus comidas y cenas de Navidad. Te las dejamos preparadas y pasas a recogerlas por La Ofi. Sin pago online.
            </p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3 lg:col-span-6">
            {PASOS.map((s, i) => (
              <li key={s.titulo} className="border-t border-carbon/70 pt-4">
                <span className="font-display text-sm text-madera-oscura">0{i + 1}</span>
                <p className="mt-2 font-display text-xl leading-tight">{s.titulo}</p>
                <p className="mt-1.5 text-[0.92rem] leading-relaxed text-carbon-muted">{s.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {recomendados.length ? <Seleccion vinos={recomendados} /> : null}

      {/* Tipos y buscador, fijos al bajar. */}
      <nav aria-label="Filtrar vinos" className="sticky top-16 z-10 border-b border-tinta-line bg-[#F6F0E5]/95 backdrop-blur lg:top-[4.5rem]">
        <div className="container-wide flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-8">
          <div className="-mx-1 flex gap-6 overflow-x-auto px-1 [scrollbar-width:none] sm:gap-8">
            {[{ slug: "todos", titulo: "Todos", n: total }, ...todos.map((s) => ({ slug: s.slug, titulo: tipo(s).titulo, n: s.items.length }))].map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={filtro === c.slug}
                onClick={() => setFiltro(c.slug)}
                className="relative inline-flex h-14 shrink-0 items-center gap-1 text-[0.95rem] text-carbon-muted transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-carbon after:transition-transform after:duration-200 hover:text-carbon aria-pressed:font-semibold aria-pressed:text-carbon aria-pressed:after:scale-x-100"
              >
                {c.titulo}
                <sup className="text-[0.65rem] font-normal tabular-nums opacity-60">{c.n}</sup>
              </button>
            ))}
          </div>
          <label className="relative mb-3 block lg:mb-0 lg:ml-auto lg:w-72">
            <span className="sr-only">Buscar un vino</span>
            <Icon name="search" className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value.slice(0, 60))}
              placeholder="Busca un vino, una uva o una D.O."
              className="h-10 w-full rounded-none border-b border-carbon/20 bg-transparent pl-7 pr-2 text-[0.95rem] placeholder:text-carbon-muted/80 focus:border-carbon focus:outline-none"
            />
          </label>
        </div>
      </nav>

      <div className="container-wide">
        {buscando ? (
          <p role="status" className="pt-10 text-sm text-carbon-muted">
            {encontrados ? `${encontrados} ${encontrados === 1 ? "vino" : "vinos"} para «${q.trim()}».` : `No encontramos «${q.trim()}»: pregúntanos, puede que lo tengamos en bodega.`}
          </p>
        ) : null}

        {visibles.map((s, i) => (
          <section key={s.id} aria-labelledby={`tienda-${s.slug}`} className="pt-16 lg:pt-20">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
              <div>
                <p className="font-display text-sm text-madera-oscura">0{i + 1}</p>
                <h2 id={`tienda-${s.slug}`} className="mt-2 font-display text-[clamp(2.25rem,4vw,3.25rem)] font-light leading-none">
                  {tipo(s).titulo}
                </h2>
              </div>
              <p className="max-w-md text-carbon-muted sm:text-right">
                {tipo(s).nota}
                <span className="mt-1 block text-xs uppercase tracking-[0.16em]">
                  {s.items.length} {s.items.length === 1 ? "referencia" : "referencias"}
                </span>
              </p>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {s.items.map((vino) => (
                <Ficha key={vino.id} vino={vino} />
              ))}
            </ul>
          </section>
        ))}

        <p className="mx-auto mt-20 max-w-2xl text-center text-sm text-carbon-muted">
          Precios por botella, IVA incluido: los mismos que en la carta. Si falta algún vino, te llamamos para buscar otro.
        </p>
      </div>
    </div>
  );
}
