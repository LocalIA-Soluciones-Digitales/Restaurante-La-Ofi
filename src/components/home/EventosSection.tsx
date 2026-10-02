import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/eventos/Countdown";
import { EventCard } from "@/components/eventos/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { formatearFechaLarga } from "@/lib/format";
import { IMAGES } from "@/lib/images";
import type { ContentState, EventoView } from "@/lib/restaurant/types";

export function EventosSection({ locale, t, state }: { locale: Locale; t: Dictionary; state: ContentState<EventoView[]> }) {
  // Cuenta atrás solo para un evento real con fecha (nunca para los de ejemplo).
  const siguiente =
    state.status === "real" ? state.data.find((e) => e.fecha && (e.estado === "proximo" || e.estado === "agotado")) : undefined;

  return (
    <section aria-labelledby="eventos-title" className="cv-auto relative isolate overflow-hidden bg-noche py-20 text-crema sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-25">
        <Image src={IMAGES.salonNoche.src} alt="" fill sizes="100vw" className="parallax-soft object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-noche via-noche/80 to-noche" />
      </div>

      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="eventos-title"
            momento="noche"
            eyebrow="Eventos"
            dark
            title={
              <>
                En La Ofi <span className="italic text-neon">siempre pasa algo</span>
              </>
            }
            lead="Tardeos, partidos en pantalla grande y celebraciones. Lo que viene, aquí."
            className="reveal"
          />
          <Link href={href(locale, "/eventos")} className="btn-ghost-light reveal self-start md:self-auto">
            {t.cta.verEventos}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        {siguiente?.fecha ? (
          <div className="reveal mt-12 flex flex-col gap-6 rounded-[2rem] border border-neon/25 bg-crema/[0.04] p-6 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="eyebrow text-neon">Próximo evento</p>
              <p className="mt-2 font-display text-3xl text-crema">{siguiente.titulo}</p>
              <p className="mt-1 text-sm text-crema/70 first-letter:uppercase">
                {formatearFechaLarga(siguiente.fecha)}
                {siguiente.hora ? ` · ${siguiente.hora.slice(0, 5)}` : ""}
              </p>
            </div>
            <Countdown fechaISO={siguiente.fecha} hora={siguiente.hora} />
          </div>
        ) : null}

        <div className="mt-12">
          {state.status === "empty" ? (
            <EmptyState dark title="Próximamente" icon="calendar">
              Estamos preparando los próximos tardeos y eventos. Síguenos en Instagram para enterarte el primero.
            </EmptyState>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {state.data.slice(0, 3).map((evento) => (
                <li key={evento.id} className="reveal">
                  <EventCard evento={evento} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
