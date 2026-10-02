import { MapEmbed } from "@/components/map/MapEmbed";
import { Icon } from "@/components/ui/Icon";
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

export function Ubicacion({ t, horario, headingLevel = "h2" }: { t: Dictionary; horario: HorarioResuelto; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="section bg-papel-2">
      <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="kicker text-brasa">Cómo llegar</p>
          <Heading id="ubicacion-title" className="t-h2 mt-3 text-carbon">
            Edificio 502 del Parque Tecnológico, en Derio
          </Heading>
          <p className="lead mt-4">
            Dentro del campus Zamudio-Derio del Parque Científico y Tecnológico de Bizkaia: se llega andando desde las
            oficinas, y en coche hay aparcamiento para 220 plazas.
          </p>

          <address className="mt-8 grid gap-6 not-italic">
            <div className="flex gap-4">
              <Icon name="pin" className="mt-1 h-5 w-5 shrink-0 text-brasa" />
              <p>
                <span className="block font-display text-xl text-carbon">{SITE.name}</span>
                <span className="block text-carbon">{SITE.address.street}</span>
                <span className="block text-carbon-muted">
                  {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
                </span>
                <span className="mt-1 block text-sm text-carbon-muted">
                  En Google Maps: <span className="font-mono text-[0.85rem]">74WM+54 Derio</span>
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <Icon name="phone" className="mt-1 h-5 w-5 shrink-0 text-brasa" />
              <a href={SITE.phone.href} className="font-display text-xl text-carbon underline decoration-carbon/25 underline-offset-4 hover:decoration-brasa">
                {SITE.phone.display}
              </a>
            </div>
            <div className="flex gap-4">
              <Icon name="clock" className="mt-1 h-5 w-5 shrink-0 text-brasa" />
              <div className="flex-1">
                <Horario horario={horario} />
              </div>
            </div>
          </address>

          <div className="mt-8 flex flex-wrap gap-3">
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
        <div className="lg:col-span-7">
          <MapEmbed image={IMAGES.mapa.src} alt={IMAGES.mapa.alt} embedUrl={SITE.maps.embed} credit={IMAGES.mapa.credit} />
        </div>
      </div>
    </section>
  );
}
