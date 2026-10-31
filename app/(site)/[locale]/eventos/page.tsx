import type { Metadata } from "next";
import Link from "next/link";
import { AgendaMensual } from "@/components/eventos/AgendaMensual";
import { EventCard } from "@/components/eventos/EventCard";
import { EventoPortada } from "@/components/eventos/EventoPortada";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { SectionRule } from "@/components/ui/SectionRule";
import { IS_DEMO } from "@/lib/env";
import { hoyEnMadrid } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import { getAgendaEventos } from "@/lib/restaurant/content";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// La agenda cambia desde /admin (revalidación bajo demanda); además, una vez al día
// para que los eventos pasen solos de «próximos» a «celebrados».
export const revalidate = 86400;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/eventos",
    title: "Eventos",
    description:
      "Tardeos, música en directo, DJ y partidos en La Ofi: la agenda completa del año en el edificio 502 del Parque Tecnológico de Bizkaia.",
  });
}

/**
 * Agenda de La Ofi: el evento que Carlos destaca (o el siguiente) a lo grande,
 * debajo la agenda completa mes a mes (con calendario) y, al final, lo ya
 * celebrado este año.
 */
export default async function EventosPage({ params }: Params) {
  const { locale } = await params;
  const { proximos, pasados } = await getAgendaEventos();
  const destacado = proximos.find((e) => e.destacado) ?? proximos[0] ?? null;
  const jsonLd = IS_DEMO ? [] : proximos.map(eventJsonLd).filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}

      <PageHero
        id="eventos-title"
        eyebrow="Eventos"
        title="La agenda de La Ofi"
        lead="Tardeos, música en directo, DJ y partidos en pantalla grande. Todo lo que pasa en el 502 este año, con su programa y su cartel."
      >
        {proximos.length > 0 ? (
          <a href="#agenda" className="link-arrow mt-8 text-sm font-semibold">
            {proximos.length === 1 ? "1 evento en agenda" : `${proximos.length} eventos en agenda`} · Ver por meses
          </a>
        ) : null}
      </PageHero>

      {destacado ? (
        <section aria-label="Próximo evento" className="section bg-papel-2">
          <EventoPortada evento={destacado} locale={locale} />
        </section>
      ) : (
        <section className="section bg-papel-2">
          <div className="container-page max-w-2xl text-center">
            <Icon name="music" className="mx-auto h-8 w-8 text-brasa" />
            <h2 className="t-h2 mt-5 text-carbon">Estamos preparando la próxima</h2>
            <p className="lead mx-auto mt-4">
              En cuanto tengamos fecha la verás aquí. Mientras, lo contamos todo en Instagram.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className="btn-dark px-6">
                <Icon name="instagram" className="h-4 w-4" />
                {SITE.instagram.handle}
              </a>
              <Link href={href(locale, "/grupos")} className="btn-secondary px-6">
                Organizar un evento privado
              </Link>
            </div>
          </div>
        </section>
      )}

      {proximos.length > 0 ? (
        <section id="agenda" aria-labelledby="agenda-title" className="section scroll-mt-16 bg-crema">
          <div className="container-wide">
            <SectionRule id="agenda-title" title="Toda la agenda, mes a mes" aside={<span>Lo que viene</span>} />
            <p className="lead mt-6 max-w-2xl">Elige un mes y mira qué hay programado. Los días marcados en el calendario tienen evento.</p>
            <AgendaMensual eventos={proximos} hoy={hoyEnMadrid()} locale={locale} />
          </div>
        </section>
      ) : null}

      {pasados.length > 0 ? (
        <section aria-labelledby="celebrados-title" className="section bg-papel-2">
          <div className="container-wide">
            <SectionRule id="celebrados-title" title="Ya celebrados" aside={<span>Este año</span>} />
            <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
              {pasados.map((e) => (
                <li key={e.id}>
                  <EventCard evento={e} locale={locale} pasado />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="bg-marino-900 py-16 text-crema sm:py-20">
        <div className="container-wide flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="kicker text-ratan">Eventos privados</p>
            <p className="t-h2 mt-3 max-w-[22ch]">¿Quieres montar el tuyo en La Ofi?</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={href(locale, "/grupos#contacto")} className="btn-light">
              Pedir presupuesto
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <a href={SITE.phone.href} className="btn-ghost-light">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
