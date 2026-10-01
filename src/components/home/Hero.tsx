import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/media/HeroVideo";
import { Icon } from "@/components/ui/Icon";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { HERO_VIDEO } from "@/lib/media";
import { SITE } from "@/lib/site";

export function Hero({ locale, t }: { locale: Locale; t: Dictionary }) {
  const main = IMAGES.comedorRatan;
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-crema pt-[4.5rem]">
      <div aria-hidden="true" className="hex-pattern absolute inset-y-0 right-0 hidden w-1/2 opacity-60 lg:block" />
      <div className="container-page relative grid items-center gap-10 pb-12 pt-6 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-16">
        <div>
          <p className="eyebrow flex items-center gap-2 text-terracota">
            <Icon name="pin" className="h-4 w-4" />
            Derio · Parque Tecnológico de Bizkaia
          </p>
          <h1 id="hero-title" className="mt-5 text-carbon">
            <span className="block font-sans text-sm font-semibold uppercase tracking-[0.32em] text-carbon-muted sm:text-base">
              Restaurante
            </span>
            <span className="mt-1 block text-[clamp(4.2rem,17vw,9rem)] font-semibold leading-[0.88] tracking-tight text-marino">
              La Ofi
            </span>
          </h1>
          <p className="mt-6 font-display text-2xl italic text-terracota sm:text-3xl">{SITE.tagline}.</p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-carbon-muted">
            Del primer café con tostada de masa madre al tardeo en la terraza: pintxos, plato del día y cocina a la
            brasa con producto de temporada.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link href={href(locale, "/carta")} className="btn-primary">
              {t.cta.verCarta}
            </Link>
            <Link href={href(locale, "/menu-del-dia")} className="btn-secondary">
              {t.cta.verMenu}
            </Link>
            <a href={SITE.phone.href} className="btn-secondary">
              <Icon name="phone" className="h-4 w-4" />
              {t.cta.reservar}
            </a>
            <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <Icon name="pin" className="h-4 w-4" />
              {t.cta.comoLlegar}
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-arena shadow-lift sm:aspect-[5/4] lg:aspect-[4/5] lg:rounded-[2.75rem]">
            {HERO_VIDEO ? (
              <HeroVideo src={HERO_VIDEO.src} poster={HERO_VIDEO.poster} label={main.alt} />
            ) : (
              <Image
                src={main.src}
                alt={main.alt}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 576px, 100vw"
                className="object-cover lg:animate-kenburns"
              />
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/25 via-transparent to-transparent" />
          </div>

          <figure className="absolute -bottom-6 left-3 w-36 rotate-[-4deg] rounded-2xl bg-white p-2 shadow-lift sm:w-44 lg:-left-10 lg:bottom-10">
            <div className="relative aspect-square overflow-hidden rounded-xl">
              <Image src={IMAGES.tostadaBurrata.src} alt={IMAGES.tostadaBurrata.alt} fill sizes="176px" className="object-cover" />
            </div>
            <figcaption className="px-1 pb-1 pt-2 text-center font-display text-sm italic text-carbon">7 días, 8 tostadas</figcaption>
          </figure>

          <div className="absolute -right-2 -top-5 hidden w-40 rotate-[5deg] overflow-hidden rounded-2xl border-4 border-white shadow-lift sm:block lg:-right-6 lg:top-10 lg:w-48">
            <div className="relative aspect-[8/5]">
              <Image src={IMAGES.rotuloNeon.src} alt={IMAGES.rotuloNeon.alt} fill sizes="192px" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
