import Link from "next/link";
import { CartelEvento } from "@/components/eventos/CartelEvento";
import { horario } from "@/components/eventos/ProgramaEvento";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos, formatearFechaCorta } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { EstadoEvento, EventoView } from "@/lib/restaurant/types";

const ESTADO: Partial<Record<EstadoEvento, { label: string; className: string }>> = {
  agotado: { label: "Agotado", className: "bg-brasa text-crema" },
  cancelado: { label: "Cancelado", className: "bg-carbon text-crema" },
  finalizado: { label: "Celebrado", className: "bg-crema/90 text-carbon" },
};

const DIA_SEMANA = new Intl.DateTimeFormat("es-ES", { weekday: "long", timeZone: "UTC" });

/**
 * Evento de la agenda como cartel: la imagen entera (los carteles verticales no
 * se recortan), la fecha en una pastilla y debajo el programa en una línea.
 * Toda la tarjeta lleva a la ficha.
 */
export function EventCard({ evento, locale, pasado = false }: { evento: EventoView; locale: Locale; pasado?: boolean }) {
  const fecha = evento.fecha ? formatearFechaCorta(evento.fecha) : null;
  const estado = ESTADO[evento.estado];
  const detalle = evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;
  const programa = evento.programa ?? [];

  return (
    <article className={`group relative flex h-full flex-col ${pasado ? "opacity-80 hover:opacity-100" : ""} transition-opacity`}>
      <div className="relative overflow-hidden rounded-2xl shadow-card transition-[box-shadow,transform] duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-lift">
        {evento.imagen ? (
          <CartelEvento
            src={evento.imagen.src}
            alt={evento.imagen.alt}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className={`aspect-[4/5] ${pasado ? "grayscale-[35%]" : ""}`}
          />
        ) : (
          <div className="relative aspect-[4/5] bg-papel-3">
            <BrandPlaceholder label={evento.tipo} icon="music" />
          </div>
        )}
        {fecha ? (
          <p className="absolute left-3 top-3 grid min-w-[3.5rem] place-items-center rounded-xl bg-crema/95 px-2.5 py-2 text-center leading-none text-carbon shadow-card backdrop-blur">
            <span className="font-display text-2xl tabular-nums">{fecha.dia}</span>
            <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-brasa">{fecha.mes}</span>
          </p>
        ) : null}
        {estado ? (
          <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${estado.className}`}>{estado.label}</span>
        ) : evento.destacado && !pasado ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-noche/85 px-3 py-1 text-xs font-semibold text-neon backdrop-blur">
            <Icon name="star" className="h-3.5 w-3.5" />
            Destacado
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <p className="kicker text-carbon-muted">
          {evento.tipo}
          {evento.fecha ? <span className="font-medium normal-case tracking-normal"> · {DIA_SEMANA.format(new Date(`${evento.fecha}T12:00:00Z`))}</span> : null}
        </p>
        <h3 className="t-h3 mt-2 text-carbon">
          {detalle ? (
            <Link href={detalle} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {evento.titulo}
            </Link>
          ) : (
            evento.titulo
          )}
        </h3>
        {programa.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-carbon-muted">
            {programa.slice(0, 3).map((p, i) => (
              <li key={`${p.titulo}-${i}`} className="flex gap-2">
                {p.hora ? <span className="shrink-0 font-semibold tabular-nums text-brasa">{horario(p)}</span> : null}
                <span className="truncate">{p.titulo}</span>
              </li>
            ))}
          </ul>
        ) : evento.descripcion ? (
          <p className="mt-2 line-clamp-2 text-[0.95rem] leading-relaxed text-carbon-muted">{evento.descripcion}</p>
        ) : null}
        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-sm text-carbon">
          {evento.hora && programa.length === 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-4 w-4 text-brasa" />
              {evento.hora.slice(0, 5)}
            </span>
          ) : null}
          {evento.precioCentimos !== null ? (
            <span className="font-semibold">{evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}</span>
          ) : null}
          {detalle ? (
            <span aria-hidden="true" className="ml-auto inline-flex items-center gap-1 font-semibold text-carbon transition-colors group-hover:text-brasa">
              Ver evento
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
