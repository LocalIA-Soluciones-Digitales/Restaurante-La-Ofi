import Image from "next/image";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * La carta completa: titular claro ("La carta"), un índice visual con una foto
 * por sección y, debajo, los platos. Va tras el menú del día en /menu-del-dia
 * (h2) y sola en /carta (h1).
 */
export function CartaBloque({
  state,
  config,
  heading: Heading = "h2",
}: {
  state: ContentState<CartaSeccion[]>;
  /** Con los pedidos online configurados, la carta deja añadir a la cesta. */
  config: ConfigPedidos | null;
  heading?: "h1" | "h2";
}) {
  const secciones = state.status === "empty" ? [] : state.data.filter((s) => s.items.length > 0);
  const platos = secciones.reduce((n, s) => n + s.items.length, 0);

  return (
    <section id="la-carta" aria-labelledby="carta-title" className={`scroll-mt-4 bg-crema ${Heading === "h1" ? "pt-12 sm:pt-16" : "pt-16 sm:pt-24"}`}>
      <div className="container-wide">
        {/* Qué es esto, dicho sin rodeos: "La carta", cuántos platos y cuándo. */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-14">
          <div className="lg:col-span-7">
            <p className="kicker text-brasa">Todos los días · Desayuno y mediodía</p>
            <Heading id="carta-title" className="mt-3 font-display text-[clamp(3.25rem,9vw,7.5rem)] font-light leading-[0.95] tracking-tight text-carbon">
              La carta
            </Heading>
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <p className="lead">
              {platos > 0 ? `${platos} platos en ${secciones.length} secciones: ` : ""}tostadas de masa madre por la mañana y, a mediodía, entrantes, brasa, carnes,
              pescados y postres.
            </p>
            <p className="mt-3 text-sm text-carbon-muted">
              Toca un plato para ver ingredientes, alérgenos y valores nutricionales{config ? ", o añádelo para recoger" : ""}.
            </p>
          </div>
        </div>

        {/* Índice visual: una foto por sección, con platos y precio desde. Lleva a cada sección. */}
        {secciones.length > 0 ? (
          <nav aria-label="Secciones de la carta" className="mt-10 lg:mt-14">
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {secciones.map((s, i) => {
                const foto = s.items.find((it) => it.imagen)?.imagen ?? null;
                const precios = s.items.map((it) => it.precioCentimos).filter((p): p is number => p !== null);
                const desde = precios.length > 0 ? Math.min(...precios) : null;
                return (
                  <li key={s.slug}>
                    <a href={`#${s.slug}`} className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-carbon p-3.5 text-crema sm:aspect-[5/4] sm:p-5">
                      {foto ? (
                        <Image
                          src={foto.src}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 25vw, 50vw"
                          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <Icon name="wine" className="absolute right-5 top-5 h-8 w-8 text-crema/30" />
                      )}
                      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-carbon/85 via-carbon/30 to-transparent" />
                      <span className="text-[0.7rem] tabular-nums text-crema/70">{String(i + 1).padStart(2, "0")}</span>
                      <span className="mt-1 font-display text-lg leading-tight sm:text-2xl">{s.nombre}</span>
                      <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-crema/80 sm:text-sm">
                        <span>
                          {s.items.length} {s.items.length === 1 ? "plato" : "platos"}
                          {desde !== null ? <span className="hidden sm:inline"> · desde {formatCentimos(desde)}</span> : null}
                        </span>
                        <Icon name="arrow" className="hidden h-4 w-4 rotate-90 transition-transform group-hover:translate-y-0.5 sm:block" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>
      <div className="container-wide pb-16 pt-12 sm:pb-24">
        {state.status === "empty" ? (
          <EmptyState title="Carta en preparación" icon="utensils">
            Muy pronto podrás consultar aquí la carta completa con precios y alérgenos. Mientras tanto, llámanos al{" "}
            <a href={SITE.phone.href} className="font-semibold link-underline">
              {SITE.phone.display}
            </a>
            .
          </EmptyState>
        ) : config ? (
          <CartaConPedido secciones={state.data} config={config} />
        ) : (
          <CartaInteractiva secciones={state.data} />
        )}
        <div className="mt-16">
          <AllergenLegend />
        </div>
      </div>
    </section>
  );
}
