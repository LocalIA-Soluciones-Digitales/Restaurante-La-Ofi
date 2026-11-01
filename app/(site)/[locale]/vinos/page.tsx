import type { Metadata } from "next";
import Link from "next/link";
import { CartaBodega, esSeccionDeVino, TEXTO_BODEGA } from "@/components/carta/CartaBodega";
import { Photo } from "@/components/media/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { getCartaContent } from "@/lib/restaurant/content";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/vinos",
    title: "Carta de vinos",
    description: "La carta de vinos de La Ofi en Derio: blancos, rosados, cavas, champagnes y vinos dulces de distintas denominaciones, con precio por botella.",
  });
}

/**
 * La carta de vinos en su propia página (antes iba al final de la carta y
 * pasaba desapercibida): la vinoteca, entera, junto al título y debajo la carta
 * por tipos y denominaciones, con los vinos de la casa arriba.
 */
export default async function VinosPage({ params }: Params) {
  const { locale } = await params;
  const carta = await getCartaContent();
  const vinos = carta.status === "empty" ? [] : carta.data.filter((s) => s.items.length > 0 && esSeccionDeVino(s));

  return (
    <>
      {/* El título a un lado y la vinoteca del local al otro, entera y enmarcada. */}
      <section aria-labelledby="vinos-title" data-header="light" className="bg-carbon pb-16 pt-28 text-crema sm:pb-24 lg:pt-36">
        <div className="container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
            <h1 id="vinos-title" className="mt-4 font-display text-[clamp(3.25rem,6.5vw,6rem)] font-light leading-[0.95] tracking-tight">
              Carta <em className="text-[#E2B98A]">de vinos</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-crema/80">{TEXTO_BODEGA}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#la-bodega" className="btn bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
                Ver los vinos
                <Icon name="chevronDown" className="h-4 w-4" />
              </a>
              <Link href={href(locale, "/carta")} className="btn border border-crema/30 px-6 text-crema hover:bg-crema hover:text-carbon">
                <Icon name="utensils" className="h-4 w-4" />
                La carta
              </Link>
            </div>
          </div>
          <figure className="lg:col-span-7">
            <div className="relative aspect-[3/2] overflow-hidden rounded-sm shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)]">
              <Photo img="comedorPanoramica" sizes="(min-width: 1024px) 55vw, 100vw" priority mobileBelow={0} decorative />
            </div>
            <figcaption className="mt-3 text-xs text-crema/50">La vinoteca, en el centro del local.</figcaption>
          </figure>
        </div>
      </section>

      {vinos.length ? (
        <CartaBodega secciones={vinos} cabecera={false} />
      ) : (
        <div className="container-page max-w-2xl py-20">
          <EmptyState title="Carta de vinos en preparación" icon="wine">
            Muy pronto podrás consultarla aquí. Mientras tanto, pregúntanos en barra o llámanos al{" "}
            <a href={SITE.phone.href} className="font-semibold link-underline">
              {SITE.phone.display}
            </a>
            .
          </EmptyState>
        </div>
      )}
    </>
  );
}
