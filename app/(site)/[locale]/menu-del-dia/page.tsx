import type { Metadata } from "next";
import { IMAGES } from "@/lib/images";
import Link from "next/link";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { href, type Locale } from "@/lib/i18n";
import { getMenuDiaContent } from "@/lib/restaurant/content";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/menu-del-dia",
    title: "Menú del día",
    description: "Menú del día de La Ofi en Derio (Parque Tecnológico de Bizkaia): primeros, segundos y postre caseros, actualizados cada día.",
  });
}

export default async function MenuDelDiaPage({ params }: Params) {
  const { locale } = await params;
  const state = await getMenuDiaContent();

  return (
    <>
      <PageHero
        id="menu-dia-title"
        momento="mediodia"
        eyebrow="Menú del día"
        title="Hoy en La Ofi"
        lead="Cocina casera para el mediodía: ensalada, cuchara, pasta o arroz, carne, ave o pescado y postre de la casa."
        image={IMAGES.comedorRatan}
        compact
      />
      <div className="container-page grid gap-12 py-10 sm:py-14 lg:grid-cols-[1.4fr_0.6fr]">
        <MenuDelDia state={state} detalle headingLevel="h2" />
        <aside className="space-y-4">
          <div className="rounded-[1.75rem] bg-marino p-6 text-crema">
            <p className="font-display text-2xl">¿Venís en grupo?</p>
            <p className="mt-2 text-sm text-crema/80">Llámanos y os guardamos mesa en el comedor.</p>
            <a href={SITE.phone.href} className="btn mt-5 w-full bg-crema text-marino hover:bg-white">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
          </div>
          <Link href={href(locale, "/carta")} className="btn-secondary w-full">
            Ver la carta completa
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </aside>
      </div>
      <div className="container-page pb-16">
        <AllergenLegend />
      </div>
    </>
  );
}
