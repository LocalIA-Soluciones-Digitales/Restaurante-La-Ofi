import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/** Secciones de vino de la carta (vinos-blancos, vinos-tintos, cavas-champagnes…): van en la carta de vinos. */
export const esSeccionDeVino = (s: Pick<CartaSeccion, "slug">) => /^(vinos|cavas)-/.test(s.slug);

/** Cada tipo con su título corto, como en una carta de vinos, y el color del vino para el punto. */
const TIPO: Record<string, { titulo: string; color: string }> = {
  "vinos-tintos": { titulo: "Tintos", color: "#8E2C3A" },
  "vinos-blancos": { titulo: "Blancos", color: "#E9D9A6" },
  "vinos-rosados": { titulo: "Rosados", color: "#E8A7A0" },
  "cavas-champagnes": { titulo: "Espumosos", color: "#F1E6C8" },
  "vinos-dulces": { titulo: "Dulces y generosos", color: "#C98A3F" },
};
const tipo = (s: CartaSeccion) => TIPO[s.slug] ?? { titulo: s.nombre, color: "#E2B98A" };

/** Lo que es la bodega, sin contar referencias: cambia con la carta. */
export const TEXTO_BODEGA =
  "Una selección de distintas denominaciones y variedades: de los blancos de Rueda y el txakoli a los cavas y champagnes. Precio por botella; pregúntanos por los vinos por copa.";

/** Tintos primero (cuando Carlos los pase), luego blancos, rosados, espumosos y dulces. */
const ORDEN = ["vinos-tintos", "vinos-blancos", "vinos-rosados", "cavas-champagnes", "vinos-dulces"];
const ordenar = (secciones: CartaSeccion[]) =>
  secciones.filter((s) => s.items.length > 0).sort((a, b) => (ORDEN.indexOf(a.slug) + 1 || 99) - (ORDEN.indexOf(b.slug) + 1 || 99));

/**
 * «D.O. Rueda · Verdejo 100 %» → { grupo: "D.O. Rueda", detalle: "Verdejo 100 %" }.
 * Si solo trae la denominación («D.O. Rioja»), es el grupo; si no, todo es detalle.
 */
function partes(descripcion: string | null): { grupo: string | null; detalle: string | null } {
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

const precio = (v: CartaItem) => (v.precioCentimos !== null ? formatCentimos(v.precioCentimos) : "—");

function Vino({ vino, conGrupo = false }: { vino: CartaItem; conGrupo?: boolean }) {
  const { grupo, detalle } = partes(vino.descripcion);
  const sub = conGrupo ? [grupo, detalle].filter(Boolean).join(" · ") : detalle;
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block font-display text-lg leading-snug text-crema">{vino.nombre}</span>
        {sub ? <span className="mt-0.5 block text-[0.8rem] leading-snug text-crema/55">{sub}</span> : null}
      </span>
      <span className="shrink-0 pt-0.5 font-display text-lg tabular-nums text-[#E2B98A]">{precio(vino)}</span>
    </li>
  );
}

/**
 * La carta de vinos: por tipos (tintos, blancos, rosados, espumosos, dulces) y,
 * dentro de cada uno, una tarjeta por denominación, repartidas en columnas. Arriba,
 * «Vinos de la casa» (los que Carlos marca con la estrella en /admin/carta) y una
 * barra fija para saltar de un tipo a otro.
 */
