import type { Metadata } from "next";
import { EmpresasHome } from "@/components/home/EmpresasHome";
import { EspaciosHome } from "@/components/home/EspaciosHome";
import { HeroOfi } from "@/components/home/HeroOfi";
import { HoyEnLaOfi } from "@/components/home/HoyEnLaOfi";
import { LaBrasa } from "@/components/home/LaBrasa";
import { Manifiesto } from "@/components/home/Manifiesto";
import { ParaCadaMomento, type Momento } from "@/components/home/ParaCadaMomento";
import { PlatosQueApetecen } from "@/components/home/PlatosQueApetecen";
import { Presentacion } from "@/components/home/Presentacion";
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
 * Home: una imagen y el rótulo arriba; después el restaurante presentado en
 * texto, lo útil del día (abierto, menú, precio, reservar), los platos y el
 * local, y al final las dos puertas de empresas y celebraciones.
 */
export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [menu, carta, horario] = await Promise.all([getMenuDiaContent(), getCartaContent(), getHorario()]);
  const resuelto = resolverHorario(horario);

  const momentos: Momento[] = [
    { titulo: "Menú del día", texto: "Plato del día casero de lunes a viernes, con bebida, pan y postre.", href: href(locale, "/menu-del-dia"), img: "comedorRatan" },
    { titulo: "La carta", texto: "Tostadas de masa madre, entrantes, brasa y postres.", href: href(locale, "/carta"), img: "barra" },
    { titulo: "Comidas de empresa", texto: "El Despacho, pedidos de grupo y factura a nombre de tu empresa.", href: href(locale, "/empresas"), img: "despacho" },
    { titulo: "Eventos y celebraciones", texto: "Menús concertados para comidas de empresa y celebraciones familiares.", href: href(locale, "/eventos"), img: "salonNoche" },
    { titulo: "Los espacios", texto: "Comedor, barra, El Despacho y terraza cubierta.", href: href(locale, "/espacios"), img: "comedorPanoramica" },
    { titulo: "La galería", texto: "El local, los platos y el día a día en fotos.", href: href(locale, "/galeria"), img: "rotuloAguila" },
  ];

  return (
    <>
      <HeroOfi
        franjaInicial={franjaDelDia()}
        estadoInicial={estadoAhora(resuelto.semana)}
        semana={resuelto.semana}
        links={{ carta: href(locale, "/carta"), reservar: href(locale, "/reservar"), menu: href(locale, "#hoy") }}
        labels={{ verCarta: t.cta.verCarta, reservar: t.cta.reservarMesa }}
      />
      <Presentacion locale={locale} />
      <HoyEnLaOfi locale={locale} menu={menu} horario={resuelto} />
      <PlatosQueApetecen locale={locale} carta={carta} />
      <Manifiesto />
      <LaBrasa locale={locale} />
      <EspaciosHome locale={locale} />
      <ParaCadaMomento items={momentos} />
      <EmpresasHome locale={locale} />
      <Ubicacion t={t} horario={resuelto} />
    </>
  );
}
