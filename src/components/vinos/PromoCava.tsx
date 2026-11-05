import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { CAVA_DE_REGALO } from "@/lib/lanzamiento";
import descorche from "../../../public/images/promo/cava-descorche.webp";

// La promoción de Navidad (CAVA_DE_REGALO): un cava de regalo con los encargos de vino de más
// de 50 €. Como un anuncio editorial: la foto del descorche (imagen generada, ilustrativa) a
// sangre, fundida con el fondo, y solo un zoom muy lento (globals.css, quieto con
// prefers-reduced-motion). Va en /vinos y en la tienda de encargos; en la portada, dentro de
// EncargosVinoHome.

const euros = (c: number) => `${c / 100} €`;

/**
 * El anuncio del cava. «integrado»: bajo los pasos de /vinos.
 * «tarjeta»: compacta, para la cabecera de la tienda de encargos.
 */
export function PromoCava({ variante }: { variante: "tarjeta" | "integrado" }) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = euros(CAVA_DE_REGALO.masDeCentimos);

  // «integrado»: en /vinos, bajo los pasos de «cómo encargar». Sin tarjeta: el
  // texto va sobre el papel y la foto se funde con él (.cava-mascara en globals.css); en el móvil, la foto arriba.
  if (variante === "integrado") {
    return (
      <aside
        aria-labelledby="promo-cava"
        className="relative isolate sm:min-h-[17rem] lg:min-h-[19rem]"
      >
        <div
          aria-hidden="true"
          className="cava cava-mascara relative -mx-4 -z-10 h-64 overflow-hidden sm:absolute sm:inset-y-[-2.5rem] sm:right-0 sm:mx-0 sm:h-auto sm:w-[64%] lg:right-[-2rem]"
        >
          <Image
            src={descorche}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 60vw, 100vw"
            placeholder="blur"
            className="cava-foto object-cover object-[50%_58%]"
          />
        </div>
        <div className="-mt-4 flex max-w-[23rem] flex-col justify-center sm:mt-0 sm:min-h-[17rem] lg:min-h-[19rem]">
          <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-madera-oscura">
            <Icon name="gift" className="h-4 w-4" />
            Regalo de Navidad
          </p>
          <h3
            id="promo-cava"
            className="mt-3 font-display text-[clamp(2.25rem,3.4vw,3.25rem)] font-light leading-[0.95] tracking-tight sm:whitespace-nowrap"
          >
            Un cava <em className="text-madera-oscura">de regalo</em>
          </h3>
          <p className="mt-4 leading-relaxed text-carbon-muted">
            Con tu encargo de más de{" "}
            <b className="font-semibold text-carbon">{umbral}</b>, te regalamos
            una botella de cava para brindar en casa.
          </p>
          <p className="mt-5 flex items-baseline gap-3 font-display text-carbon">
            <span className="text-3xl font-light tabular-nums">+{umbral}</span>
            <span
              aria-hidden="true"
              className="h-px w-8 self-center bg-carbon/30"
            />
            <span className="text-3xl font-light">
              1 <em className="text-madera-oscura">cava</em>
            </span>
          </p>
        </div>
      </aside>
    );
  }

  return (
    <div className="relative isolate flex items-stretch overflow-hidden rounded-2xl bg-[#14110d]/90 ring-1 ring-white/10 backdrop-blur">
      <div className="relative w-28 shrink-0 overflow-hidden sm:w-36">
        <Image
          src={descorche}
          alt=""
          fill
          sizes="144px"
          placeholder="blur"
          className="object-cover object-[50%_35%]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#14110d]/90"
        />
      </div>
      <div className="min-w-0 py-4 pl-4 pr-5 sm:py-5 sm:pl-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#E2B98A]">
          Regalo de Navidad
        </p>
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
