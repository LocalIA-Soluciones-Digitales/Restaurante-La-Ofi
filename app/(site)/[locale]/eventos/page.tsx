import type { Metadata } from "next";
import { VIDEOS } from "@/lib/media";
import { IMAGES } from "@/lib/images";
import { EventCard } from "@/components/eventos/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { IS_DEMO } from "@/lib/env";
import type { Locale } from "@/lib/i18n";
import { getEventosContent } from "@/lib/restaurant/content";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/eventos",
    title: "Eventos",
    description:
      "Tardeos, partidos, música y celebraciones en La Ofi, en el Parque Tecnológico de Bizkaia (Derio).",
  });
}

export default async function EventosPage({ params }: Params) {
  const { locale } = await params;
  const state = await getEventosContent();
  const jsonLd =
    state.status === "real" && !IS_DEMO
      ? state.data
          .map(eventJsonLd)
          .filter((e): e is NonNullable<typeof e> => e !== null)
      : [];

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <PageHero
        id="eventos-title"
        momento="noche"
        eyebrow="Eventos"
        title="En La Ofi siempre pasa algo"
        lead="Un tardeo al mes en la terraza, partidos en pantalla grande y celebraciones a medida: bautizos, comuniones, postbodas o comidas de empresa."
        image={IMAGES.salonNoche}
        ambiente={VIDEOS.ambienteNeon}
        noche
      />
      <div className="container-wide pb-20 sm:pb-28">
        {state.status === "empty" ? (
          <EmptyState title="Próximamente" icon="calendar">
            Estamos preparando los próximos eventos. Síguenos en{" "}
            <a
              href={SITE.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold link-underline"
            >
              {SITE.instagram.handle}
            </a>{" "}
            para enterarte el primero.
          </EmptyState>
        ) : (
          <>
            <h2 className="sr-only">Próximos eventos</h2>
            <ul className="space-y-14">
              {state.data.map((evento) => (
                <li key={evento.id}>
                  <EventCard evento={evento} locale={locale} />
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-20 flex flex-col items-start justify-between gap-6 bg-marino-900 p-8 text-crema sm:flex-row sm:items-center sm:p-12">
          <div>
            <p className="t-h2">¿Organizas una celebración?</p>
            <p className="mt-2 max-w-xl text-crema/80">
              Menús concertados a medida en el comedor privado o en la terraza
              cubierta. Cuéntanos qué necesitas.
            </p>
          </div>
          <a
            href={SITE.phone.href}
            className="btn-light shrink-0"
          >
            <Icon name="phone" className="h-4 w-4" />
            Llamar
          </a>
        </div>
      </div>
    </>
  );
}
