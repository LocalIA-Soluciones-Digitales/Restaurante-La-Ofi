import { MapEmbed } from "@/components/map/MapEmbed";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import type { Dictionary } from "@/i18n/dictionaries";
import { agruparHorario, estadoAhora, type HorarioResuelto } from "@/lib/horario";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";

export function Horario({ horario, compact = false, light = false }: { horario: HorarioResuelto; compact?: boolean; light?: boolean }) {
  return (
    <div>
      <dl className={`grid gap-1.5 ${compact ? "text-sm" : "text-[0.95rem]"}`}>
        {agruparHorario(horario.semana).map((g) => (
          <div key={g.dias} className={`flex justify-between gap-6 border-b pb-1.5 ${light ? "border-crema/10" : "border-dotted border-tinta-line"}`}>
            <dt className={light ? "text-crema/60" : "text-carbon-muted"}>{g.dias}</dt>
            <dd className={`font-medium tabular-nums ${light ? "text-crema" : "text-carbon"}`}>{g.horas}</dd>
          </div>
        ))}
      </dl>
      {horario.fuente === "internet" ? (
        <p className={`mt-2 text-xs ${light ? "text-crema/50" : "text-carbon-muted"}`}>Horario publicado en Google. Si vienes en festivo, llámanos antes.</p>
      ) : null}
    </div>
  );
}

export function Ubicacion({
  t,
  horario,
  headingLevel = "h2",
  mapPriority = false,
}: {
  t: Dictionary;
  horario: HorarioResuelto;
  headingLevel?: "h1" | "h2";
  /** En /contacto el mapa es lo más grande de la primera pantalla en escritorio. */
  mapPriority?: boolean;
}) {
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="cv-auto bg-papel-2 pt-8 sm:pt-12">
      <div className="container-wide">
        <SectionRule as={headingLevel} id="ubicacion-title" title="Edificio 502 del Parque Tecnológico, en Derio" aside={<span>Cómo llegar</span>} />
      </div>

      {/* Satélite a todo el ancho: se reconoce el edificio y el aparcamiento. La
          ficha flota a la izquierda, dentro de la retícula, sin tapar el punto. */}
      <div className="relative mt-10 lg:h-[36rem]">
        <MapEmbed
          image={IMAGES.mapa.src}
          alt={IMAGES.mapa.alt}
          embedUrl={SITE.maps.embedSatelite}
          priority={mapPriority}
          className="aspect-[4/3] sm:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto"
        />

        <div className="container-wide relative z-10 mt-4 pb-16 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:pb-0">
          {/* Ficha editorial: panel oscuro translúcido, esquinas rectas, filete dorado a
              la izquierda y separadores finos (como las fichas de datos de White Desert). */}
          <div className="relative border-l-2 border-ratan bg-noche/[0.88] p-6 text-crema shadow-[0_40px_90px_-30px_rgb(0_0_0/0.7)] backdrop-blur-xl sm:p-9 lg:pointer-events-auto lg:w-[26rem]">
            <p className="kicker whitespace-nowrap text-ratan">Cómo llegar</p>
            <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} tone="light" className="mt-3 text-[0.8rem] text-crema/70" />

            <address className="mt-6 not-italic">
              <p className="font-display text-[1.65rem] font-light leading-none sm:text-[2rem]">{SITE.name}</p>
              <p className="mt-3 text-crema/85">
                {SITE.address.street} · {SITE.address.postalCode} {SITE.address.locality}
              </p>
              <p className="mt-1 text-sm text-crema/55">Parque Tecnológico de Bizkaia · Parking 220 plazas</p>
            </address>

            <div className="mt-7 border-t border-crema/15 pt-5">
              <p className="mb-3 font-display text-base italic text-crema/60">Horario</p>
              <Horario horario={horario} compact light />
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              <a
                href={SITE.maps.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-12 items-center justify-between gap-3 whitespace-nowrap bg-crema px-5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-carbon transition-colors duration-300 hover:bg-white"
              >
                {t.cta.comoLlegar}
                <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
              </a>
              <a
                href={SITE.phone.href}
                className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap border border-crema/30 px-4 text-[0.95rem] tabular-nums text-crema transition-colors duration-300 hover:border-crema hover:bg-crema/10"
              >
                <Icon name="phone" className="h-4 w-4" />
                {SITE.phone.display}
              </a>
              {SITE.whatsapp ? (
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-crema/30 text-crema transition-colors duration-300 hover:border-crema hover:bg-crema/10 sm:col-span-2"
                >
                  <Icon name="whatsapp" className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
