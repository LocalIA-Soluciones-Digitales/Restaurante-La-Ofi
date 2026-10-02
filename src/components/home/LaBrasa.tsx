import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ESPECIALIDADES, VINOS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";

/** La brasa: la foto del plato a lo grande y las especialidades como una carta. */
export function LaBrasa({ locale }: { locale: Locale }) {
  const foto = IMAGES.pulpoBrasa;
  return (
    <section aria-labelledby="brasa-title" className="cv-auto section bg-crema">
      <div className="container-wide grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
        <figure className="lg:sticky lg:top-24 lg:col-span-7">
          <div className="reveal-photo photo-hover relative aspect-[4/5] overflow-hidden bg-papel-3 sm:aspect-[16/11] lg:aspect-[6/5]">
            <Photo img="pulpoBrasa" sizes="(min-width: 1024px) 58vw, 100vw" />
          </div>
          <figcaption className="mt-2 text-xs text-carbon-muted">
            Pulpo a la parrilla{foto.kind === "tercero" ? ` · Foto: ${foto.credit}` : ""}
          </figcaption>
        </figure>

        <div className="lg:col-span-5">
          <p className="kicker text-brasa">A la brasa</p>
          <h2 id="brasa-title" className="t-h2 mt-3 text-carbon">
            Fuego lento y <em>producto de temporada</em>
          </h2>
          <p className="lead mt-4">
            Tomates, pimientos, huevos y carnes de los baserris de alrededor; pescado de mercado y verdura a la parrilla.
          </p>

          <ul className="mt-8 border-t border-tinta-line">
            {ESPECIALIDADES.map((e) => (
              <li key={e.id} className="border-b border-tinta-line py-4">
                <Link href={href(locale, `/carta${e.carta}`)} className="group flex items-baseline justify-between gap-4">
                  <span>
                    <span className="block font-display text-xl text-carbon transition-colors group-hover:text-brasa">{e.nombre}</span>
                    <span className="mt-0.5 block text-sm text-carbon-muted">{e.texto}</span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-carbon/30 transition-transform group-hover:translate-x-1 group-hover:text-brasa" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <SourceBadge fuente="prensa" />
            <p className="text-sm text-carbon-muted">
              <Icon name="wine" className="mr-1.5 inline h-4 w-4 align-[-3px] text-brasa" />
              {VINOS.referencias} referencias de vino y txakoli para el aperitivo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
