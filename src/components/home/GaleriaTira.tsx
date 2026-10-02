import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import type { ImageKey } from "@/lib/images";
import { SITE } from "@/lib/site";

// Secuencia de tamaños distintos (no una rejilla de miniaturas iguales).
const TIRA: { img: ImageKey; w: string; aspect: string }[] = [
  { img: "tostadaSalmon", w: "w-[58vw] sm:w-[19rem]", aspect: "aspect-[4/5]" },
  { img: "rotuloNeon", w: "w-[78vw] sm:w-[28rem]", aspect: "aspect-[4/3]" },
  { img: "tostadaRevuelta", w: "w-[58vw] sm:w-[17rem]", aspect: "aspect-[4/5]" },
  { img: "terrazaCarpa", w: "w-[78vw] sm:w-[26rem]", aspect: "aspect-[5/3]" },
  { img: "cartaTostadas", w: "w-[58vw] sm:w-[19rem]", aspect: "aspect-square" },
];

export function GaleriaTira({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="galeria-title" className="cv-auto section overflow-hidden bg-crema pt-0 sm:pt-0">
      <div className="container-wide flex flex-wrap items-end justify-between gap-6">
        <h2 id="galeria-title" className="t-h3 text-carbon">
          Más de La Ofi
        </h2>
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
      <ul className="no-scrollbar mt-6 flex snap-x items-end gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {TIRA.map((t) => (
          <li key={t.img} className={`${t.w} shrink-0 snap-start`}>
            <Link href={href(locale, "/galeria")} className="photo-hover block">
              <div className={`relative overflow-hidden bg-papel-3 ${t.aspect}`}>
                <Photo img={t.img} sizes="(min-width: 640px) 28rem, 78vw" mobileBelow={0} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
