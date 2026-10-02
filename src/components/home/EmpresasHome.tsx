import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { EMPRESAS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";

/** Empresas del Parque y celebraciones: foto real del salón + servicios en lista, no en tarjetas. */
export function EmpresasHome({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="empresas-title" className="section bg-papel-2">
      <div className="container-wide grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
        <figure className="lg:order-2 lg:col-span-6">
          <div className="reveal-photo photo-hover relative aspect-[4/5] overflow-hidden bg-papel-3 sm:aspect-[3/2]">
            <Photo img="salonNoche" sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
          <figcaption className="mt-2 text-xs text-carbon-muted">El salón preparado para una celebración</figcaption>
        </figure>

        <div className="lg:order-1 lg:col-span-6">
          <p className="kicker text-brasa">Empresas y celebraciones</p>
          <h2 id="empresas-title" className="t-h2 mt-3 text-carbon">
            Comer con tu equipo sin salir del Parque
          </h2>
          <ol className="mt-8 border-t border-tinta-line">
            {EMPRESAS.map((s, i) => (
              <li key={s.titulo} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-tinta-line py-4">
                <span aria-hidden="true" className="pt-1 text-xs tabular-nums text-brasa">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl text-carbon">{s.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-carbon-muted">{s.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={href(locale, "/empresas")} className="btn-dark">
              Comidas de empresa
            </Link>
            <Link href={href(locale, "/eventos")} className="btn-secondary">
              Eventos y celebraciones
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
