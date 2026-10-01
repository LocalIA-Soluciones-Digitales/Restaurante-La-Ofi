import Link from "next/link";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EMPRESAS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { VIDEOS } from "@/lib/media";

/** Empresas del Parque: el público natural de La Ofi por ubicación. */
export function Empresas({ locale, headingLevel = "h2" }: { locale: Locale; headingLevel?: "h1" | "h2" }) {
  return (
    <section id="empresas" aria-labelledby="empresas-title" className="cv-auto relative isolate overflow-hidden bg-marino-900 py-20 text-crema sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 mix-blend-screen">
        <AmbientVideo video={VIDEOS.ambienteNeon} showPoster={false} />
      </div>
      <div aria-hidden="true" className="hex-pattern-night absolute inset-0 -z-10" />
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="reveal lg:sticky lg:top-28">
          <SectionHeader
            id="empresas-title"
            as={headingLevel}
            eyebrow="Empresas del Parque"
            dark
            title={
              <>
                Tu equipo, <span className="italic text-neon">a dos pasos</span>
              </>
            }
            lead="Estamos en el edificio 502 del Parque Tecnológico. Reuniones con comida, pedidos de grupo para recoger y factura a nombre de tu empresa."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(locale, "/pedir?modo=grupo")} className="btn-neon">
              <Icon name="users" className="h-4 w-4" />
              Crear pedido de grupo
            </Link>
            <Link href={href(locale, "/empresas#contacto")} className="btn-ghost-light">
              <Icon name="briefcase" className="h-4 w-4" />
              Reservar El Despacho
            </Link>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {EMPRESAS.map((s, i) => (
            <li
              key={s.titulo}
              className={`reveal rounded-[1.75rem] border border-crema/10 bg-crema/[0.04] p-6 backdrop-blur-sm transition-colors hover:border-neon/40 ${i % 2 === 1 ? "sm:translate-y-8" : ""}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-neon/15 text-neon">
                <Icon name={s.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-2xl text-crema">{s.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-crema/75">{s.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
