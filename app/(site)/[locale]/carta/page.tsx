import type { Metadata } from "next";
import Link from "next/link";
import { CartaBloque } from "@/components/carta/CartaBloque";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { IS_DEMO } from "@/lib/env";
import { formatCentimos } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { menuJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";

// 5 min: el menú del día aparece a las 8:00 y desaparece a las 16:00 sin que nadie toque nada.
export const revalidate = 300;

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
 * La carta sola, para quien llega directo (Google, un enlace): arriba, una franja
 * con el menú del día de hoy que lleva a la página de "Carta y menú".
 */
export default async function CartaPage({ params }: Params) {
  const { locale } = await params;
  const [state, menu] = await Promise.all([getCartaContent(), getMenuDiaContent()]);
  const platosHoy = menu.status === "empty" ? [] : [...menu.data.platos, ...menu.data.primeros, ...menu.data.segundos].map((p) => p.nombre);

  return (
    <>
      {state.status === "real" && !IS_DEMO ? <JsonLd data={menuJsonLd(state.data)} /> : null}
      <div className="bg-crema pt-16 lg:pt-[4.5rem]">
        {menu.status !== "empty" ? (
          <Link
            href={href(locale, "/menu-del-dia")}
            className="group block border-b border-tinta-line bg-papel-2 transition-colors hover:bg-papel-3"
          >
            <span className="container-wide flex min-h-14 items-center gap-4 py-3 text-sm">
              <span className="kicker shrink-0 text-brasa">Menú del día</span>
              <span className="hidden min-w-0 flex-1 truncate text-carbon-muted sm:block">{platosHoy.join(" · ")}</span>
              <span className="ml-auto flex shrink-0 items-center gap-3 font-semibold text-carbon">
                {menu.data.precioCentimos !== null ? formatCentimos(menu.data.precioCentimos) : null}
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </span>
          </Link>
        ) : null}
      </div>
      <CartaBloque state={state} config={null} heading="h1" />
    </>
  );
}
