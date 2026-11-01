import type { Metadata } from "next";
import Link from "next/link";
import { CartaBodega } from "@/components/carta/CartaBodega";
import { Photo } from "@/components/media/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { getCartaContent } from "@/lib/restaurant/content";
import { pageMetadata } from "@/lib/seo";
import { esSeccionDeVino, TEXTO_BODEGA } from "@/lib/vinos";
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
 * pasaba desapercibida): la vinoteca a todo el ancho con el título y debajo la carta
 * por tipos y denominaciones, con los vinos de la casa arriba.
 */
export default async function VinosPage({ params }: Params) {
  const { locale } = await params;
  const carta = await getCartaContent();
  const vinos = carta.status === "empty" ? [] : carta.data.filter((s) => s.items.length > 0 && esSeccionDeVino(s));

  return (
    <>
      {/* La vinoteca a todo el ancho; abajo se funde con el papel de la carta de vinos. */}
      <section aria-labelledby="vinos-title" data-header="light" className="relative isolate overflow-hidden bg-carbon pb-48 pt-36 text-crema sm:pb-64 lg:pt-48">
        <Photo img="comedorPanoramica" sizes="100vw" priority mobileBelow={0} decorative imgClassName="motion-safe:animate-kenburns" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-carbon/80 via-carbon/50 to-carbon/40" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#F6F0E5] sm:h-64" />
        <div className="container-wide relative flex flex-col items-center text-center">
          <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
          <h1 id="vinos-title" className="mt-4 font-display text-[clamp(3.5rem,8vw,7rem)] font-light leading-[0.95] tracking-tight drop-shadow-[0_4px_30px_rgb(0_0_0/0.35)]">
            Carta <em className="text-[#E2B98A]">de vinos</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-crema/85">{TEXTO_BODEGA}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#la-bodega" className="btn bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
              Ver los vinos
              <Icon name="chevronDown" className="h-4 w-4" />
            </a>
            <Link href={href(locale, "/carta")} className="btn border border-crema/40 px-6 text-crema hover:bg-crema hover:text-carbon">
              <Icon name="utensils" className="h-4 w-4" />
              La carta
            </Link>
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
