import { MapEmbed } from "@/components/map/MapEmbed";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import type { Dictionary } from "@/i18n/dictionaries";
import { agruparHorario, estadoAhora, type HorarioResuelto } from "@/lib/horario";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";

export function Horario({ horario, compact = false }: { horario: HorarioResuelto; compact?: boolean }) {
  return (
    <div>
      <dl className={`grid gap-1.5 ${compact ? "text-sm" : "text-[0.95rem]"}`}>
        {agruparHorario(horario.semana).map((g) => (
          <div key={g.dias} className="flex justify-between gap-6 border-b border-dotted border-tinta-line pb-1.5">
            <dt className="text-carbon-muted">{g.dias}</dt>
            <dd className="font-medium tabular-nums text-carbon">{g.horas}</dd>
          </div>
        ))}
      </dl>
      {horario.fuente === "internet" ? (
        <p className="mt-2 text-xs text-carbon-muted">Horario publicado en Google. Si vienes en festivo, llámanos antes.</p>
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
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="cv-auto section bg-papel-2">
      <div className="container-wide">
        <SectionRule as={headingLevel} id="ubicacion-title" title="Edificio 502 del Parque Tecnológico, en Derio" aside={<span>Cómo llegar</span>} />

        {/* El mapa llena todo el marco, en tonos cálidos; la ficha flota encima a la
            izquierda, donde no tapa el punto (el mapa se centra en el local). */}
        <div className="relative mt-10 lg:h-[32rem]">
          <MapEmbed
            image={IMAGES.mapa.src}
            alt={IMAGES.mapa.alt}
            embedUrl={SITE.maps.embed}
            priority={mapPriority}
            className="aspect-[4/3] rounded-2xl ring-1 ring-tinta-line sm:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto"
            iframeClassName="[filter:grayscale(.45)_sepia(.18)_contrast(.96)]"
          />

          <div className="relative z-10 mt-4 rounded-2xl bg-crema p-7 shadow-[0_30px_70px_-25px_rgb(40_30_20/0.35)] ring-1 ring-tinta-line sm:p-8 lg:absolute lg:inset-y-6 lg:left-6 lg:mx-0 lg:mt-0 lg:flex lg:w-[27rem] lg:flex-col">
            <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="text-carbon-muted" />

            <address className="mt-5 not-italic">
              <p className="font-display text-2xl text-carbon">{SITE.name}</p>
              <p className="mt-1 text-carbon">
                {SITE.address.street} · {SITE.address.postalCode} {SITE.address.locality}
              </p>
              <p className="mt-1 text-sm text-carbon-muted">Parque Tecnológico de Bizkaia · Parking 220 plazas</p>
            </address>

            <div className="mt-6 border-t border-tinta-line pt-5">
              <Horario horario={horario} compact />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-auto">
              <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <Icon name="pin" className="h-4 w-4" />
                {t.cta.comoLlegar}
              </a>
              <a href={SITE.phone.href} className="btn-secondary whitespace-nowrap px-4 tabular-nums">
                <Icon name="phone" className="h-4 w-4" />
                {SITE.phone.display}
              </a>
              {SITE.whatsapp ? (
                <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-secondary sm:col-span-2">
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
