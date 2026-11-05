import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CAVA_DE_REGALO } from "@/lib/lanzamiento";
import descorche from "../../../public/images/promo/cava-descorche.webp";

// La promoción de Navidad (CAVA_DE_REGALO): un cava de regalo con los encargos de vino de más
// de 50 €. Como un anuncio editorial: la foto del descorche (imagen generada, ilustrativa) a
// sangre, fundida con el oscuro, y solo un zoom muy lento (globals.css, quieto con
// prefers-reduced-motion). Va en la portada, en /vinos y en la tienda de encargos.

const euros = (c: number) => `${c / 100} €`;

/**
 * El anuncio del cava. «banda»: sección a todo el ancho (portada y /vinos).
 * «tarjeta»: compacta, para la cabecera de la tienda de encargos.
 */
export function PromoCava({ href, variante = "banda" }: { href?: string; variante?: "banda" | "tarjeta" | "integrado" }) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = euros(CAVA_DE_REGALO.masDeCentimos);

  // «integrado»: en /vinos, bajo los pasos de «cómo encargar». Sin tarjeta: el
  // texto va sobre el papel y la foto se funde con él (.cava-mascara en globals.css); en el móvil, la foto arriba.
  if (variante === "integrado") {
    return (
      <aside aria-labelledby="promo-cava" className="relative isolate sm:min-h-[17rem] lg:min-h-[19rem]">
        <div aria-hidden="true" className="cava cava-mascara relative -mx-4 -z-10 h-64 overflow-hidden sm:absolute sm:inset-y-[-2.5rem] sm:right-0 sm:mx-0 sm:h-auto sm:w-[64%] lg:right-[-2rem]">
          <Image src={descorche} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 60vw, 100vw" placeholder="blur" className="cava-foto object-cover object-[50%_58%]" />
        </div>
        <div className="-mt-4 flex max-w-[23rem] flex-col justify-center sm:mt-0 sm:min-h-[17rem] lg:min-h-[19rem]">
          <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-madera-oscura">
            <Icon name="gift" className="h-4 w-4" />
            Regalo de Navidad
          </p>
          <h3 id="promo-cava" className="mt-3 font-display text-[clamp(2.25rem,3.4vw,3.25rem)] font-light leading-[0.95] tracking-tight sm:whitespace-nowrap">
            Un cava <em className="text-madera-oscura">de regalo</em>
          </h3>
          <p className="mt-4 leading-relaxed text-carbon-muted">
            Con tu encargo de más de <b className="font-semibold text-carbon">{umbral}</b>, te regalamos una botella de cava para brindar en casa.
          </p>
          <p className="mt-5 flex items-baseline gap-3 font-display text-carbon">
            <span className="text-3xl font-light tabular-nums">+{umbral}</span>
            <span aria-hidden="true" className="h-px w-8 self-center bg-carbon/30" />
            <span className="text-3xl font-light">
              1 <em className="text-madera-oscura">cava</em>
            </span>
          </p>
        </div>
      </aside>
    );
  }

  if (variante === "tarjeta") {
    return (
      <div className="relative isolate flex items-stretch overflow-hidden rounded-2xl bg-[#14110d]/90 ring-1 ring-white/10 backdrop-blur">
        <div className="relative w-28 shrink-0 overflow-hidden sm:w-36">
          <Image src={descorche} alt="" fill sizes="144px" placeholder="blur" className="object-cover object-[50%_35%]" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#14110d]/90" />
        </div>
        <div className="min-w-0 py-4 pl-4 pr-5 sm:py-5 sm:pl-5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#E2B98A]">Regalo de Navidad</p>
          <p className="mt-2 font-display text-[1.55rem] font-light leading-[1.05] text-crema sm:text-[1.8rem]">
            Un cava <em className="text-[#E2B98A]">de regalo</em>
          </p>
          <p className="mt-2 text-sm leading-snug text-crema/70">
            Con tu encargo de más de <span className="text-crema">{umbral}</span>.
          </p>
        </div>
      </div>
    );
  }

  // «banda» (portada): sale del negro en que se apaga la foto del menú del día (HoyEnLaOfi
  // fundidoAbajo) y se despide hacia el crema de la sección de abajo. La foto no tiene bordes:
  // se funde por los cuatro lados (.cava-mascara-banda), con un halo dorado y unas burbujas.
  return (
    <section aria-labelledby="promo-cava" className="relative isolate overflow-hidden bg-[#0f0d0a] pb-40 text-crema sm:pb-56">
      {/* Halo cálido detrás de la botella. */}
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_185_138/0.16),rgb(226_185_138/0.05)_55%,transparent)] md:left-auto md:right-[max(4%,calc((100vw-90rem)/2+8rem))] md:top-1/2 md:h-[44rem] md:w-[44rem] md:-translate-y-[55%] md:translate-x-0" />

      <div className="relative md:absolute md:inset-y-0 md:right-[max(0px,calc((100vw-90rem)/2))] md:w-[min(60%,50rem)]">
        <div aria-hidden="true" className="cava cava-mascara-banda relative mx-auto h-[30rem] max-w-xl overflow-hidden sm:h-[36rem] md:absolute md:inset-x-0 md:top-0 md:bottom-24 md:h-auto md:max-w-none">
          <Image src={descorche} alt="" fill sizes="(min-width: 768px) 55vw, 100vw" placeholder="blur" className="cava-foto object-cover object-[55%_45%] md:object-[60%_55%]" />
        </div>
        <div aria-hidden="true" className="burbujas pointer-events-none absolute inset-x-0 bottom-[38%] top-[12%] mx-auto max-w-xl md:bottom-[30%] md:max-w-none">
          {BURBUJAS.map(([x, t, d, s], n) => (
            <span key={n} style={{ left: `${x}%`, animationDelay: `${t}s`, animationDuration: `${d}s`, width: s, height: s }} />
          ))}
        </div>
      </div>

      <div className="container-wide relative -mt-40 sm:-mt-48 md:mt-0 md:flex md:min-h-[46rem] md:items-center md:pb-10 md:pt-6">
        <div className="max-w-[34rem]">
          <p className="flex items-center gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-[#E2B98A]">
            <span aria-hidden="true" className="h-px w-10 bg-[#E2B98A]/60" />
            Navidad en La Ofi
          </p>
          <h2 id="promo-cava" className="mt-6 font-display text-[clamp(3.25rem,7vw,6.25rem)] font-light leading-[0.9] tracking-tight [text-shadow:0_2px_30px_rgb(15_13_10/0.8)]">
            Un cava
            <br />
            <em className="bg-gradient-to-r from-[#F1D3A8] via-[#E2B98A] to-[#B98B58] bg-clip-text pr-2 text-transparent [text-shadow:none]">de regalo</em>
          </h2>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-crema/75">
            Encarga tus vinos para las comidas y cenas de Navidad y brinda con nosotros: con tu encargo te llevas una botella de cava.
          </p>

          {/* La condición, como una etiqueta: el importe a un lado y el regalo al otro. */}
          <div className="mt-9 inline-flex items-stretch rounded-2xl bg-white/[0.04] ring-1 ring-[#E2B98A]/25 backdrop-blur-sm">
            <div className="px-5 py-4 sm:px-6">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-crema/55">Encargo de más de</p>
              <p className="mt-1 font-display text-[2.4rem] font-light leading-none tabular-nums">{umbral}</p>
            </div>
            <div aria-hidden="true" className="flex items-center text-[#E2B98A]/70">
              <Icon name="arrow" className="h-4 w-4" />
            </div>
            <div className="px-5 py-4 sm:px-6">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-crema/55">Te regalamos</p>
              <p className="mt-1 font-display text-[2.4rem] font-light leading-none">
                1 <em className="text-[#E2B98A]">cava</em>
              </p>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            {href ? (
              <Link href={href} className="btn bg-[#E2B98A] px-7 text-carbon shadow-[0_10px_40px_-10px_rgb(226_185_138/0.6)] hover:bg-crema">
                Hacer mi encargo
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : null}
            <p className="max-w-[16rem] text-sm leading-snug text-crema/55">Lo recoges y pagas en La Ofi, al precio de la carta.</p>
          </div>
        </div>
      </div>

      {/* Despedida hacia el crema de la sección de abajo, como la entrada del menú del día. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgb(250_245_236/0)_0%,rgb(250_245_236/0.06)_22%,rgb(250_245_236/0.28)_48%,rgb(250_245_236/0.7)_76%,#FAF5EC_100%)] sm:h-64" />
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
