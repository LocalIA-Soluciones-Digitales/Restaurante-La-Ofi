import Link from "next/link";
import { DishPhoto } from "@/components/media/DishPhoto";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { PRIORIDAD_FOTO } from "@/lib/carta-fotos";
import { formatCentimos } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import { esIlustrativa, imageKeyBySrc } from "@/lib/images";
import type { CartaItem, CartaSeccion, ContentState } from "@/lib/restaurant/types";

/**
 * Los platos de la carta que tienen foto real, grandes. Sale de la propia carta:
 * cuando el restaurante sube una foto desde /admin, el plato aparece aquí.
 */
export function PlatosQueApetecen({ locale, carta }: { locale: Locale; carta: ContentState<CartaSeccion[]> }) {
  if (carta.status === "empty") return null;
  const platos = carta.data.flatMap((s) => s.items.map((item) => ({ item, seccion: s }))).filter(({ item }) => item.imagen);
  // Abre el plato destacado; después, las mejores fotos (las subidas desde /admin, al final del orden fijo).
  const rango = (i: CartaItem) => {
    const k = imageKeyBySrc(i.imagen!.src);
    const p = k ? PRIORIDAD_FOTO.indexOf(k) : -1;
    return p === -1 ? PRIORIDAD_FOTO.length : p;
  };
  platos.sort((a, b) => Number(b.item.destacado) - Number(a.item.destacado) || rango(a.item) - rango(b.item));
  const lista = platos.slice(0, 5);
  if (lista.length === 0) return null;
  const fuente = lista[0]!.item.fuente;

  return (
    <section aria-labelledby="platos-title" className="cv-auto section overflow-hidden bg-crema">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kicker text-brasa">De la barra y la cocina</p>
            <h2 id="platos-title" className="t-h2 mt-3 max-w-[18ch] text-carbon">
              Pan de masa madre, buen producto y brasa
            </h2>
          </div>
          <div className="flex items-center gap-5">
            <SourceBadge fuente={fuente} />
            {lista.some(({ item }) => esIlustrativa(item.imagen!.src)) ? <span className="text-xs text-carbon-muted">Imágenes ilustrativas</span> : null}
            <Link href={href(locale, "/carta")} className="link-arrow">
              Ver la carta
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Móvil: tira táctil con snap. Escritorio: composición asimétrica. */}
        <ul className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10 lg:overflow-visible lg:px-0">
          {lista.map(({ item, seccion }, i) => (
            <li
              key={item.id}
              className={`w-[78vw] max-w-[22rem] shrink-0 snap-start sm:w-[44vw] lg:w-auto lg:max-w-none ${
                i === 0 ? "lg:col-span-6 lg:row-span-2" : "lg:col-span-3"
              }`}
            >
              <Plato item={item} grande={i === 0} seccion={seccion.slug} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Plato({ item, grande, seccion, locale }: { item: CartaItem; grande: boolean; seccion: string; locale: Locale }) {
  return (
    <Link href={href(locale, `/carta#${seccion}`)} className="photo-hover group block">
      <div className={`reveal-photo relative overflow-hidden bg-papel-3 ${grande ? "aspect-[4/5] lg:aspect-[5/6]" : "aspect-[4/5]"}`}>
        <DishPhoto imagen={item.imagen!} sizes={grande ? "(min-width: 1024px) 45vw, 78vw" : "(min-width: 1024px) 22vw, 78vw"} decorative />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h3 className={`font-display leading-tight text-carbon ${grande ? "text-2xl sm:text-[1.75rem]" : "text-xl"}`}>{item.nombre}</h3>
        <span className="shrink-0 font-display text-lg tabular-nums text-carbon">
          {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : null}
        </span>
      </div>
      {item.descripcion ? <p className="mt-1 text-sm leading-relaxed text-carbon-muted">{item.descripcion}</p> : null}
    </Link>
  );
}
