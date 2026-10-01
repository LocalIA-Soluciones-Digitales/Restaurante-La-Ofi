import Link from "next/link";
import { EspacioCard } from "@/components/home/EspacioCard";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ESPACIOS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";

export function Espacios({ locale }: { locale: Locale }) {
  return (
    <section id="la-ofi" aria-labelledby="espacios-title" className="cv-auto bg-crema py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="espacios-title"
            eyebrow="Espacios"
            title={
              <>
                Cuatro sitios <span className="italic text-terracota">en uno</span>
              </>
            }
            lead="La barra del desayuno, el comedor del mediodía, un despacho para reunirse y la terraza para alargar la tarde."
            className="reveal"
          />
          <Link href={href(locale, "/espacios")} className="btn-secondary reveal self-start md:self-auto">
            Ver espacios y plano
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-12">
          {ESPACIOS.map((e, i) => (
            <li key={e.id} className={`reveal ${i === 0 || i === 3 ? "lg:col-span-7" : "lg:col-span-5"}`}>
              <EspacioCard espacio={e} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
