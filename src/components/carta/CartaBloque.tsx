import { Photo } from "@/components/media/Photo";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, ContentState } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

/**
 * La carta completa con su banda de foto: va debajo del menú del día en
 * /menu-del-dia (h2) y sola en /carta (h1).
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
      {/* Banda de foto de El Despacho con el titular encima: abre la carta sin comerse la pantalla. */}
      <div className="container-wide">
        <div className="relative isolate flex min-h-[22rem] items-end overflow-hidden bg-carbon text-crema sm:min-h-[26rem] lg:min-h-[30rem]">
          <Photo img="despacho" sizes="(min-width: 1440px) 1360px, 100vw" mobileBelow={0} decorative />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/45 to-carbon/10" />
          <div className="relative grid w-full gap-6 p-6 sm:p-10 lg:grid-cols-12 lg:items-end lg:gap-14 lg:p-14">
            <div className="lg:col-span-8">
              <p className="kicker text-crema/75">La carta{platos > 0 ? ` · ${platos} platos` : ""} · Todos los días</p>
              <Heading id="carta-title" className="t-display mt-4 max-w-[18ch] font-light text-crema">
                Masa madre por la mañana, <em className="text-[#E2B98A]">brasa</em> al mediodía
              </Heading>
            </div>
            <div className="lg:col-span-4 lg:pb-2">
              <p className="text-[0.95rem] leading-relaxed text-crema/85">
                Abre cada plato para ver ingredientes, alérgenos y valores nutricionales{config ? ", y añádelo para recoger" : ""}.
              </p>
              <p className="mt-3 text-sm text-crema/65">Desayunos de 9:00 a 11:30 · El Despacho a mediodía</p>
            </div>
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
