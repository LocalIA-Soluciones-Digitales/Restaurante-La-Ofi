import type { Metadata } from "next";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { CartaConPedido } from "@/components/carta/CartaConPedido";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import { CartaTabs } from "@/components/carta/CartaTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/ui/JsonLd";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IS_DEMO } from "@/lib/env";
import type { Locale } from "@/lib/i18n";
import { obtenerConfigPedidos } from "@/lib/pedidos/actions";
import { getCartaContent } from "@/lib/restaurant/content";
import { menuJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 86400;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/carta",
    title: "Carta",
    description: "Carta de La Ofi en Derio: tostadas de desayuno y, en El Despacho, entrantes, brasa, carnes, pescados y postres, con precios, ingredientes y valores nutricionales.",
  });
}

/**
 * Cabecera tipográfica, sin foto: pestañas menú/carta, titular y una fila de
 * datos en casillas con filete (como la cabecera del sitio). Las fotos mandan
 * después, en los platos.
 */
export default async function CartaPage({ params }: Params) {
  const { locale } = await params;
  const [state, configR] = await Promise.all([getCartaContent(), obtenerConfigPedidos()]);
  // Con los pedidos online configurados, la carta deja añadir a la cesta.
  const config = configR.ok ? configR.data : null;
  const platos = state.status === "empty" ? 0 : state.data.reduce((n, s) => n + s.items.length, 0);
  const secciones = state.status === "empty" ? 0 : state.data.filter((s) => s.items.length > 0).length;

  const datos: { icon: IconName; titulo: string; texto: string }[] = [
    { icon: "coffee", titulo: "Desayunos", texto: "Tostadas de masa madre, 9:00–11:30" },
    { icon: "flame", titulo: "El Despacho", texto: "Entrantes, brasa, carnes y pescados" },
    config
      ? { icon: "bag", titulo: "Para recoger", texto: "Pide desde la carta y pasa a buscarlo" }
      : { icon: "utensils", titulo: "En sala", texto: "Comedor, barra y terraza" },
    { icon: "leaf", titulo: "Alérgenos", texto: "Los 14, indicados en cada plato" },
  ];

  return (
    <>
      {state.status === "real" && !IS_DEMO ? <JsonLd data={menuJsonLd(state.data)} /> : null}
      <header className="bg-crema pt-24 lg:pt-32">
        <div className="container-wide">
          <CartaTabs locale={locale} actual="carta" />
          <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-12 lg:items-end lg:gap-14">
            <div className="lg:col-span-8">
              <p className="kicker text-brasa">
                La carta{platos > 0 ? ` · ${platos} platos en ${secciones} secciones` : ""}
              </p>
              <h1 id="carta-title" className="t-display mt-4 max-w-[18ch] font-light text-carbon">
                Masa madre por la mañana, brasa al mediodía
              </h1>
            </div>
            <p className="lead lg:col-span-4 lg:pb-2">
              Abre cada plato para ver ingredientes, alérgenos y valores nutricionales{config ? ", y añádelo para recoger" : ""}.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-2 border-y border-tinta-line lg:mt-16 lg:grid-cols-4">
            {datos.map((d, i) => (
              <li
                key={d.titulo}
                className={`flex gap-3 py-5 pr-4 sm:py-6 ${i % 2 === 1 ? "border-l border-tinta-line pl-4" : ""} ${i > 1 ? "border-t border-tinta-line lg:border-t-0" : ""} ${
                  i === 2 ? "lg:border-l lg:pl-6" : i > 0 ? "lg:pl-6" : ""
                }`}
              >
                <Icon name={d.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
                <span>
                  <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-carbon">{d.titulo}</span>
                  <span className="mt-1 block text-sm text-carbon-muted">{d.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </header>
      <div className="container-wide pb-16 pt-6 sm:pb-24">
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
    </>
  );
}
