import type { Metadata } from "next";
import Link from "next/link";
import { PedirExperience, type PedirModo } from "@/components/pedir/PedirExperience";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Proximamente } from "@/components/ui/Proximamente";
import { href, type Locale } from "@/lib/i18n";
import { PROXIMAMENTE } from "@/lib/lanzamiento";
import { obtenerConfigPedidos, obtenerGrupo, validarMesa } from "@/lib/pedidos/actions";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Destino de los QR de mesa (/pedir?mesa=<token>), del pedido para recoger
// (/pedir) y de los pedidos de grupo (/pedir?grupo=<token>, /pedir?modo=grupo).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ mesa?: string; grupo?: string; modo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/pedir",
    title: "Pedir para llevar",
    description: "Pide en La Ofi desde el móvil y recoge en barra a la hora que elijas, o pide desde tu mesa. Edificio 502 del Parque Tecnológico de Bizkaia.",
    noindex: true,
  });
}

export default async function PedirPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mesa, grupo, modo } = await searchParams;

  const [carta, config, mesaR, grupoR, menu] = await Promise.all([
    getCartaContent(),
    obtenerConfigPedidos(),
    mesa ? validarMesa(mesa) : null,
    grupo ? obtenerGrupo(grupo) : null,
    // Solo el de hoy y dentro de su franja (8:00–16:00).
    getMenuDiaContent(),
  ]);

  // QR o enlace de grupo que no existe (o mesa desactivada): mensaje claro.
  if ((mesa && !(mesaR?.ok && mesaR.data)) || (grupo && !(grupoR?.ok && grupoR.data))) {
    return (
      <div className="container-page max-w-2xl pb-20 pt-32 sm:pt-40">
        <EmptyState title={mesa ? "No reconocemos esta mesa" : "Este pedido de grupo no existe"} icon="qr">
          {mesa ? "Puede que el código QR haya cambiado. Pide ayuda al personal o llámanos al " : "Pide a quien lo creó que te pase el enlace de nuevo, o llámanos al "}
          <a href={SITE.phone.href} className="font-semibold link-underline">
            {SITE.phone.display}
          </a>
          .
        </EmptyState>
        <div className="mt-8 text-center">
          <Link href={href(locale, "/carta")} className="btn-secondary">
            <Icon name="utensils" className="h-4 w-4" />
            Ver la carta
          </Link>
        </div>
      </div>
    );
  }

  const modoPedido: PedirModo =
    mesa && mesaR?.ok && mesaR.data
      ? { tipo: "mesa", mesa: mesaR.data, token: mesa }
      : grupo && grupoR?.ok && grupoR.data
        ? { tipo: "grupo", grupo: grupoR.data }
        : modo === "grupo"
          ? { tipo: "crear-grupo" }
          : { tipo: "recogida" };

  // Para llevar y pedidos de grupo, «Próximamente» (src/lib/lanzamiento.ts); desde la mesa, sí.
  if (PROXIMAMENTE.pedidos && (modoPedido.tipo === "recogida" || modoPedido.tipo === "crear-grupo")) {
    return (
      <div className="bg-crema pb-20 pt-24 sm:pb-28 lg:pt-32">
        <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="kicker text-brasa">Para llevar</p>
            <h1 className="t-display mt-4 text-carbon">Pide y recoge</h1>
            <p className="lead mt-5">El menú del día o lo que quieras de la carta, listo en barra a tu hora. Muy pronto, desde aquí.</p>
            <div className="mt-8 border-y border-tinta-line py-6">
              <p className="text-sm text-carbon-muted">Mientras tanto, encárgalo por teléfono</p>
              <a href={SITE.phone.href} className="mt-1 inline-flex items-center gap-3 font-display text-4xl tabular-nums text-carbon hover:text-brasa">
                <Icon name="phone" className="h-6 w-6 text-brasa" />
                {SITE.phone.display}
              </a>
            </div>
          </div>
          <div className="min-w-0 lg:col-span-8">
            <Proximamente
              titulo="Pide desde el móvil y recoge a tu hora"
              texto="Estamos terminando los pedidos para llevar: el menú del día y la carta, con la hora de recogida que elijas."
              foto="barra"
              primero="Pedir para llevar"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link href={href(locale, "/menu-del-dia")} className="btn-primary px-6">
                  Ver el menú de hoy
                </Link>
                <Link href={href(locale, "/carta")} className="btn-secondary px-6">
                  <Icon name="utensils" className="h-4 w-4" />
                  Ver la carta
                </Link>
              </div>
            </Proximamente>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page pt-20 sm:pt-24">
      {carta.status === "empty" ? (
        <EmptyState title="Carta en preparación" icon="utensils">
          Muy pronto podrás pedir desde aquí. Mientras tanto, llámanos al{" "}
          <a href={SITE.phone.href} className="font-semibold link-underline">
            {SITE.phone.display}
          </a>
          .
        </EmptyState>
      ) : (
        <PedirExperience
          secciones={carta.data}
          config={config.ok ? config.data : null}
          modo={modoPedido}
          menu={
            menu.status === "real"
              ? { precio_centimos: menu.data.precioCentimos, incluye: menu.data.incluye, platos: [...menu.data.platos, ...menu.data.primeros, ...menu.data.segundos, ...menu.data.postres] }
              : null
          }
        />
      )}
    </div>
  );
}
