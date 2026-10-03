import type { Metadata } from "next";
import { IMAGES } from "@/lib/images";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { IS_DEMO } from "@/lib/env";
import type { Locale } from "@/lib/i18n";
import { getCartaContent } from "@/lib/restaurant/content";
import { menuJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/carta",
    title: "Carta",
    description: "Carta de La Ofi en Derio: desayunos y tostadas, pintxos, cocina a la brasa y platos de temporada, con información de alérgenos.",
  });
}

export default async function CartaPage() {
  const state = await getCartaContent();

  return (
    <>
      {state.status === "real" && !IS_DEMO ? <JsonLd data={menuJsonLd(state.data)} /> : null}
      <PageHero
        id="carta-title"
        eyebrow="La carta"
        title="Masa madre por la mañana, brasa al mediodía"
        lead="Tostadas de 9:00 a 11:30, picoteo para compartir y carnes y pescados a la parrilla. El pescado, según mercado: pregúntanos qué ha llegado hoy."
        image={IMAGES.tostadaBurrata}
        compact
      />
      <div className="container-wide pb-16 pt-0 sm:pb-24">
        {state.status === "empty" ? (
          <EmptyState title="Carta en preparación" icon="utensils">
            Muy pronto podrás consultar aquí la carta completa con precios y alérgenos. Mientras tanto, llámanos al{" "}
            <a href={SITE.phone.href} className="font-semibold link-underline">
              {SITE.phone.display}
            </a>
            .
          </EmptyState>
        ) : (
          <CartaInteractiva secciones={state.data} />
        )}
        <div className="mt-16">
          <AllergenLegend />
        </div>
      </div>
    </>
  );
}
