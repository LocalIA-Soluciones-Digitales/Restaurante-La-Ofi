import type { Metadata } from "next";
import { EmpresasHome } from "@/components/home/EmpresasHome";
import { EspaciosHome } from "@/components/home/EspaciosHome";
import { GaleriaTira } from "@/components/home/GaleriaTira";
import { HeroOfi } from "@/components/home/HeroOfi";
import { HoyEnLaOfi } from "@/components/home/HoyEnLaOfi";
import { LaBrasa } from "@/components/home/LaBrasa";
import { PlatosQueApetecen } from "@/components/home/PlatosQueApetecen";
import { UnDia } from "@/components/home/UnDia";
import { Ubicacion } from "@/components/home/Ubicacion";
import { getDictionary } from "@/i18n/dictionaries";
import { estadoAhora, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { franjaDelDia } from "@/lib/media";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
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

/**
 * Home: comida real arriba, lo útil del día justo debajo (abierto, menú, precio,
 * reservar, llegar) y después el restaurante contado con sus fotos.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [menu, carta, horario] = await Promise.all([getMenuDiaContent(), getCartaContent(), getHorario()]);
  const resuelto = resolverHorario(horario);

  return (
    <>
      <HeroOfi
        franjaInicial={franjaDelDia()}
        estadoInicial={estadoAhora(resuelto.semana)}
        semana={resuelto.semana}
        links={{ carta: href(locale, "/carta"), reservar: href(locale, "/reservar"), menu: href(locale, "#hoy") }}
        labels={{ verCarta: t.cta.verCarta, reservar: t.cta.reservarMesa }}
      />
      <HoyEnLaOfi locale={locale} menu={menu} horario={resuelto} />
      <PlatosQueApetecen locale={locale} carta={carta} />
      <UnDia />
      <LaBrasa locale={locale} />
      <EspaciosHome locale={locale} />
      <EmpresasHome locale={locale} />
      <GaleriaTira locale={locale} />
      <Ubicacion t={t} horario={resuelto} />
    </>
  );
}
