import Image from "next/image";
import Link from "next/link";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";

/** Menú del día "en vivo": lo que el encargado ha publicado hoy desde /admin. */
export function MenuHoy({ locale, t, state }: { locale: Locale; t: Dictionary; state: ContentState<MenuDiaView> }) {
  return (
    <section id="menu-hoy" aria-labelledby="menu-hoy-title" className="cv-auto relative isolate overflow-hidden bg-arena py-20 sm:py-28">
      <div aria-hidden="true" className="hex-pattern absolute inset-0 -z-10 opacity-70" />
      <div className="container-page grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="reveal">
          <SectionHeader
            id="menu-hoy-title"
            momento="mediodia"
            eyebrow="Menú del día en vivo"
            title={
              <>
                Bajar a comer <span className="italic text-terracota">sin pensarlo</span>
              </>
            }
            lead="Cocina casera de lunes a viernes: cuchara, ensalada, pasta o arroz y carne o pescado. Mira lo que hay hoy antes de salir de la oficina."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
              <Icon name="calendar" className="h-4 w-4" />
              Reservar mesa para hoy
            </Link>
            <Link href={href(locale, "/menu-del-dia")} className="btn-secondary">
              {t.cta.verMenuCompleto}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mt-10 hidden aspect-[16/10] overflow-hidden rounded-[2rem] shadow-card lg:block">
            <Image src={IMAGES.comedorRatan.src} alt={IMAGES.comedorRatan.alt} fill sizes="40vw" className="parallax-soft object-cover" />
          </div>
        </div>
        <div className="reveal">
          <MenuDelDia state={state} live />
        </div>
      </div>
    </section>
  );
}
