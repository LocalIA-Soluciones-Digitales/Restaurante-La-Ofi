import type { Metadata } from "next";
import { CartaPreview } from "@/components/home/CartaPreview";
import { EventosSection } from "@/components/home/EventosSection";
import { GaleriaSection } from "@/components/home/GaleriaSection";
import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { MenuHoy } from "@/components/home/MenuHoy";
import { Momentos } from "@/components/home/Momentos";
import { Tostadas } from "@/components/home/Tostadas";
import { Ubicacion } from "@/components/home/Ubicacion";
import { getDictionary } from "@/i18n/dictionaries";
import { resolverHorario } from "@/lib/horario";
import type { Locale } from "@/lib/i18n";
import { getCartaContent, getEventosContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// El menú del día cambia a diario: se regenera como mucho cada 5 minutos.
export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...pageMetadata({ locale, path: "" }),
    title: { absolute: `${SITE.name} — Restaurante en Derio, Parque Tecnológico de Bizkaia` },
  };
}

export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [menu, carta, eventos, horario] = await Promise.all([
    getMenuDiaContent(),
    getCartaContent(),
    getEventosContent(),
    getHorario(),
  ]);

  return (
    <>
      <Hero locale={locale} t={t} />
      <Intro />
      <Momentos locale={locale} />
      <MenuHoy locale={locale} t={t} state={menu} />
      <Tostadas />
      <CartaPreview locale={locale} t={t} state={carta} />
      <EventosSection locale={locale} t={t} state={eventos} />
      <GaleriaSection locale={locale} />
      <Ubicacion t={t} horario={resolverHorario(horario)} />
    </>
  );
}
