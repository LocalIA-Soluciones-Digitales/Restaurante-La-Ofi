import { MapEmbed } from "@/components/map/MapEmbed";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/i18n/dictionaries";
import { agruparHorario, type HorarioResuelto } from "@/lib/horario";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";

export function Horario({ horario }: { horario: HorarioResuelto }) {
  return (
    <div>
      <dl className="grid gap-1 text-sm">
        {agruparHorario(horario.semana).map((g) => (
          <div key={g.dias} className="flex justify-between gap-6">
            <dt className="text-carbon-muted">{g.dias}</dt>
            <dd className="font-medium text-carbon">{g.horas}</dd>
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
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="cv-auto bg-arena py-20 sm:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div className="reveal">
          <SectionHeader
            id="ubicacion-title"
            as={headingLevel}
            eyebrow="Ubicación"
            title="Cómo llegar a La Ofi"
            lead="En el edificio 502 del Parque Científico y Tecnológico de Bizkaia (campus Zamudio-Derio). Con aparcamiento amplio para venir en coche."
          />
          <div className="mt-8 rounded-[1.5rem] border border-carbon/10 bg-crema/70 p-5">
            <h3 className="font-sans text-sm font-semibold uppercase tracking-eyebrow text-terracota">Desde el Parque</h3>
            <ul className="mt-3 grid gap-2 text-sm text-carbon">
              <li className="flex gap-2">
                <Icon name="briefcase" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
                Edificio 502, dentro del propio campus: se llega andando desde las oficinas del Parque.
              </li>
              <li className="flex gap-2">
                <Icon name="car" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
                Aparcamiento para 220 coches.
              </li>
              <li className="flex gap-2">
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
                En Google Maps: <span className="font-mono">74WM+54 Derio</span>
              </li>
            </ul>
          </div>
          <address className="mt-8 grid gap-5 not-italic">
            <p className="flex gap-3">
              <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-terracota" />
              <span>
                <span className="block font-semibold text-carbon">{SITE.address.street}</span>
                <span className="block text-carbon-muted">
                  {SITE.address.postalCode} {SITE.address.locality}, {SITE.address.region}
                </span>
                <span className="block text-sm text-carbon-muted">{SITE.address.context}</span>
              </span>
            </p>
            <p className="flex gap-3">
              <Icon name="phone" className="mt-0.5 h-5 w-5 shrink-0 text-terracota" />
              <a href={SITE.phone.href} className="font-semibold text-carbon link-underline">
                {SITE.phone.display}
              </a>
            </p>
            <div className="flex gap-3">
              <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-terracota" />
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
        <div className="reveal">
          <MapEmbed image={IMAGES.mapa.src} alt={IMAGES.mapa.alt} embedUrl={SITE.maps.embed} credit={IMAGES.mapa.credit} />
        </div>
      </div>
    </section>
  );
}
