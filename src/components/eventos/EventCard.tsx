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
  proximo: { label: "Próximo", className: "bg-oliva-soft text-oliva" },
  agotado: { label: "Agotado", className: "bg-terracota-soft text-terracota" },
  finalizado: { label: "Finalizado", className: "bg-arena text-carbon-muted" },
  cancelado: { label: "Cancelado", className: "bg-carbon text-crema" },
};

export function EventCard({ evento, locale }: { evento: EventoView; locale: Locale }) {
  const fecha = evento.fecha ? formatearFechaCorta(evento.fecha) : null;
  const estado = ESTADO[evento.estado];
  const detalle = evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-crema text-carbon shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden">
        {evento.imagen ? (
          <Image
            src={evento.imagen.src}
            alt={evento.imagen.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <BrandPlaceholder label={evento.tipo} icon="music" />
        )}
        <div className="absolute left-4 top-4 grid h-16 w-16 place-items-center rounded-2xl bg-crema text-center shadow-card">
          {fecha ? (
            <span className="leading-none">
              <span className="block font-display text-2xl text-marino">{fecha.dia}</span>
              <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-terracota">{fecha.mes}</span>
            </span>
          ) : (
            <span className="px-1 text-[0.7rem] font-semibold uppercase leading-tight text-carbon">Fecha por anunciar</span>
          )}
        </div>
        <SourceBadge fuente={evento.fuente} className="absolute right-4 top-4" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="eyebrow text-terracota">{evento.tipo}</span>
          <span className={`rounded-full px-2 py-0.5 ${estado.className}`}>{estado.label}</span>
        </div>
        <h3 className="mt-3 text-2xl leading-tight">{evento.titulo}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-carbon-muted">{evento.descripcion}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-3 text-carbon-muted">
            {evento.hora ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" className="h-4 w-4" />
                {evento.hora.slice(0, 5)}
              </span>
            ) : null}
            {evento.precioCentimos !== null ? (
              <span className="font-semibold text-marino">
                {evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}
              </span>
            ) : null}
          </span>
          {evento.estado === "proximo" ? (
            <a
              href={evento.enlaceReserva ?? SITE.phone.href}
              {...(evento.enlaceReserva ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex items-center gap-1 font-semibold text-terracota hover:underline"
            >
              {evento.enlaceReserva ? "Reservar plaza" : "Pregúntanos"}
              <Icon name="arrow" className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        {detalle ? (
          <Link href={detalle} className="mt-4 text-sm font-semibold text-marino underline-offset-4 hover:underline">
            Ver detalles<span className="sr-only"> de {evento.titulo}</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
