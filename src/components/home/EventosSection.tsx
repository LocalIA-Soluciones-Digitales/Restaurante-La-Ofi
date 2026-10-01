import Image from "next/image";
import Link from "next/link";
import { EventCard } from "@/components/eventos/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import type { ContentState, EventoView } from "@/lib/restaurant/types";

export function EventosSection({ locale, t, state }: { locale: Locale; t: Dictionary; state: ContentState<EventoView[]> }) {
  return (
    <section aria-labelledby="eventos-title" className="cv-auto relative isolate overflow-hidden bg-marino-900 py-20 text-crema sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-25">
        <Image src={IMAGES.salonNoche.src} alt="" fill sizes="100vw" className="parallax-soft object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-marino-900 via-marino-900/80 to-marino-900" />
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
