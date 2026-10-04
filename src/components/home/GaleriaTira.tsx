import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES, type ImageKey } from "@/lib/images";
import { SITE } from "@/lib/site";

// Misma altura para todas y ancho según su proporción: una línea de horizonte
// limpia arriba y abajo, con ritmo de anchos distintos (no miniaturas iguales).
const TIRA: { img: ImageKey; aspect: string; etiqueta: string }[] = [
  { img: "cafeLatte", aspect: "aspect-[4/5]", etiqueta: "Café" },
  { img: "pintxosBarra", aspect: "aspect-[4/3]", etiqueta: "Pintxos en barra" },
  { img: "tostadaRevuelta", aspect: "aspect-[4/5]", etiqueta: "Desayunos" },
  { img: "terrazaCarpa", aspect: "aspect-[4/3]", etiqueta: "La terraza" },
  { img: "brasaCarne", aspect: "aspect-[4/5]", etiqueta: "A la brasa" },
];

// Mismo margen izquierdo que .container-wide (max-w 90rem + lg:px-10), para que
// la primera foto arranque en la vertical del título y la tira sangre a la derecha.
const GUTTER = "px-4 sm:px-6 lg:px-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))]";
const SCROLL_PAD = "scroll-px-4 sm:scroll-px-6 lg:scroll-px-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))]";

export function GaleriaTira({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="galeria-title" className="cv-auto section overflow-hidden bg-crema">
      <div className="container-wide flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="kicker text-brasa">En Instagram y en la galería</p>
          <h2 id="galeria-title" className="t-h2 mt-3 text-carbon">
            Más de La Ofi
          </h2>
        </div>
        <div className="flex gap-6">
          <Link href={href(locale, "/galeria")} className="link-arrow">
            Galería
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className="link-arrow">
            {SITE.instagram.handle}
          </a>
        </div>
      </div>
      <ul className={`no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 ${GUTTER} ${SCROLL_PAD}`}>
        {TIRA.map((t) => (
          <li key={t.img} className={`h-[clamp(15rem,30vw,25rem)] shrink-0 snap-start ${t.aspect}`}>
            <Link href={href(locale, "/galeria")} className="photo-hover group relative block h-full overflow-hidden bg-papel-3">
              <Photo img={t.img} sizes="(min-width: 1024px) 34rem, 80vw" mobileBelow={0} />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-carbon/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
              <span className="absolute bottom-3 left-4 text-sm font-medium text-crema opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:translate-y-1">
                {t.etiqueta}
                <span className="sr-only"> · {IMAGES[t.img].alt}</span>
              </span>
            </Link>
          </li>
        ))}
        {/* Hueco final: la última foto no queda pegada al borde al hacer scroll. */}
        <li aria-hidden="true" className="w-px shrink-0" />
      </ul>
    </section>
  );
}
