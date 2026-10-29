import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/eventos/EventCard";
import { EventoPortada } from "@/components/eventos/EventoPortada";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { SectionRule } from "@/components/ui/SectionRule";
import { IS_DEMO } from "@/lib/env";
import { href, type Locale } from "@/lib/i18n";
import { getAgendaEventos } from "@/lib/restaurant/content";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import type { EventoView } from "@/lib/restaurant/types";
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

const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

/** Agrupa por mes («noviembre de 2026»), respetando el orden de llegada. */
function porMes(eventos: EventoView[]): [string, EventoView[]][] {
  const grupos = new Map<string, EventoView[]>();
  for (const e of eventos) {
    const mes = e.fecha ? MES.format(new Date(`${e.fecha.slice(0, 7)}-15T12:00:00Z`)) : "Fecha por anunciar";
    grupos.set(mes, [...(grupos.get(mes) ?? []), e]);
  }
  return [...grupos];
}

/**
 * Agenda de La Ofi: el evento que Carlos destaca (o el siguiente) a lo grande,
 * el resto del año por meses y, al final, lo ya celebrado este año.
 */
export default async function EventosPage({ params }: Params) {
  const { locale } = await params;
  const { proximos, pasados } = await getAgendaEventos();
  const destacado = proximos.find((e) => e.destacado) ?? proximos[0] ?? null;
  const resto = proximos.filter((e) => e !== destacado);
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
          <p className="mt-8 text-sm font-semibold text-carbon-muted">
            {proximos.length === 1 ? "1 evento en agenda" : `${proximos.length} eventos en agenda`}
          </p>
        ) : null}
      </PageHero>

      {destacado ? (
        <section aria-label="Próximo evento" className="relative overflow-hidden bg-noche py-16 text-crema sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-neon-deep/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brasa/25 blur-3xl" />
          <div className="relative">
            <EventoPortada evento={destacado} locale={locale} />
          </div>
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

      {resto.length > 0 ? (
        <section aria-labelledby="agenda-title" className="section bg-crema">
          <div className="container-wide">
            <SectionRule id="agenda-title" title="Lo que viene" aside={<span>Agenda {new Date().getFullYear()}</span>} />
            {porMes(resto).map(([mes, eventos]) => (
              <div key={mes} className="mt-12">
                <h3 className="flex items-center gap-4 font-display text-2xl text-carbon first-letter:uppercase">
                  {mes}
                  <span aria-hidden="true" className="h-px flex-1 bg-tinta-line" />
                  <span className="font-sans text-sm font-semibold normal-case text-carbon-muted">{eventos.length}</span>
                </h3>
                <ul className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
                  {eventos.map((e) => (
                    <li key={e.id}>
                      <EventCard evento={e} locale={locale} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
