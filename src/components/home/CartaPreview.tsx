import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatCentimos } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";

export function CartaPreview({ locale, t, state }: { locale: Locale; t: Dictionary; state: ContentState<CartaSeccion[]> }) {
  return (
    <section aria-labelledby="carta-preview-title" className="cv-auto bg-arena py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="carta-preview-title"
            momento="mediodia"
            eyebrow="Carta"
            title="Producto de temporada y mucha brasa"
            lead="Pescado según mercado, carnes a la parrilla, verduras de los caseríos cercanos y postres caseros."
            className="reveal"
          />
          <Link href={href(locale, "/carta")} className="btn-primary reveal self-start md:self-auto">
            {t.cta.verCarta}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        {state.status === "empty" ? (
          <div className="mt-12">
            <EmptyState title="Carta en preparación" icon="utensils">
              Muy pronto podrás consultar aquí la carta completa con precios y alérgenos.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-12 grid gap-5 md:grid-cols-2">
            {state.data.slice(0, 4).map((seccion) => (
              <li key={seccion.id} className="reveal rounded-[1.75rem] bg-crema p-6 shadow-card sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl text-carbon">{seccion.nombre}</h3>
                  <SourceBadge fuente={seccion.items[0]?.fuente ?? "supabase"} />
                </div>
                <ul className="mt-5 divide-y divide-dashed divide-carbon/15">
                  {seccion.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                      <span className="text-carbon">{item.nombre}</span>
                      <span className="shrink-0 text-sm font-semibold text-marino">
                        {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : t.common.precioConsultar}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`${href(locale, "/carta")}#${seccion.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracota hover:underline"
                >
                  Ver {seccion.nombre.toLowerCase()}
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
