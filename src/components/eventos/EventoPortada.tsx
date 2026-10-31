import Link from "next/link";
import { cartelesDe } from "@/components/eventos/CartelEvento";
import { CartelesRotativos } from "@/components/eventos/CartelesRotativos";
import { Countdown } from "@/components/eventos/Countdown";
import { ProgramaEvento } from "@/components/eventos/ProgramaEvento";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { EventoView } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * Evento a lo grande, sobre papel como el resto de la web: el cartel entero a un
 * lado y, al otro, fecha, cuenta atrás, programa y botones. Es el destacado de /eventos y la
 * cabecera de cada ficha (`ficha`: título como h1 y sin el enlace a la ficha).
 */
export function EventoPortada({ evento, locale, ficha = false }: { evento: EventoView; locale: Locale; ficha?: boolean }) {
  const Titulo = ficha ? "h1" : "h2";
  const programa = evento.programa ?? [];
  // Si hay varios carteles (uno por parte del programa, o varias fotos), se van turnando.
  const carteles = cartelesDe(evento);
  const proximo = evento.estado === "proximo";
  const detalle = !ficha && evento.slug && evento.fuente === "supabase" ? href(locale, `/eventos/${evento.slug}`) : null;
  // Un evento del panel se apunta desde la web (y Carlos ve cuántos van); si no, mesa.
  const apuntarse = Boolean(evento.slug && evento.fuente === "supabase");
  const reservar = apuntarse ? href(locale, `/reservar?espacio=evento&evento=${evento.slug}`) : href(locale, "/reservar");
  const kicker = ficha ? evento.tipo : evento.destacado ? "Próximo evento · Destacado" : "Próximo evento";

  return (
    <div className="container-wide grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl ring-1 ring-tinta-line shadow-[0_40px_90px_-40px_rgb(43_39_34/0.55)] lg:max-w-none">
          {carteles.length > 0 ? (
            <CartelesRotativos imagenes={carteles} sizes="(min-width: 1024px) 38vw, (min-width: 448px) 448px, 100vw" priority={ficha} className="aspect-[4/5]" />
          ) : (
            <div className="relative aspect-[4/5] bg-papel-3">
              <BrandPlaceholder label={evento.tipo} icon="music" />
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        <p className="flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-brasa">
          {proximo ? (
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brasa opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brasa" />
            </span>
          ) : null}
          {kicker}
        </p>
        <Titulo className="t-display mt-5 font-light text-carbon">{evento.titulo}</Titulo>

        <dl className="mt-8 grid gap-x-10 gap-y-5 border-y border-tinta-line py-6 sm:grid-cols-3">
          {evento.fecha ? (
            <div className="sm:col-span-2">
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Cuándo</dt>
              <dd className="mt-1.5 text-lg text-carbon first-letter:uppercase">
                {formatearFechaLarga(evento.fecha)}
                {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Entrada</dt>
            <dd className="mt-1.5 text-lg text-carbon">
              {evento.precioCentimos === null ? "Consúltanos" : evento.precioCentimos === 0 ? "Libre" : formatCentimos(evento.precioCentimos)}
              {evento.aforo ? <span className="text-carbon-muted"> · {evento.aforo} plazas</span> : null}
            </dd>
          </div>
        </dl>

        {proximo && evento.fecha ? (
          <div className="mt-8 max-w-md">
            <Countdown fechaISO={evento.fecha} hora={evento.hora ?? programa[0]?.hora ?? null} claro />
          </div>
        ) : null}

        {programa.length > 0 ? (
          <div className="mt-10">
            <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Programa del día</p>
            <ProgramaEvento programa={programa} />
          </div>
        ) : !ficha && evento.descripcion ? (
          <p className="mt-8 max-w-xl leading-relaxed text-carbon-muted">{evento.descripcion}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {proximo ? (
            evento.enlaceReserva ? (
              <a href={evento.enlaceReserva} target="_blank" rel="noopener noreferrer" className="btn-dark px-6">
                Reservar plaza
                <Icon name="arrow" className="h-4 w-4" />
              </a>
            ) : (
              <Link href={reservar} className="btn-dark px-6">
                <Icon name={apuntarse ? "users" : "calendar"} className="h-4 w-4" />
                {apuntarse ? "Apuntarme" : "Reservar mesa"}
              </Link>
            )
          ) : null}
          {detalle ? (
            <Link href={detalle} className="btn-secondary px-6">
              Ver el evento
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          ) : (
            <a href={SITE.phone.href} className="btn-secondary px-6">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
