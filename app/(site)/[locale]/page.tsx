import type { Metadata } from "next";
import { Declaracion } from "@/components/home/Declaracion";
import { EmpresasHome } from "@/components/home/EmpresasHome";
import { EspaciosPaneles } from "@/components/home/EspaciosPaneles";
import { LetrasScroll } from "@/components/home/LetrasScroll";
import { VentanaFija } from "@/components/home/VentanaFija";
import { IntroOfi } from "@/components/home/IntroOfi";
import { HoyEnLaOfi } from "@/components/home/HoyEnLaOfi";
import { PlatosQueApetecen } from "@/components/home/PlatosQueApetecen";
import { Ubicacion } from "@/components/home/Ubicacion";
import { getDictionary } from "@/i18n/dictionaries";
import { estadoAhora, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// El menú del día cambia a diario: se regenera como mucho cada 5 minutos.
export const revalidate = 3600;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...pageMetadata({ locale, path: "" }),
    title: { absolute: `${SITE.name} — Restaurante en Derio, Parque Tecnológico de Bizkaia` },
  };
}

/**
 * Home: pocas secciones y cada una con una sola idea. La imagen y el rótulo, una
 * frase, los espacios (paneles que se abren), el menú del día, los platos, las
 * dos puertas de empresas y celebraciones y cómo llegar.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [menu, carta, horario] = await Promise.all([getMenuDiaContent(), getCartaContent(), getHorario()]);
  const resuelto = resolverHorario(horario);


  return (
    <>
      <IntroOfi />
      <Declaracion />
      <LetrasScroll />
      <EspaciosPaneles locale={locale} />
      <HoyEnLaOfi locale={locale} menu={menu} horario={resuelto} />
      <PlatosQueApetecen locale={locale} carta={carta} />
      <VentanaFija locale={locale} />
      <EmpresasHome locale={locale} />
      <Ubicacion t={t} horario={resuelto} />
    </>
  );
}
