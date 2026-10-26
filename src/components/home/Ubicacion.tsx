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

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Los datos en dos columnas: dónde y cómo contactar a un lado, horario al otro. */}
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7">
            <div>
              <p className="text-[0.95rem] leading-relaxed text-carbon-muted">
                Dentro del campus Zamudio-Derio del Parque Científico y Tecnológico de Bizkaia: se llega andando desde
                las oficinas y hay aparcamiento para 220 coches.
              </p>
              <address className="mt-6 grid gap-4 not-italic">
                <div className="flex gap-3">
                  <Icon name="pin" className="mt-1 h-4 w-4 shrink-0 text-brasa" />
                  <p className="text-[0.95rem]">
                    <span className="block font-display text-lg text-carbon">{SITE.name}</span>
                    <span className="block text-carbon">{SITE.address.street}</span>
                    <span className="block text-carbon-muted">
                      {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
                    </span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <Icon name="phone" className="mt-1 h-4 w-4 shrink-0 text-brasa" />
                  <a href={SITE.phone.href} className="font-display text-lg text-carbon underline decoration-carbon/25 underline-offset-4 hover:decoration-brasa">
                    {SITE.phone.display}
                  </a>
                </div>
              </address>
            </div>
            <div>
              <p className="kicker flex items-center gap-2 text-carbon-muted">
                <Icon name="clock" className="h-4 w-4 text-brasa" />
                Horario
              </p>
              <div className="mt-4">
                <Horario horario={horario} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
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

          {/* Mapa contenido: basta para situarse, el botón abre la ruta en Google Maps. */}
          <div className="lg:col-span-5">
            <MapEmbed
              image={IMAGES.mapa.src}
              alt={IMAGES.mapa.alt}
              embedUrl={SITE.maps.embed}
              priority={mapPriority}
              className="aspect-[4/3] rounded-xl lg:aspect-auto lg:h-full lg:min-h-[20rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
