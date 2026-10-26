import { MapEmbed } from "@/components/map/MapEmbed";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import type { Dictionary } from "@/i18n/dictionaries";
import { agruparHorario, type HorarioResuelto } from "@/lib/horario";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";

export function Horario({ horario }: { horario: HorarioResuelto }) {
  return (
    <div>
      <dl className="grid gap-1.5 text-[0.95rem]">
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

        {/* Una sola tarjeta: los datos a la izquierda y el mapa llenando el resto, todo en el mismo marco. */}
        <div className="mt-10 grid overflow-hidden rounded-2xl bg-crema ring-1 ring-tinta-line lg:grid-cols-2">
          <div className="flex flex-col p-7 sm:p-10">
            <address className="not-italic">
              <p className="font-display text-2xl text-carbon">{SITE.name}</p>
              <p className="mt-1 text-carbon">{SITE.address.street}</p>
              <p className="text-carbon-muted">
                {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
              </p>
              <a href={SITE.phone.href} className="mt-3 inline-flex items-center gap-2 font-display text-xl text-carbon underline decoration-carbon/25 underline-offset-4 hover:decoration-brasa">
                <Icon name="phone" className="h-4 w-4 text-brasa" />
                {SITE.phone.display}
              </a>
            </address>
            <p className="mt-4 text-sm text-carbon-muted">Parque Tecnológico de Bizkaia · Aparcamiento para 220 coches</p>

            <div className="mt-7 border-t border-tinta-line pt-5">
              <p className="kicker mb-3 flex items-center gap-2 text-carbon-muted">
                <Icon name="clock" className="h-4 w-4 text-brasa" />
                Horario
              </p>
              <Horario horario={horario} />
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-8">
              <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <Icon name="pin" className="h-4 w-4" />
                {t.cta.comoLlegar}
              </a>
              <a href={SITE.phone.href} className="btn-secondary">
                <Icon name="phone" className="h-4 w-4" />
                {t.cta.llamar}
              </a>
              {SITE.whatsapp ? (
                <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <Icon name="whatsapp" className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <MapEmbed
            image={IMAGES.mapa.src}
            alt={IMAGES.mapa.alt}
            embedUrl={SITE.maps.embed}
            priority={mapPriority}
            className="aspect-[4/3] border-t border-tinta-line sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[26rem] lg:border-l lg:border-t-0"
          />
        </div>
      </div>
    </section>
  );
}
