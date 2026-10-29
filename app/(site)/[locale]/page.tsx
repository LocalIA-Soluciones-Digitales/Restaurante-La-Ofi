import type { Metadata } from "next";
import { Declaracion } from "@/components/home/Declaracion";
import { EmpresasHome } from "@/components/home/EmpresasHome";
import { EspaciosPaneles } from "@/components/home/EspaciosPaneles";
import { LetrasScroll } from "@/components/home/LetrasScroll";
import { IntroOfi } from "@/components/home/IntroOfi";
import { HoyEnLaOfi } from "@/components/home/HoyEnLaOfi";
import { PlatosQueApetecen } from "@/components/home/PlatosQueApetecen";
import { Ubicacion } from "@/components/home/Ubicacion";
import { getDictionary } from "@/i18n/dictionaries";
import { estadoAhora, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { getCierres, getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// El menú del día cambia a diario: se regenera como mucho cada 5 minutos.
// 5 min: el menú del día aparece a las 8:00 y desaparece a las 16:00 sin que nadie toque nada.
export const revalidate = 300;

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
  const [menu, carta, horario, cierres] = await Promise.all([getMenuDiaContent(), getCartaContent(), getHorario(), getCierres()]);
  const resuelto = resolverHorario(horario, cierres);


  return (
    <>
      <IntroOfi />
      <Declaracion />
      <LetrasScroll />
      <EspaciosPaneles locale={locale} />
      <HoyEnLaOfi locale={locale} menu={menu} horario={resuelto} fundido />
      <PlatosQueApetecen locale={locale} carta={carta} />
      <EmpresasHome locale={locale} />
      <Ubicacion t={t} horario={resuelto} />
    </>
  );
}
