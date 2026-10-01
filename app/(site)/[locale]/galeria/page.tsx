import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { GALLERY } from "@/lib/gallery";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/galeria",
    title: "Galería",
    description: "Fotos de La Ofi en Derio: la barra, el comedor de ratán y madera, la terraza cubierta y los platos de la casa.",
  });
}

export default function GaleriaPage() {
  return (
    <>
      <PageHero
        id="galeria-title"
        momento="tarde"
        eyebrow="Galería"
        title="La Ofi, por dentro"
        lead="La barra, el comedor, la terraza y lo que sale de cocina."
      >
        <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-8">
          <Icon name="instagram" className="h-4 w-4" />
          Más fotos en {SITE.instagram.handle}
        </a>
      </PageHero>
      <div className="container-page py-10 sm:py-14">
        <Gallery images={GALLERY} />
      </div>
    </>
  );
}
