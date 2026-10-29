import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaBodega, esSeccionDeVino } from "@/components/carta/CartaBodega";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * La carta completa: titular claro ("La carta") y, debajo, los platos por
 * secciones (el índice vive en la barra de la carta, sin repetirse aquí). Va tras el menú del día en /menu-del-dia
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
  // Los vinos no son platos: van en «La bodega», con formato de carta de vinos.
  const todas = state.status === "empty" ? [] : state.data.filter((s) => s.items.length > 0);
  const secciones = todas.filter((s) => !esSeccionDeVino(s));
  const vinos = todas.filter(esSeccionDeVino);
  const platos = secciones.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <section id="la-carta" aria-labelledby="carta-title" className={`scroll-mt-4 bg-crema ${Heading === "h1" ? "pt-12 sm:pt-16" : "pt-16 sm:pt-24"}`}>
        <div className="container-wide">
          {/* Qué es esto, dicho sin rodeos: "La carta", cuántos platos y cuándo. */}
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="lg:col-span-7">
              <p className="kicker text-brasa">Lunes a viernes · Desayuno y mediodía</p>
              <Heading id="carta-title" className="mt-3 font-display text-[clamp(3.25rem,9vw,7.5rem)] font-light leading-[0.95] tracking-tight text-carbon">
                La carta
              </Heading>
            </div>
            <div className="lg:col-span-5 lg:pb-3">
              <p className="lead">
                {platos > 0 ? `${platos} platos en ${secciones.length} secciones: ` : ""}tostadas de masa madre por la mañana y, a mediodía, entrantes, brasa, carnes,
                pescados y postres.
                {vinos.length > 0 ? (
                  <>
                    {" "}
                    Y para acompañar,{" "}
                    <a href="#la-bodega" className="link-underline">
                      la bodega
                    </a>
                    .
                  </>
                ) : null}
              </p>
              <p className="mt-3 text-sm text-carbon-muted">
                Toca un plato para ver ingredientes y valores nutricionales{config ? ", o añádelo para recoger" : ""}. Si tienes alguna alergia, pregúntanos antes de pedir.
              </p>
            </div>
          </div>

        </div>
        <div className="container-wide pb-16 pt-8 sm:pb-24 sm:pt-10">
          {state.status === "empty" ? (
            <EmptyState title="Carta en preparación" icon="utensils">
              Muy pronto podrás consultar aquí la carta completa con precios y alérgenos. Mientras tanto, llámanos al{" "}
              <a href={SITE.phone.href} className="font-semibold link-underline">
                {SITE.phone.display}
              </a>
              .
            </EmptyState>
          ) : config ? (
            <CartaConPedido secciones={secciones} config={config} />
          ) : (
            <CartaInteractiva secciones={secciones} />
          )}
          <div className="mt-16">
            <AllergenLegend />
          </div>
        </div>
      </section>
      <CartaBodega secciones={vinos} />
    </>
  );
}
