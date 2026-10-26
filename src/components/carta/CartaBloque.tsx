import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * La carta completa con su cabecera tipográfica: va debajo del menú del día en
 * /menu-del-dia (h2) y sola en /carta (h1). Sin foto de cabecera: las fotos
 * mandan en los platos.
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
  const platos = state.status === "empty" ? 0 : state.data.reduce((n, s) => n + s.items.length, 0);

  return (
    <section id="la-carta" aria-labelledby="carta-title" className={`scroll-mt-4 bg-crema ${Heading === "h1" ? "pt-12 sm:pt-16" : "pt-16 sm:pt-20"}`}>
      <div className="container-wide">
        <div className="grid gap-6 border-t border-carbon pt-8 lg:grid-cols-12 lg:items-end lg:gap-14 lg:pt-10">
          <div className="lg:col-span-8">
            <p className="kicker text-brasa">La carta{platos > 0 ? ` · ${platos} platos` : ""} · Todos los días</p>
            <Heading id="carta-title" className="t-display mt-4 max-w-[18ch] font-light text-carbon">
              Masa madre por la mañana, <em className="text-madera">brasa</em> al mediodía
            </Heading>
          </div>
          <div className="lg:col-span-4 lg:pb-2">
            <p className="lead">
              Abre cada plato para ver ingredientes, alérgenos y valores nutricionales{config ? ", y añádelo para recoger" : ""}.
            </p>
            <p className="mt-4 text-sm text-carbon-muted">Desayunos de 9:00 a 11:30 · El Despacho a mediodía</p>
          </div>
        </div>
      </div>
      <div className="container-wide pb-16 pt-10 sm:pb-24">
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
