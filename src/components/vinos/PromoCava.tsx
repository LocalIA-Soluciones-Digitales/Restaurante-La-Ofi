import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CAVA_DE_REGALO } from "@/lib/lanzamiento";
import descorche from "../../../public/images/promo/cava-descorche.webp";

// La promoción de Navidad (CAVA_DE_REGALO): un cava de regalo con los encargos de vino de más
// de 50 €. La foto del descorche (imagen generada, ilustrativa) se mueve despacio, con un brillo
// dorado y burbujas que suben (CSS en globals.css, quieta con prefers-reduced-motion).
// Va en la portada, en /vinos y en la tienda de encargos.

const euros = (c: number) => `${c / 100} €`;

/** La foto del descorche, viva: zoom lento, brillo y burbujas. `className` fija el marco. */
function FotoCava({ className = "", sizes }: { className?: string; sizes: string }) {
  return (
    <div className={`cava relative isolate overflow-hidden ${className}`}>
      <Image src={descorche} alt="" fill sizes={sizes} placeholder="blur" className="cava-foto object-cover object-[50%_40%]" />
      <span aria-hidden="true" className="cava-brillo absolute inset-0" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="cava-burbuja absolute bottom-[38%] rounded-full border border-[#F6E3C2]/80"
          style={{ left: `${44 + ((i * 13) % 14)}%`, width: `${4 + (i % 3) * 2}px`, height: `${4 + (i % 3) * 2}px`, animationDelay: `${i * 0.55}s` }}
        />
      ))}
    </div>
  );
}

/**
 * El anuncio del cava. «banda»: sección oscura a todo el ancho (portada y /vinos).
 * «tarjeta»: compacta, para la cabecera de la tienda de encargos.
 */
export function PromoCava({ href, variante = "banda" }: { href?: string; variante?: "banda" | "tarjeta" }) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = euros(CAVA_DE_REGALO.masDeCentimos);

  if (variante === "tarjeta") {
    return (
      <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-3xl bg-[#14110d]/85 p-3 pr-5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-[#E2B98A]/40 backdrop-blur sm:gap-5">
        <FotoCava className="h-32 w-28 shrink-0 rounded-2xl sm:h-40 sm:w-32" sizes="128px" />
        <div className="min-w-0">
          <p className="kicker text-[0.65rem] text-[#E2B98A]">Regalo de Navidad</p>
          <p className="mt-1.5 font-display text-[1.6rem] font-light leading-[1.05] text-crema sm:text-[1.9rem]">
            Un cava <em className="text-[#E2B98A]">de regalo</em>
          </p>
          <p className="mt-1.5 text-sm leading-snug text-crema/75">
            Si tu encargo pasa de <b className="text-crema">{umbral}</b>, te lo llevas con tus vinos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="promo-cava" className="relative isolate overflow-hidden bg-[#14110d] text-crema">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_75%_50%,rgb(226_185_138/0.16),transparent_70%)]" />
      <div className="container-wide grid items-center gap-8 py-12 sm:py-16 md:grid-cols-12 md:gap-12 lg:py-20">
        <FotoCava
          className="aspect-[4/3] rounded-3xl shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] ring-1 ring-[#E2B98A]/20 md:order-2 md:col-span-5 md:aspect-[4/5]"
          sizes="(min-width: 768px) 40vw, 100vw"
        />
        <div className="md:order-1 md:col-span-7">
          <p className="kicker text-[#E2B98A]">Navidad · Encargos de vino para llevar</p>
          <h2 id="promo-cava" className="mt-4 font-display text-[clamp(2.75rem,6vw,5rem)] font-light leading-[0.95] tracking-tight">
            Un cava de regalo <em className="text-[#E2B98A]">para brindar</em>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-crema/80">
            Encarga tus vinos para las comidas y cenas de Navidad: si tu encargo pasa de <b className="text-crema">{umbral}</b>, te regalamos una botella de
            cava. La recoges con el resto en La Ofi.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {href ? (
              <Link href={href} className="btn bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
                <Icon name="gift" className="h-4 w-4" />
                Hacer mi encargo
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : null}
            <p className="text-sm text-crema/60">Al precio de la carta · Sin pago online</p>
          </div>
        </div>
      </div>
    </section>
  );
}
