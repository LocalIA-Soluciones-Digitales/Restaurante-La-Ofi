import Link from "next/link";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/lib/i18n";
import type { ContentState, MenuDiaView } from "@/lib/restaurant/types";

export function MenuHoy({ locale, t, state }: { locale: Locale; t: Dictionary; state: ContentState<MenuDiaView> }) {
  return (
    <section aria-labelledby="menu-hoy-title" className="cv-auto relative bg-crema py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="reveal">
          <SectionHeader
            id="menu-hoy-title"
            momento="mediodia"
            eyebrow="Menú de hoy"
            title="Bajar a comer sin pensarlo"
            lead="Cocina casera, cuchara, brasa y postre de la casa. Consulta aquí lo que hay hoy antes de salir de la oficina."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(locale, "/menu-del-dia")} className="btn-primary">
              {t.cta.verMenuCompleto}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="reveal">
          <MenuDelDia state={state} />
        </div>
      </div>
    </section>
  );
}
