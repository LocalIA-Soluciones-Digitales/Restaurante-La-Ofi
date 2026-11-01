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
 * pasaba desapercibida): la vinoteca junto al título y debajo la bodega por
 * tipos y denominaciones, con los vinos de la casa arriba.
 */
export default async function VinosPage({ params }: Params) {
  const { locale } = await params;
  const carta = await getCartaContent();
  const vinos = carta.status === "empty" ? [] : carta.data.filter((s) => s.items.length > 0 && esSeccionDeVino(s));

  return (
    <>
      {/* La vinoteca del local a un lado y el título al otro: la foto, nítida y sin texto encima. */}
      <section aria-labelledby="vinos-title" data-header="light" className="bg-carbon text-crema">
        <div className="grid lg:min-h-[44rem] lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden lg:order-2 lg:aspect-auto">
            <Photo img="comedorPanoramica" sizes="(min-width: 1024px) 50vw, 100vw" priority mobileBelow={0} decorative />
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-carbon/70 to-transparent" />
          </div>
          <div className="flex flex-col justify-center px-6 pb-14 pt-10 sm:px-12 lg:px-16 lg:pb-20 lg:pt-36 xl:pl-[max(4rem,calc((100vw-90rem)/2+2.5rem))]">
            <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
            <h1 id="vinos-title" className="mt-4 font-display text-[clamp(3.25rem,7vw,6.5rem)] font-light leading-[0.95] tracking-tight">
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
