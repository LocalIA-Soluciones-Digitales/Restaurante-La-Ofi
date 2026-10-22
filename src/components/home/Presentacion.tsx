import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import type { CSSProperties } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Icon } from "@/components/ui/Icon";
import { SectionRule } from "@/components/ui/SectionRule";
import { VINOS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import type { ImageKey } from "@/lib/images";

// Tres fotos verticales del local (fotógrafo, 2026-10-17). mobileBelow alto: se
// sirve siempre el recorte 4:5, que es el que encaja en la columna vertical.
const TRIPTICO: { img: ImageKey; label: string }[] = [
  { img: "barra", label: "La barra" },
  { img: "comedorRatan", label: "El comedor" },
  { img: "terraza", label: "La terraza" },
];

/**
 * Presentación justo después del hero: tríptico de fotos, cabecera con filete y
 * tres columnas de texto (el local, la cocina y los reconocimientos). Los datos
 * de confianza (Google, prensa) viven aquí como texto, no como cinta animada.
 */
export function Presentacion({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="presentacion-title" className="section bg-crema">
      <div className="container-wide">
        <ul className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
          {TRIPTICO.map((t, i) => (
            <li key={t.img} className={`float-y ${i === 1 ? "lg:-mt-10" : "lg:mt-6"}`} style={{ "--f": `${[24, -18, 40][i]}px` } as CSSProperties}>
              <figure>
                <div className="parallax photo-hover relative aspect-[3/4] overflow-hidden bg-papel-3">
                  <Photo img={t.img} sizes="(min-width: 1024px) 30vw, 33vw" mobileBelow={9999} />
                </div>
                <figcaption className="kicker mt-3 hidden text-carbon-muted sm:block">{t.label}</figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <SectionRule
          id="presentacion-title"
          className="mt-16 lg:mt-24"
          title="El restaurante del Parque Tecnológico"
          aside={<span>Derio · Desde las 7:30</span>}
        />

        <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-10 lg:gap-16">
          <Columna titulo="El local">
            <p>
              Comedor de lámparas de ratán y baldosa hexagonal, barra con café desde primera hora, El Despacho para comidas de
              trabajo y una terraza cubierta para hasta 220 personas.
            </p>
            <Link href={href(locale, "/espacios")} className="link-arrow mt-5">
              Ver los espacios
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Columna>
          <Columna titulo="La cocina">
            <p>
              Tostadas de pan de masa madre por la mañana, plato del día casero de lunes a viernes y parrilla: pescado según
              mercado, carne y verdura de los baserris de alrededor.
            </p>
            <Link href={href(locale, "/carta")} className="link-arrow mt-5">
              Ver la carta
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Columna>
          <Columna titulo="Reconocimientos">
            <ul className="divide-y divide-tinta-line border-y border-tinta-line">
              <li className="flex items-baseline justify-between gap-4 py-3">
                {/* Las reseñas viven en la ficha de Google Business: no se moderan aquí. */}
                <a href={SITE.maps.place} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  Valoración en Google
                </a>
                <span className="font-display text-xl text-carbon">
                  <CountUp value={4.4} decimals={1} />
                </span>
              </li>
              <li className="py-3">
                Su pulpo a la brasa y sus carrilleras, en <span className="text-carbon">Deia</span> (septiembre de 2025)
              </li>
              <li className="flex items-baseline justify-between gap-4 py-3">
                <span>Referencias de vino y txakoli</span>
                <span className="font-display text-xl text-carbon">
                  <CountUp value={VINOS.referencias} />
                </span>
              </li>
            </ul>
          </Columna>
        </div>
      </div>
    </section>
  );
}

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-tinta-line pt-5">
      <h3 className="kicker text-carbon">{titulo}</h3>
      <div className="mt-4 text-[0.98rem] leading-relaxed text-carbon-muted">{children}</div>
    </div>
  );
}
