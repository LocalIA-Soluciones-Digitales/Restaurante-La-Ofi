import type { Metadata } from "next";
import { Empresas } from "@/components/home/Empresas";
import { Espacios } from "@/components/home/Espacios";
import { Especialidades } from "@/components/home/Especialidades";
import { EventosSection } from "@/components/home/EventosSection";
import { FinalCta } from "@/components/home/FinalCta";
import { GaleriaSection } from "@/components/home/GaleriaSection";
import { MenuHoy } from "@/components/home/MenuHoy";
import { ScrollStory, type Capitulo } from "@/components/home/ScrollStory";
import { TrustMarquee } from "@/components/home/TrustMarquee";
import { Ubicacion } from "@/components/home/Ubicacion";
import { VideoHero } from "@/components/home/VideoHero";
import { Vinos } from "@/components/home/Vinos";
import { VideoMoment } from "@/components/media/VideoMoment";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { getDictionary } from "@/i18n/dictionaries";
import { estadoAhora, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { franjaDelDia, VIDEOS } from "@/lib/media";
import { getEventosContent, getMenuDiaContent } from "@/lib/restaurant/content";
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

function capitulos(locale: Locale): Capitulo[] {
  const i = (k: keyof typeof IMAGES) => ({ src: IMAGES[k].src, alt: IMAGES[k].alt });
  return [
    {
      id: "desayunos",
      hora: "Desde las 7:30",
      titulo: "Desayunos y tostadas",
      texto: "Pan de masa madre, siete días y ocho tostadas: de la clásica con tomate a la de burrata con melocotón.",
      icon: "coffee",
      fondo: i("tostadaRevuelta"),
      video: VIDEOS.heroManana,
      ambiente: VIDEOS.ambienteVapor,
      plato: i("tostadaBurrata"),
      cta: { label: "Ver desayunos", href: href(locale, "/carta#desayunos") },
    },
    {
      id: "pintxos",
      hora: "Media mañana",
      titulo: "Pintxos de barra",
      texto: "La barra se llena desde primera hora: pintxos y tortillas para el café de media mañana.",
      icon: "utensils",
      fondo: i("barra"),
      video: VIDEOS.pintxos,
      ambiente: null,
      plato: null,
      cta: { label: "Pedir para recoger", href: href(locale, "/pedir") },
    },
    {
      id: "plato-del-dia",
      hora: "Mediodía",
      titulo: "Plato del día",
      texto: "De lunes a viernes, a elegir entre varias opciones caseras: ensalada, cuchara, pasta o arroz, carne o ave.",
      icon: "sun",
      fondo: i("comedorRatan"),
      video: VIDEOS.platoDia,
      ambiente: null,
      plato: null,
      cta: { label: "Ver el menú de hoy", href: href(locale, "/menu-del-dia") },
    },
    {
      id: "brasa",
      hora: "Comida",
      titulo: "A la brasa",
      texto: "Pescado según mercado, carnes, pulpo, puerros, pimientos y espárragos pasados por la parrilla.",
      icon: "flame",
      fondo: i("pulpoBrasa"),
      video: VIDEOS.brasa,
      ambiente: VIDEOS.ambienteBrasa,
      plato: i("pulpoBrasa"),
      cta: { label: "Ver la brasa", href: href(locale, "/carta#brasa") },
    },
    {
      id: "tardeo",
      hora: "Tarde",
      titulo: "Tardeo y terraza",
      texto: "Terraza cubierta, partidos en pantalla grande y un tardeo al mes. El neón se enciende y la tarde se alarga.",
      icon: "moon",
      fondo: i("terrazaNoche"),
      video: VIDEOS.heroNoche,
      ambiente: VIDEOS.ambienteNeon,
      plato: i("rotuloNeon"),
      cta: { label: "Próximos eventos", href: href(locale, "/eventos") },
      noche: true,
    },
  ];
}

export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [menu, eventos, horario] = await Promise.all([getMenuDiaContent(), getEventosContent(), getHorario()]);
  const resuelto = resolverHorario(horario);

  return (
    <>
      <VideoHero
        franjaInicial={franjaDelDia()}
        estadoInicial={estadoAhora(resuelto.semana)}
        semana={resuelto.semana}
        links={{ carta: href(locale, "/carta"), pedir: href(locale, "/pedir"), reservar: href(locale, "/reservar") }}
        labels={{ verCarta: t.cta.verCarta, pedir: t.cta.pedir, reservar: t.cta.reservar }}
      />
      <TrustMarquee />
      <ScrollStory capitulos={capitulos(locale)} />
      <MenuHoy locale={locale} t={t} state={menu} />
      <Especialidades locale={locale} />
      <VideoMoment
        id="brasa-title"
        video={VIDEOS.brasa}
        ambiente={VIDEOS.ambienteBrasa}
        poster={{ src: IMAGES.pulpoBrasa.src, alt: IMAGES.pulpoBrasa.alt, credit: IMAGES.pulpoBrasa.kind === "tercero" ? IMAGES.pulpoBrasa.credit : undefined }}
        eyebrow="La brasa"
        title={
          <>
            Fuego lento, <span className="italic text-ratan">producto de temporada</span>
          </>
        }
      >
        <p className="max-w-xl text-lg text-crema/80">
          Tomates, pimientos, huevos y carnes de los baserris de alrededor; pescado de mercado y verdura a la parrilla.
        </p>
        <SourceBadge fuente="prensa" />
      </VideoMoment>
      <Espacios locale={locale} />
      <Empresas locale={locale} />
      <EventosSection locale={locale} t={t} state={eventos} />
      <Vinos />
      <GaleriaSection locale={locale} />
      <Ubicacion t={t} horario={resuelto} />
      <FinalCta locale={locale} t={t} />
    </>
  );
}
