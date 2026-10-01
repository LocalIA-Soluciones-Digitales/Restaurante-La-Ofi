import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { VINOS } from "@/lib/home-content";
import { IMAGES } from "@/lib/images";

/** Bodega: solo el dato publicado (98 referencias + txakoli Magalarte), sin lista inventada. */
export function Vinos() {
  return (
    <section aria-labelledby="vinos-title" className="cv-auto relative isolate overflow-hidden bg-[#1a0f12] py-20 text-crema sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-30">
        <Image src={IMAGES.rotuloNeon.src} alt="" fill sizes="100vw" className="parallax-soft object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0f12] via-[#1a0f12]/85 to-[#1a0f12]/40" />
      </div>
      <div className="container-page grid items-center gap-10 lg:grid-cols-2">
        <p className="reveal font-display font-semibold leading-none text-[#E8C9A8]" aria-hidden="true">
          <span className="block text-[clamp(8rem,28vw,20rem)] tracking-tighter">{VINOS.referencias}</span>
        </p>
        <div className="reveal">
          <p className="eyebrow flex items-center gap-2 text-[#E8C9A8]">
            <Icon name="wine" className="h-4 w-4" />
            La bodega
          </p>
          <h2 id="vinos-title" className="display-lg mt-4 text-crema">
            {VINOS.referencias} referencias de vino
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-crema/80">{VINOS.texto}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SourceBadge fuente={VINOS.fuente} />
            <span className="text-sm text-crema/60">Pide la carta de vinos en barra.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
