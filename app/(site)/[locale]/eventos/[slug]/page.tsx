import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { IS_DEMO } from "@/lib/env";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import { getEventoContent } from "@/lib/restaurant/content";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

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

  return (
    <article className="pb-16 pt-28 sm:pt-32">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <div className="container-page max-w-3xl">
        <Link href={href(locale, "/eventos")} className="inline-flex items-center gap-1 text-sm font-semibold text-terracota hover:underline">
          <Icon name="chevronLeft" className="h-4 w-4" />
          Todos los eventos
        </Link>
        <p className="eyebrow mt-6 text-terracota">{evento.tipo}</p>
        <h1 className="mt-3 text-5xl leading-tight text-carbon">{evento.titulo}</h1>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-carbon-muted">
          {evento.fecha ? (
            <li className="inline-flex items-center gap-2 first-letter:uppercase">
              <Icon name="calendar" className="h-5 w-5" />
              {formatearFechaLarga(evento.fecha)}
            </li>
          ) : null}
          {evento.hora ? (
            <li className="inline-flex items-center gap-2">
              <Icon name="clock" className="h-5 w-5" />
              {evento.hora.slice(0, 5)}
            </li>
          ) : null}
          {evento.precioCentimos !== null ? (
            <li className="font-semibold text-marino">
              {evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}
            </li>
          ) : null}
          {evento.aforo ? <li>Aforo: {evento.aforo} personas</li> : null}
        </ul>
        {evento.imagen ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2rem] bg-arena">
            <Image src={evento.imagen.src} alt={evento.imagen.alt} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        ) : null}
        <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-carbon">{evento.descripcion}</p>
        {evento.estado === "proximo" ? (
          <a
            href={evento.enlaceReserva ?? SITE.phone.href}
            {...(evento.enlaceReserva ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn-primary mt-10"
          >
            {evento.enlaceReserva ? "Reservar plaza" : `Llamar al ${SITE.phone.display}`}
          </a>
        ) : null}
      </div>
    </article>
  );
}
