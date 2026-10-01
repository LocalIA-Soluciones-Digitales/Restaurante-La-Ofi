import type { Metadata } from "next";
import { IMAGES } from "@/lib/images";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaView } from "@/components/menu/CartaView";
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
        eyebrow="Carta"
        title="Nuestra carta"
        lead="Desayunos, pintxos, brasa y cocina de temporada. Pregunta por el pescado del día: depende del mercado."
        image={IMAGES.tostadaBurrata}
        compact
      />
      <div className="container-page py-10 sm:py-14">
        {state.status === "empty" ? (
          <EmptyState title="Carta en preparación" icon="utensils">
            Muy pronto podrás consultar aquí la carta completa con precios y alérgenos. Mientras tanto, llámanos al{" "}
            <a href={SITE.phone.href} className="font-semibold link-underline">
              {SITE.phone.display}
            </a>
            .
          </EmptyState>
        ) : (
          <CartaView secciones={state.data} />
        )}
        <div className="mt-16">
          <AllergenLegend />
        </div>
      </div>
    </>
  );
}
