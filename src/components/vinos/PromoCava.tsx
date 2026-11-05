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
export function PromoCava({ href, variante = "banda" }: { href?: string; variante?: "banda" | "tarjeta" | "panel" }) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = euros(CAVA_DE_REGALO.masDeCentimos);

  // «panel»: dentro de una sección clara (/vinos, tras «cómo encargar»), como una pieza
  // oscura con esquinas redondeadas: el regalo es el extra del encargo, no otra sección.
  if (variante === "panel") {
    return (
      <div className="cava relative isolate overflow-hidden rounded-3xl bg-[#0f0d0a] text-crema shadow-lift sm:rounded-[2rem]">
        <div className="relative h-56 overflow-hidden sm:h-72 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[48%]">
          <Image src={descorche} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" placeholder="blur" className="cava-foto object-cover object-[50%_40%] md:object-[50%_60%]" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0f0d0a] via-[#0f0d0a]/20 to-transparent md:bg-[linear-gradient(90deg,#0f0d0a_0%,rgb(15_13_10/0.55)_28%,transparent_60%)]" />
        </div>
        <div className="relative -mt-16 px-6 pb-8 sm:px-10 sm:pb-10 md:mt-0 md:max-w-[56%] md:py-14 md:pl-12 lg:py-16 lg:pl-16">
          <p className="flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#E2B98A]">
            <Icon name="gift" className="h-4 w-4" />
            Regalo de Navidad
          </p>
          <h3 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,4rem)] font-light leading-[0.95] tracking-tight">
            Un cava <em className="text-[#E2B98A]">de regalo</em>
          </h3>
          <p className="mt-4 max-w-md leading-relaxed text-crema/70 sm:text-lg">
            Con tu encargo de más de <span className="text-crema">{umbral}</span> te llevas una botella de cava para brindar con los tuyos.
          </p>
          <dl className="mt-7 grid max-w-sm grid-cols-2 border-y border-white/10">
            <div className="py-4 pr-5">
              <dt className="text-[0.64rem] uppercase tracking-[0.2em] text-crema/50">Encargo de más de</dt>
              <dd className="mt-1 font-display text-3xl font-light tabular-nums">{umbral}</dd>
            </div>
            <div className="border-l border-white/10 py-4 pl-5">
              <dt className="text-[0.64rem] uppercase tracking-[0.2em] text-crema/50">Te regalamos</dt>
              <dd className="mt-1 font-display text-3xl font-light">
                1 <em className="text-[#E2B98A]">cava</em>
              </dd>
            </div>
          </dl>
          {href ? (
            <Link href={href} className="btn mt-7 bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
              Hacer mi encargo
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
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

  return (
    <section aria-labelledby="promo-cava" className="relative isolate overflow-hidden bg-[#0f0d0a] text-crema">
      {/* La foto a sangre: arriba en el móvil, a la derecha en escritorio, fundida con el oscuro. */}
      <div className="cava relative h-[26rem] overflow-hidden sm:h-[32rem] md:absolute md:inset-y-0 md:right-[max(0px,calc((100vw-90rem)/2))] md:h-auto md:w-[min(58%,40rem)]">
        <Image src={descorche} alt="" fill sizes="(min-width: 768px) 60vw, 100vw" placeholder="blur" className="cava-foto object-cover object-[50%_38%] md:object-[50%_60%]" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0f0d0a] via-[#0f0d0a]/10 to-[#0f0d0a]/40 md:bg-[linear-gradient(90deg,#0f0d0a_0%,rgb(15_13_10/0.35)_30%,transparent_55%,rgb(15_13_10/0.85)_88%,#0f0d0a_100%)]" />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 hidden h-32 bg-gradient-to-b from-[#0f0d0a]/80 to-transparent md:block" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-[#0f0d0a]/80 to-transparent md:block" />
      </div>

      <div className="container-wide relative -mt-24 pb-16 sm:-mt-28 sm:pb-20 md:mt-0 md:flex md:min-h-[44rem] md:items-center md:py-24">
        <div className="max-w-xl">
          <p className="flex items-center gap-4 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-[#E2B98A]">
            <span aria-hidden="true" className="h-px w-10 bg-[#E2B98A]/60" />
            Navidad en La Ofi
          </p>
          <h2 id="promo-cava" className="mt-6 font-display text-[clamp(3rem,6.5vw,5.75rem)] font-light leading-[0.92] tracking-tight">
            Un cava
            <br />
            <em className="text-[#E2B98A]">de regalo</em>
          </h2>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-crema/70">
            Encarga tus vinos para las comidas y cenas de Navidad y brinda con nosotros: con tu encargo te llevas una botella de cava.
          </p>

          <dl className="mt-9 grid max-w-md grid-cols-2 border-y border-white/10">
            <div className="py-5 pr-6">
              <dt className="text-[0.68rem] uppercase tracking-[0.2em] text-crema/50">Encargo de más de</dt>
              <dd className="mt-1.5 font-display text-4xl font-light tabular-nums">{umbral}</dd>
            </div>
            <div className="border-l border-white/10 py-5 pl-6">
              <dt className="text-[0.68rem] uppercase tracking-[0.2em] text-crema/50">Te regalamos</dt>
              <dd className="mt-1.5 font-display text-4xl font-light">
                1 <em className="text-[#E2B98A]">cava</em>
              </dd>
            </div>
          </dl>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            {href ? (
              <Link href={href} className="btn bg-[#E2B98A] px-7 text-carbon hover:bg-crema">
                Hacer mi encargo
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : null}
            <p className="text-sm text-crema/50">Lo recoges y pagas en La Ofi, al precio de la carta.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
