import { formatCentimos } from "@/lib/format";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

/** Secciones de vino de la carta (vinos-blancos, vinos-tintos, cavas-champagnes…): van en «La bodega». */
export const esSeccionDeVino = (s: Pick<CartaSeccion, "slug">) => /^(vinos|cavas)-/.test(s.slug);

/** Título corto de cada tipo, como en una carta de vinos. */
const TITULO: Record<string, string> = {
  "vinos-tintos": "Tintos",
  "vinos-blancos": "Blancos",
  "vinos-rosados": "Rosados",
  "cavas-champagnes": "Espumosos",
  "vinos-dulces": "Dulces y generosos",
};
/** Tintos primero (cuando Carlos los pase), luego blancos, rosados, espumosos y dulces. */
const ORDEN = ["vinos-tintos", "vinos-blancos", "vinos-rosados", "cavas-champagnes", "vinos-dulces"];

/** «D.O. Rueda · Verdejo 100 %» → { grupo: "D.O. Rueda", detalle: "Verdejo 100 %" }. Sin «·», todo es detalle. */
function partes(descripcion: string | null): { grupo: string | null; detalle: string | null } {
  if (!descripcion) return { grupo: null, detalle: null };
  const i = descripcion.indexOf(" · ");
  return i < 0 ? { grupo: null, detalle: descripcion } : { grupo: descripcion.slice(0, i), detalle: descripcion.slice(i + 3) };
}

/** Vinos seguidos de la misma D.O. o región, en el orden de la carta impresa. */
function porDenominacion(items: CartaItem[]) {
  const grupos: { grupo: string | null; vinos: CartaItem[] }[] = [];
  for (const it of items) {
    const { grupo } = partes(it.descripcion);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.grupo === grupo) ultimo.vinos.push(it);
    else grupos.push({ grupo, vinos: [it] });
  }
  return grupos;
}

function Vino({ vino, conGrupo = false }: { vino: CartaItem; conGrupo?: boolean }) {
  const { grupo, detalle } = partes(vino.descripcion);
  const sub = conGrupo ? [grupo, detalle].filter(Boolean).join(" · ") : detalle;
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 py-2">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="font-display text-lg leading-snug text-crema">{vino.nombre}</span>
        <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-0.3em] border-b border-dotted border-crema/25" />
      </span>
      <span className="font-display text-lg tabular-nums text-[#E2B98A]">{vino.precioCentimos !== null ? formatCentimos(vino.precioCentimos) : "—"}</span>
      {sub ? <span className="col-span-2 text-[0.8rem] leading-snug text-crema/60">{sub}</span> : null}
    </li>
  );
}

/**
 * «La bodega»: los vinos como una carta de vinos y no como platos con foto. Por
 * tipos (tintos, blancos, rosados, espumosos, dulces) y, dentro, por D.O. Arriba,
 * «Vinos de la casa»: los que Carlos marca con la estrella en /admin/carta.
 */
export function CartaBodega({ secciones }: { secciones: CartaSeccion[] }) {
  const tipos = secciones
    .filter((s) => s.items.length > 0)
    .sort((a, b) => (ORDEN.indexOf(a.slug) + 1 || 99) - (ORDEN.indexOf(b.slug) + 1 || 99));
  if (tipos.length === 0) return null;
  const deLaCasa = tipos.flatMap((s) => s.items.filter((it) => it.destacado));
  const referencias = tipos.reduce((n, s) => n + s.items.length, 0);

  return (
    <section id="la-bodega" aria-labelledby="bodega-title" className="scroll-mt-4 bg-carbon py-16 text-crema sm:py-24">
      <div className="container-wide">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-7">
            <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
            <h2 id="bodega-title" className="mt-3 font-display text-[clamp(3rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
              La bodega
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <p className="text-lg leading-relaxed text-crema/80">
              {referencias} referencias seleccionadas, de los blancos de Rueda y el txakoli a los champagnes. Precio por botella; pregúntanos por los vinos
              por copa y por el resto de la bodega.
            </p>
          </div>
        </div>

        {deLaCasa.length > 0 ? (
          <div className="mt-12 border border-[#E2B98A]/40 p-6 sm:p-8">
            <p className="kicker text-[#E2B98A]">Vinos de la casa</p>
            <p className="mt-1 text-sm text-crema/60">Los que elegimos para acompañar la carta.</p>
            <ul className="mt-4 grid gap-x-12 sm:grid-cols-2">
              {deLaCasa.map((v) => (
                <Vino key={v.id} vino={v} conGrupo />
              ))}
            </ul>
          </div>
        ) : null}

        {/* Índice de tipos: saltos dentro de la bodega. */}
        <nav aria-label="Tipos de vino" className="mt-12 flex flex-wrap gap-2">
          {tipos.map((s) => (
            <a key={s.id} href={`#bodega-${s.slug}`} className="min-h-11 rounded-full border border-crema/20 px-4 py-2.5 text-sm font-semibold hover:border-crema/60">
              {TITULO[s.slug] ?? s.nombre}
            </a>
          ))}
        </nav>

        <div className="mt-10 grid gap-x-16 gap-y-14 lg:grid-cols-2">
          {tipos.map((s) => (
            <div key={s.id} id={`bodega-${s.slug}`} className="scroll-mt-24">
              <h3 className="flex items-baseline justify-between gap-4 border-b border-crema/20 pb-3 font-display text-3xl">
                {TITULO[s.slug] ?? s.nombre}
                {s.nota ? <span className="font-sans text-xs font-normal uppercase tracking-wider text-crema/50">{s.nota}</span> : null}
              </h3>
              {porDenominacion(s.items).map((g, i) => (
                <div key={`${g.grupo}-${i}`} className="mt-5">
                  {g.grupo ? <p className="kicker text-[#E2B98A]/90">{g.grupo}</p> : null}
                  <ul className="mt-1">
                    {g.vinos.map((v) => (
                      <Vino key={v.id} vino={v} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
