import Link from "next/link";
import { EspecialidadCard } from "@/components/home/EspecialidadCard";
import { DragCarousel } from "@/components/motion/DragCarousel";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ESPECIALIDADES } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";

export function Especialidades({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="especialidades-title" className="cv-auto overflow-hidden bg-crema py-20 sm:py-28">
      <div className="container-page flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeader
          id="especialidades-title"
          momento="mediodia"
          eyebrow="Especialidades"
          title={
            <>
              Lo que pide <span className="italic text-terracota">quien repite</span>
            </>
          }
          lead="Brasa, cuchara y producto del entorno. Platos citados por la prensa gastronómica: pregunta en barra qué hay hoy."
          className="reveal"
        />
        <div className="reveal flex items-center gap-3">
          <SourceBadge fuente="prensa" />
          <Link href={href(locale, "/carta")} className="btn-secondary">
            Ver la carta
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="mt-12">
        <DragCarousel label="Especialidades de La Ofi">
          {ESPECIALIDADES.map((e) => (
            <li key={e.id} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[30%]">
              <EspecialidadCard especialidad={e} href={href(locale, `/carta${e.carta}`)} />
            </li>
          ))}
        </DragCarousel>
      </div>
    </section>
  );
}
