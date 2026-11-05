import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CAVA_DE_REGALO } from "@/lib/lanzamiento";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { esSeccionDeVino, ordenar, tipo } from "@/lib/vinos";
import descorche from "../../../public/images/promo/cava-descorche.webp";

// Los encargos de vino en la portada (Navidad): qué es (la bodega para llevar), qué hay
// (los tipos de la carta con sus referencias), cómo funciona (tres pasos) y, sobre la foto
// del descorche, el cava de regalo. Sale del negro en que se apaga el menú del día
// (HoyEnLaOfi fundidoAbajo) y se despide hacia el crema de los platos.

const PASOS = [
  { titulo: "Eliges", texto: "tus botellas en la web" },
  { titulo: "Preparamos", texto: "y te avisamos" },
  { titulo: "Recoges", texto: "y pagas en La Ofi" },
];

export function EncargosVinoHome({
  carta,
  encargarHref,
  vinosHref,
}: {
  carta: ContentState<CartaSeccion[]>;
  encargarHref: string;
  vinosHref: string;
}) {
  const secciones =
    carta.status === "empty" ? [] : ordenar(carta.data.filter(esSeccionDeVino));
  const umbral = CAVA_DE_REGALO
    ? `${CAVA_DE_REGALO.masDeCentimos / 100} €`
    : null;

  return (
    <section
      aria-labelledby="encargos-vino"
      className="relative isolate overflow-hidden bg-[#0f0d0a] pb-40 text-crema sm:pb-56"
    >
      {/* Halo cálido detrás de la botella. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_185_138/0.16),rgb(226_185_138/0.05)_55%,transparent)] lg:left-auto lg:right-[max(2%,calc((100vw-90rem)/2+6rem))] lg:top-8 lg:h-[46rem] lg:w-[46rem] lg:translate-x-0"
      />

      <div className="container-wide grid gap-y-10 lg:grid-cols-12 lg:items-center lg:gap-x-12">
        {/* La foto y el regalo: arriba en el móvil, a la derecha en escritorio. */}
        <div className="relative lg:order-2 lg:col-span-6 lg:col-start-7">
          <div
            aria-hidden="true"
            className="cava cava-mascara-banda relative -mx-4 h-[26rem] overflow-hidden sm:mx-auto sm:h-[34rem] sm:max-w-xl lg:h-[44rem] lg:max-w-none"
          >
            <Image
              src={descorche}
              alt=""
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              placeholder="blur"
              className="cava-foto object-cover object-[55%_45%]"
            />
          </div>
          <div
            aria-hidden="true"
            className="burbujas pointer-events-none absolute inset-x-0 bottom-[40%] top-[10%] mx-auto max-w-xl lg:max-w-none"
          >
            {BURBUJAS.map(([x, t, d, s], n) => (
              <span
                key={n}
                style={{
                  left: `${x}%`,
                  animationDelay: `${t}s`,
                  animationDuration: `${d}s`,
                  width: s,
                  height: s,
                }}
              />
            ))}
          </div>

          {umbral ? (
            <div className="relative -mt-24 flex justify-center sm:-mt-28 lg:absolute lg:bottom-16 lg:left-0 lg:mt-0 lg:block">
              <div className="flex max-w-[22rem] items-center gap-4 rounded-2xl bg-[#14110d]/75 p-4 pr-6 ring-1 ring-[#E2B98A]/35 backdrop-blur-md shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)] sm:p-5 sm:pr-7">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E2B98A] text-carbon">
                  <Icon name="gift" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#E2B98A]">
                    Regalo de Navidad
                  </p>
                  <p className="mt-1 font-display text-[1.6rem] font-light leading-[1.05]">
                    Un cava <em className="text-[#E2B98A]">de regalo</em>
                  </p>
                  <p className="mt-1 text-sm leading-snug text-crema/65">
                    Con tu encargo de más de{" "}
                    <span className="text-crema">{umbral}</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="lg:order-1 lg:col-span-6 lg:py-16">
          <p className="flex items-center gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-[#E2B98A]">
            <span aria-hidden="true" className="h-px w-10 bg-[#E2B98A]/60" />
            Navidad · Encargos de vino
          </p>
          <h2
            id="encargos-vino"
            className="mt-6 font-display text-[clamp(2.9rem,5.6vw,5.25rem)] font-light leading-[0.94] tracking-tight"
          >
            Nuestra bodega,
            <br />
            <em className="bg-gradient-to-r from-[#F1D3A8] via-[#E2B98A] to-[#B98B58] bg-clip-text pr-2 text-transparent">
              para tu mesa
            </em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-crema/75">
            Encarga las botellas de nuestra carta de vinos para las comidas y
            cenas de Navidad, al mismo precio que en el restaurante. Te las
            dejamos preparadas para que pases a recogerlas.
          </p>

          {/* Lo que hay en la carta, como el índice de una carta impresa. */}
          {secciones.length ? (
            <ul
              aria-label="En la carta de vinos"
              className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-crema/70"
            >
              {secciones.map((s) => {
                const t = tipo(s);
                return (
                  <li key={s.slug} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                      style={{ background: t.color }}
                    />
                    {t.titulo}
                    <span className="tabular-nums text-crema/40">
                      {s.items.length}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <ol className="mt-9 grid max-w-lg grid-cols-3 gap-4 sm:gap-6">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="border-t border-[#E2B98A]/30 pt-4">
                <p className="font-display text-sm tabular-nums text-[#E2B98A]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1.5 font-display text-xl leading-tight sm:text-2xl">
                  {p.titulo}
                </p>
                <p className="mt-1 text-[0.85rem] leading-snug text-crema/55 sm:text-sm">
                  {p.texto}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href={encargarHref}
              className="btn bg-[#E2B98A] px-7 text-carbon shadow-[0_10px_40px_-10px_rgb(226_185_138/0.6)] hover:bg-crema"
            >
              <Icon name="wine" className="h-4 w-4" />
              Hacer mi encargo
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link
              href={vinosHref}
              className="btn border border-crema/30 px-7 text-crema hover:border-crema hover:bg-crema hover:text-carbon"
            >
              Ver la carta de vinos
            </Link>
          </div>
          <p className="mt-4 text-sm text-crema/45">
            Sin pago online: pagas al recoger.
          </p>
        </div>
      </div>

      {/* Despedida hacia el crema de la sección de abajo, como la entrada del menú del día. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgb(250_245_236/0)_0%,rgb(250_245_236/0.06)_22%,rgb(250_245_236/0.28)_48%,rgb(250_245_236/0.7)_76%,#FAF5EC_100%)] sm:h-64"
      />
    </section>
  );
}

/** Burbujas que suben despacio sobre la foto: [izquierda %, retraso s, duración s, tamaño]. */
const BURBUJAS: [number, number, number, string][] = [
  [52, 0, 9, "5px"],
  [58, 2.5, 11, "3px"],
  [47, 4, 10, "4px"],
  [63, 1.2, 12, "6px"],
  [55, 6, 9.5, "3px"],
  [44, 7.5, 13, "5px"],
  [67, 3.6, 10.5, "4px"],
  [50, 9, 11.5, "3px"],
];
