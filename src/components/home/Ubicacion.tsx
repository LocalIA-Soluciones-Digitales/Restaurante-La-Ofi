import { MapaOfi } from "@/components/map/MapaOfi";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import type { Dictionary } from "@/i18n/dictionaries";
import { agruparHorario, estadoAhora, type HorarioResuelto } from "@/lib/horario";
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
}: {
  t: Dictionary;
  horario: HorarioResuelto;
  headingLevel?: "h1" | "h2";
}) {
  return (
    <section id="ubicacion" aria-labelledby="ubicacion-title" className="cv-auto bg-papel-2 pt-8 sm:pt-12">
      <div className="container-wide">
        <SectionRule as={headingLevel} id="ubicacion-title" title="Edificio 502 del Parque Tecnológico, en Derio" aside={<span>Cómo llegar</span>} />
      </div>

      {/* Mapa propio a todo el ancho, en los colores de la web. La
          ficha flota a la izquierda, dentro de la retícula, sin tapar el punto.
          En móvil el mapa es más alto y la ficha sube sobre su mitad baja. */}
      <div className="relative mt-10 lg:h-[36rem]">
        <MapaOfi idFicha="ficha-ubicacion" className="aspect-[4/5] sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto" />

        <div className="container-wide pointer-events-none relative z-10 -mt-[38vw] pb-16 sm:-mt-[22vw] lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center lg:pb-0">
          {/* Ficha en papel crema sobre el mapa: filete grueso arriba como los
              titulares de sección, datos clave en tres casillas y una sola acción. */}
          <div id="ficha-ubicacion" className="pointer-events-auto relative bg-crema text-carbon shadow-[0_40px_90px_-30px_rgb(0_0_0/0.65)] sm:max-w-[27rem] lg:w-[27rem]">
            <span aria-hidden="true" className="block h-[3px] bg-carbon" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="kicker whitespace-nowrap text-brasa">Cómo llegar</p>
                <EstadoAhora semana={horario.semana} cierres={horario.cierres} inicial={estadoAhora(horario.semana, undefined, horario.cierres)} className="text-[0.8rem] text-carbon-muted" />
              </div>

              <address className="mt-5 not-italic">
                <p className="font-display text-[1.75rem] leading-none sm:text-[2rem]">{SITE.name}</p>
                <p className="mt-3 text-carbon-muted">
                  {SITE.address.street} · {SITE.address.postalCode} {SITE.address.locality}
                </p>
              </address>

              <dl className="mt-6 grid grid-cols-3 border-y border-tinta-line text-center">
                <div className="py-3.5">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Edificio</dt>
                  <dd className="mt-1 font-display text-xl">502</dd>
                </div>
                <div className="border-x border-tinta-line py-3.5">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Parking</dt>
                  <dd className="mt-1 font-display text-xl">220</dd>
                </div>
                <div className="py-3.5">
                  <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-carbon-muted">Llamar</dt>
                  <dd className="mt-1">
                    <a href={SITE.phone.href} className="font-display text-base tabular-nums underline decoration-carbon/25 underline-offset-4 hover:decoration-brasa">
                      {SITE.phone.display}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <Horario horario={horario} compact />
              </div>

              <a
                href={SITE.maps.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-7 flex min-h-12 items-center justify-between gap-3 bg-brasa px-5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-crema transition-colors duration-300 hover:bg-brasa-700"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="pin" className="h-4 w-4" />
                  {t.cta.comoLlegar}
                </span>
                <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
              </a>
              {SITE.whatsapp ? (
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex min-h-12 items-center justify-center gap-2 border border-carbon/25 text-carbon transition-colors duration-300 hover:border-carbon/60"
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
