import Link from "next/link";
import { Gallery } from "@/components/gallery/Gallery";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GALLERY } from "@/lib/gallery";
import { href, type Locale } from "@/lib/i18n";

export function GaleriaSection({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="galeria-title" className="cv-auto bg-crema py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="galeria-title"
            momento="tarde"
            eyebrow="Galería"
            title="Ratán, madera y luz natural"
            lead="Un vistazo al local: la barra, el comedor, la terraza y lo que sale de cocina."
            className="reveal"
          />
          <Link href={href(locale, "/galeria")} className="btn-secondary reveal self-start md:self-auto">
            Ver galería
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-12">
          <Gallery images={GALLERY.slice(0, 6)} />
        </div>
      </div>
    </section>
  );
}
