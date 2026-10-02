import Image from "next/image";
import Link from "next/link";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { formatCentimos, formatearFechaCorta } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import type { EstadoEvento, EventoView } from "@/lib/restaurant/types";

const ESTADO: Record<EstadoEvento, { label: string; className: string }> = {
  proximo: { label: "Próximo", className: "text-ok" },
  agotado: { label: "Agotado", className: "text-brasa" },
  finalizado: { label: "Finalizado", className: "text-carbon-muted" },
  cancelado: { label: "Cancelado", className: "text-carbon-muted line-through" },
};

/** Evento como pieza editorial: fecha grande, foto real y texto; sin tarjeta. */
export function EventCard({ evento, locale }: { evento: EventoView; locale: Locale }) {
  const fecha = evento.fecha ? formatearFechaCorta(evento.fecha) : null;
  const estado = ESTADO[evento.estado];
  const detalle = evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;

  return (
    <article className="group grid gap-6 border-t border-tinta-line pt-8 md:grid-cols-12 md:gap-10">
      <div className="flex items-start gap-5 md:col-span-2 md:block">
        {fecha ? (
          <p className="leading-none">
            <span className="block font-display text-5xl tabular-nums text-carbon">{fecha.dia}</span>
            <span className="kicker mt-2 block text-brasa">{fecha.mes}</span>
          </p>
        ) : (
          <p className="kicker text-brasa">Fecha por anunciar</p>
        )}
      </div>

      <div className="photo-hover relative aspect-[16/10] overflow-hidden bg-papel-3 md:col-span-5">
        {evento.imagen ? (
          <Image
            src={evento.imagen.src}
            alt={evento.imagen.alt}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        ) : (
          <BrandPlaceholder label={evento.tipo} icon="music" />
        )}
      </div>

      <div className="md:col-span-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="kicker text-carbon-muted">{evento.tipo}</span>
          <span className={`text-xs font-semibold ${estado.className}`}>{estado.label}</span>
          <SourceBadge fuente={evento.fuente} />
        </div>
        <h3 className="t-h3 mt-3 text-carbon">{evento.titulo}</h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-carbon-muted">{evento.descripcion}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {evento.hora ? (
            <span className="inline-flex items-center gap-1.5 text-carbon">
              <Icon name="clock" className="h-4 w-4 text-brasa" />
              {evento.hora.slice(0, 5)}
            </span>
          ) : null}
          {evento.precioCentimos !== null ? (
            <span className="font-semibold text-carbon">
              {evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}
            </span>
          ) : null}
          {evento.estado === "proximo" ? (
            <a
              href={evento.enlaceReserva ?? SITE.phone.href}
              {...(evento.enlaceReserva ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="link-arrow"
            >
              {evento.enlaceReserva ? "Reservar plaza" : "Pregúntanos"}
              <Icon name="arrow" className="h-4 w-4" />
            </a>
          ) : null}
          {detalle ? (
            <Link href={detalle} className="link-arrow">
              Ver detalles<span className="sr-only"> de {evento.titulo}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