export function CartaBodega({ secciones, cabecera = true }: { secciones: CartaSeccion[]; cabecera?: boolean }) {
  const tipos = ordenar(secciones);
  if (tipos.length === 0) return null;
  const deLaCasa = tipos.flatMap((s) => s.items.filter((it) => it.destacado));

  return (
    <section id="la-bodega" aria-labelledby={cabecera ? "bodega-title" : "vinos-title"} className="scroll-mt-4 bg-carbon pb-16 text-crema sm:pb-24">
      {/* Saltos entre tipos, siempre a mano al bajar. */}
      <nav aria-label="Tipos de vino" className="sticky top-16 z-10 border-b border-crema/10 bg-carbon/90 backdrop-blur lg:top-[4.5rem]">
        <div className="container-wide flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {tipos.map((s) => (
            <a
              key={s.id}
              href={`#bodega-${s.slug}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-crema/15 px-4 text-sm font-semibold transition-colors hover:border-crema/50 hover:bg-crema/5"
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: tipo(s).color }} />
              {tipo(s).titulo}
              <span className="font-normal text-crema/45">{s.items.length}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="container-wide pt-12 sm:pt-16">
        {cabecera ? (
          <div className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="lg:col-span-7">
              <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
              <h2 id="bodega-title" className="mt-3 font-display text-[clamp(3rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
                Carta <em className="text-[#E2B98A]">de vinos</em>
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-crema/80 lg:col-span-5 lg:pb-3">{TEXTO_BODEGA}</p>
          </div>
        ) : null}

        {deLaCasa.length > 0 ? (
          <div className="mb-16 rounded-3xl bg-[#E2B98A]/[0.08] p-6 ring-1 ring-[#E2B98A]/30 sm:p-8">
            <p className="flex items-center gap-2 kicker text-[#E2B98A]">
              <Icon name="star" className="h-4 w-4" />
              Vinos de la casa
            </p>
            <p className="mt-1 text-sm text-crema/60">Los que elegimos para acompañar la carta.</p>
            <ul className="mt-3 grid gap-x-12 divide-y divide-crema/10 sm:grid-cols-2 sm:divide-y-0">
              {deLaCasa.map((v) => (
                <Vino key={v.id} vino={v} conGrupo />
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-20">
          {tipos.map((s) => (
            <section key={s.id} id={`bodega-${s.slug}`} aria-labelledby={`bodega-${s.slug}-titulo`} className="scroll-mt-36">
              <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-crema/15 pb-4">
                <h3 id={`bodega-${s.slug}-titulo`} className="flex items-center gap-4 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] font-light leading-none">
                  <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full ring-4 ring-crema/5" style={{ background: tipo(s).color }} />
                  {tipo(s).titulo}
                </h3>
                <p className="text-xs uppercase tracking-[0.16em] text-crema/45">
                  {s.items.length} {s.items.length === 1 ? "vino" : "vinos"} · {s.nota ?? "Precio por botella"}
                </p>
              </header>
              {/* Una tarjeta por denominación, en columnas que se reparten solas. */}
              <div className="mt-8 gap-6 [column-fill:_balance] md:columns-2 xl:columns-3">
                {porDenominacion(s.items).map((g) => (
                  <article key={g.grupo ?? "otros"} className="mb-6 break-inside-avoid rounded-3xl bg-crema/[0.035] px-6 pb-3 pt-5 ring-1 ring-crema/10">
                    <h4 className="kicker text-[#E2B98A]">{g.grupo ?? "Otras"}</h4>
                    <ul className="mt-1 divide-y divide-crema/10">
                      {g.vinos.map((v) => (
                        <Vino key={v.id} vino={v} />
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Al final de la carta, la entrada a la carta de vinos (/vinos): la vinoteca, qué
 * hay (por tipos) y un botón claro. Así la bodega no queda escondida bajo la carta.
 */
export function BodegaDestacada({ secciones, href }: { secciones: CartaSeccion[]; href: string }) {
  const tipos = ordenar(secciones);
  if (tipos.length === 0) return null;
  return (
    <section id="la-bodega" aria-labelledby="bodega-title" className="bg-carbon text-crema">
      <div className="grid lg:grid-cols-2">
        <div className="relative aspect-[3/2] overflow-hidden lg:aspect-auto lg:min-h-[34rem]">
          <Photo img="comedorPanoramica" sizes="(min-width: 1024px) 50vw, 100vw" mobileBelow={0} decorative />
        </div>
        <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
          <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
          <h2 id="bodega-title" className="mt-3 font-display text-[clamp(2.75rem,6vw,5rem)] font-light leading-[0.95] tracking-tight">
            Carta <em className="text-[#E2B98A]">de vinos</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-crema/80">{TEXTO_BODEGA}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {tipos.map((s) => (
              <li key={s.id} className="inline-flex items-center gap-2 rounded-full border border-crema/20 px-4 py-2 text-sm">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: tipo(s).color }} />
                {tipo(s).titulo}
              </li>
            ))}
          </ul>
          <Link href={href} className="btn mt-9 self-start bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
            <Icon name="wine" className="h-4 w-4" />
            Ver la carta de vinos
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
