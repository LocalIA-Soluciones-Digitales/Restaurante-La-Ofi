import type { Metadata } from "next";
import Link from "next/link";
import { EspacioCard } from "@/components/home/EspacioCard";
import { PlanoEsquema } from "@/components/espacios/PlanoEsquema";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ESPACIOS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/espacios",
    title: "Espacios",
    description: "La barra, el comedor, El Despacho para reuniones de empresa y la terraza cubierta de La Ofi, en el Parque Tecnológico de Bizkaia.",
  });
}

export default async function EspaciosPage({ params }: Params) {
  const { locale } = await params;
  return (
    <>
      <PageHero
        id="espacios-title"
        eyebrow="Espacios"
        title="Cuatro sitios en uno"
        lead="De la barra del desayuno a la terraza del tardeo. Elige dónde: para comer, reunirte o celebrar."
        image={IMAGES.comedorRatan}
      />
      <div className="container-page py-16 sm:py-24">
        <h2 className="sr-only">Nuestros espacios</h2>
        <ul className="grid gap-6 md:grid-cols-2">
          {ESPACIOS.map((e) => (
            <li key={e.id} className="reveal">
              <EspacioCard espacio={e} locale={locale} tall />
            </li>
          ))}
        </ul>

        <section aria-labelledby="plano-title" className="mt-24 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="reveal">
            <SectionHeader
              id="plano-title"
              eyebrow="Plano"
              title="Dónde está cada cosa"
              lead="El comedor y la barra en el interior, El Despacho como sala privada y la terraza cubierta en el exterior."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href(locale, "/reservar")} className="btn-primary">
                <Icon name="calendar" className="h-4 w-4" />
                Reservar mesa
              </Link>
              <Link href={href(locale, "/empresas#contacto")} className="btn-secondary">
                <Icon name="briefcase" className="h-4 w-4" />
                Celebraciones y empresas
              </Link>
            </div>
          </div>
          <div className="reveal">
            <PlanoEsquema />
          </div>
        </section>
      </div>
    </>
  );
}
