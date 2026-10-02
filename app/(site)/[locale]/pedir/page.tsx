import type { Metadata } from "next";
import Link from "next/link";
import { PedirExperience, type PedirModo } from "@/components/pedir/PedirExperience";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { obtenerConfigPedidos, obtenerGrupo, validarMesa } from "@/lib/pedidos/actions";
import { getCartaContent } from "@/lib/restaurant/content";
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
  return pageMetadata({ locale, path: "/pedir", title: "Pedir", noindex: true });
}

export default async function PedirPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mesa, grupo, modo } = await searchParams;

  const [carta, config, mesaR, grupoR] = await Promise.all([
    getCartaContent(),
    obtenerConfigPedidos(),
    mesa ? validarMesa(mesa) : null,
    grupo ? obtenerGrupo(grupo) : null,
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
        <PedirExperience secciones={carta.data} config={config.ok ? config.data : null} modo={modoPedido} />
      )}
    </div>
  );
}
