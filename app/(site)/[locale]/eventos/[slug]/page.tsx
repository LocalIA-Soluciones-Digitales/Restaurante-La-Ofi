import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartelEvento } from "@/components/eventos/CartelEvento";
import { EventoPortada } from "@/components/eventos/EventoPortada";
import { horario } from "@/components/eventos/ProgramaEvento";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionRule } from "@/components/ui/SectionRule";
import { IS_DEMO } from "@/lib/env";
import { href, type Locale } from "@/lib/i18n";
import { getEventoContent } from "@/lib/restaurant/content";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 86400;

type Params = { params: Promise<{ locale: Locale; slug: string }> };

// Sin eventos reales todavía: las páginas de detalle se generan bajo demanda
// (el layout de idioma fija dynamicParams=false; aquí se reactiva para el slug).
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const evento = await getEventoContent(slug);
  if (!evento) return { title: "Evento no encontrado", robots: { index: false } };
  return pageMetadata({ locale, path: `/eventos/${slug}`, title: evento.titulo, description: evento.descripcion || undefined });
}

export default async function EventoPage({ params }: Params) {
  const { locale, slug } = await params;
  const evento = await getEventoContent(slug);
  if (!evento) notFound();
  const jsonLd = IS_DEMO ? null : eventJsonLd(evento);
  // Partes del programa con su propio cartel: cada una, su tarjeta.
  const conCartel = (evento.programa ?? []).filter((p) => p.imagen);
  const media = evento.media ?? [];

  return (
    <article>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}

      {/* Miga de pan bajo la cabecera de la web: de vuelta a la agenda, y dónde se está. */}
      <nav aria-label="Ruta" className="bg-crema pb-2 pt-24 lg:pt-28">
        <ol className="container-wide flex min-w-0 items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          <li className="shrink-0">
            <Link href={href(locale, "/eventos")} className="group inline-flex min-h-11 items-center gap-2.5 text-carbon-muted transition-colors hover:text-carbon">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full border border-tinta-line transition-[border-color,transform] duration-300 group-hover:-translate-x-0.5 group-hover:border-carbon">
                <Icon name="chevronLeft" className="h-3.5 w-3.5" />
              </span>
              Agenda
            </Link>
          </li>
          <li aria-hidden="true" className="h-px w-5 shrink-0 bg-tinta-line" />
          <li aria-current="page" className="truncate text-carbon">
            {evento.titulo}
          </li>
        </ol>
      </nav>
      <header className="bg-crema pb-16 pt-6 sm:pb-24">
        <EventoPortada evento={evento} locale={locale} ficha />
      </header>

      {evento.descripcion ? (
        <section aria-label="Sobre el evento" className="section border-t border-tinta-line bg-crema">
          <div className="container-page max-w-3xl">
            <p className="whitespace-pre-line font-display text-[1.35rem] font-light leading-relaxed text-carbon sm:text-2xl">{evento.descripcion}</p>
          </div>
        </section>
      ) : null}

      {conCartel.length > 0 ? (
        <section aria-labelledby="programa-title" className="section bg-papel-2">
          <div className="container-wide">
            <SectionRule id="programa-title" title="El programa, parte a parte" aside={<span>Programa</span>} />
            <ol className={`mt-12 grid gap-x-8 gap-y-14 ${conCartel.length > 1 ? "sm:grid-cols-2" : "max-w-xl"} ${conCartel.length > 2 ? "xl:grid-cols-3" : ""}`}>
              {conCartel.map((p, i) => (
                <li key={`${p.titulo}-${i}`}>
                  <CartelEvento
                    src={p.imagen!}
                    alt={`Cartel: ${p.titulo}`}
                    sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="aspect-[4/5] rounded-2xl shadow-card"
                  />
                  {p.hora ? <p className="mt-5 text-sm font-semibold tabular-nums text-brasa">{horario(p)}</p> : null}
                  <h2 className="t-h3 mt-1 text-carbon">{p.titulo}</h2>
                  {p.descripcion ? <p className="mt-2 leading-relaxed text-carbon-muted">{p.descripcion}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {media.length > 0 ? (
        <section aria-labelledby="galeria-title" className="section bg-crema">
          <div className="container-wide">
            <SectionRule id="galeria-title" title="Fotos y vídeos" aside={<span>Galería</span>} />
            {/* Columnas tipo mosaico: cada foto con su proporción, las verticales enteras. */}
            <ul className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
              {media.map((m) => (
                <li key={m.url} className="break-inside-avoid overflow-hidden rounded-2xl bg-papel-3">
                  {m.tipo === "video" ? (
                    <video src={m.url} controls playsInline preload="metadata" className="block w-full bg-noche" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- proporción libre (mosaico); fotos subidas desde el panel
                    <img src={m.url} alt={evento.titulo} loading="lazy" className="block h-auto w-full" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}
