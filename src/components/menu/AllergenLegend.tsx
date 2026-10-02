import { ALERGENOS } from "@/lib/allergens";
import { AllergenIcon } from "@/components/menu/AllergenIcon";

/** Leyenda accesible de los 14 alérgenos del Reglamento UE 1169/2011. */
export function AllergenLegend() {
  return (
    <section aria-labelledby="leyenda-alergenos" className="border-t border-tinta-line pt-10">
      <h2 id="leyenda-alergenos" className="t-h3 text-carbon">
        Alérgenos
      </h2>
      <p className="mt-2 text-sm text-carbon-muted">
        Información según el Reglamento (UE) 1169/2011. Si tienes alguna alergia o intolerancia, avísanos antes de pedir:
        el personal te informará de los alérgenos de cada plato, incluidos los platos del día.
      </p>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALERGENOS.map((a) => (
          <div key={a.key} className="flex items-start gap-3">
            <dt className="flex shrink-0 items-center gap-2 font-semibold text-carbon">
              <span className="grid h-8 w-8 place-items-center rounded-full text-brasa ring-1 ring-brasa/25">
                <AllergenIcon alergeno={a.key} className="h-5 w-5" />
              </span>
              <span className="w-28 text-sm">{a.label}</span>
            </dt>
            <dd className="pt-1.5 text-xs leading-relaxed text-carbon-muted">{a.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
