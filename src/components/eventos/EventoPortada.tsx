import Link from "next/link";
import { CartelEvento } from "@/components/eventos/CartelEvento";
import { Countdown } from "@/components/eventos/Countdown";
import { ProgramaEvento } from "@/components/eventos/ProgramaEvento";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { EventoView } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * Evento a lo grande sobre fondo de noche: el cartel entero a un lado y, al otro,
 * fecha, cuenta atrás, programa y botones. Es el destacado de /eventos y la
 * cabecera de cada ficha (`ficha`: título como h1 y sin el enlace a la ficha).
 */
export function EventoPortada({ evento, locale, ficha = false }: { evento: EventoView; locale: Locale; ficha?: boolean }) {
  const Titulo = ficha ? "h1" : "h2";
  const programa = evento.programa ?? [];
  const proximo = evento.estado === "proximo";
  const detalle = !ficha && evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;
  const reservar = evento.slug && evento.fuente === "supabase" ? href(locale, `/reservar?espacio=evento&evento=${evento.slug}`) : href(locale, "/reservar");
  const kicker = ficha ? evento.tipo : evento.destacado ? "Próximo evento · Destacado" : "Próximo evento";

  return (
    <div className="container-wide grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl ring-1 ring-crema/10 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.8)] lg:max-w-none">
          {evento.imagen ? (
            <CartelEvento src={evento.imagen.src} alt={evento.imagen.alt} sizes="(min-width: 1024px) 38vw, (min-width: 448px) 448px, 100vw" priority={ficha} className="aspect-[4/5]" />
          ) : (
            <div className="relative aspect-[4/5] bg-noche-3">
              <BrandPlaceholder label={evento.tipo} icon="music" />
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        <p className="flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-neon">
          {proximo ? (
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
            </span>
          ) : null}
          {kicker}
        </p>
        <Titulo className="t-display mt-5 text-crema">{evento.titulo}</Titulo>

        <dl className="mt-8 grid gap-x-10 gap-y-5 border-y border-crema/10 py-6 sm:grid-cols-3">
          {evento.fecha ? (
            <div className="sm:col-span-2">
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-crema/45">Cuándo</dt>
              <dd className="mt-1.5 text-lg first-letter:uppercase">
                {formatearFechaLarga(evento.fecha)}
                {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-crema/45">Entrada</dt>
            <dd className="mt-1.5 text-lg">
              {evento.precioCentimos === null ? "Consúltanos" : evento.precioCentimos === 0 ? "Libre" : formatCentimos(evento.precioCentimos)}
              {evento.aforo ? <span className="text-crema/50"> · {evento.aforo} plazas</span> : null}
            </dd>
          </div>
        </dl>

        {proximo && evento.fecha ? (
          <div className="mt-8">
            <Countdown fechaISO={evento.fecha} hora={evento.hora ?? programa[0]?.hora ?? null} />
          </div>
        ) : null}

        {programa.length > 0 ? (
          <div className="mt-10">
            <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-crema/45">Programa del día</p>
            <ProgramaEvento programa={programa} oscuro />
          </div>
        ) : !ficha && evento.descripcion ? (
          <p className="mt-8 max-w-xl leading-relaxed text-crema/70">{evento.descripcion}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {proximo ? (
            evento.enlaceReserva ? (
              <a href={evento.enlaceReserva} target="_blank" rel="noopener noreferrer" className="btn bg-neon px-6 text-noche hover:bg-neon-soft">
                Reservar plaza
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            ) : (
              <Link href={reservar} className="btn bg-neon px-6 text-noche hover:bg-neon-soft">
                <Icon name="calendar" className="h-4 w-4" />
                Reservar mesa
              </Link>
            )
          ) : null}
          {detalle ? (
            <Link href={detalle} className="btn-ghost-light px-6">
              Ver el evento
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          ) : (
            <a href={SITE.phone.href} className="btn-ghost-light px-6">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
