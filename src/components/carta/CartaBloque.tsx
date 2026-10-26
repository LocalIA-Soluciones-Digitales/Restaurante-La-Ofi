import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaIndice } from "@/components/carta/CartaIndice";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCentimos } from "@/lib/format";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * La carta completa: titular claro ("La carta"), el índice de secciones como el
 * de una carta impresa y, debajo, los platos. Va tras el menú del día en /menu-del-dia
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

        {secciones.length > 0 ? (
          <div className="mt-10 lg:mt-14">
            <CartaIndice
              entradas={secciones.map((s) => {
                const precios = s.items.map((it) => it.precioCentimos).filter((p): p is number => p !== null);
                return {
                  slug: s.slug,
                  nombre: s.nombre,
                  platos: s.items.length,
                  desde: precios.length > 0 ? formatCentimos(Math.min(...precios)) : null,
                  foto: s.items.find((it) => it.imagen)?.imagen ?? null,
                };
              })}
            />
          </div>
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
