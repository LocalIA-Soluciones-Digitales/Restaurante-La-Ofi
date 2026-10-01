import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Destino de los QR de mesa (/pedir?mesa=<identificador>). V1: solo preparado.
// Siguiente fase: tablas laofi.mesas/pedidos en el schema propio, RPC laofi_* y
// la experiencia de carrito portada de Palomita-Bar (ver ARCHITECTURE.md §5).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ mesa?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/pedir", title: "Pedir desde la mesa", noindex: true });
}

const IDENTIFICADOR_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export default async function PedirPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mesa } = await searchParams;
  const etiqueta = mesa && IDENTIFICADOR_VALIDO.test(mesa) ? `Mesa ${mesa}` : null;

  return (
    <div className="container-page max-w-2xl pb-20 pt-32 sm:pt-40">
      <p className="eyebrow text-terracota">{etiqueta ?? "Pedir desde la mesa"}</p>
      <h1 className="mt-3 text-5xl text-carbon">Muy pronto podrás pedir desde aquí</h1>
      <p className="mt-4 text-lg text-carbon-muted">
        Estamos preparando los pedidos desde la mesa: escanearás el código QR, elegirás en la carta y tu pedido llegará
        directamente a cocina y barra.
      </p>
      <div className="mt-10">
        <EmptyState title="Mientras tanto, pide al personal" icon="utensils">
          Consulta la carta y avísanos cuando lo tengas claro.
        </EmptyState>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={href(locale, "/carta")} className="btn-primary">
          Ver la carta
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
        <a href={SITE.phone.href} className="btn-secondary">
          <Icon name="phone" className="h-4 w-4" />
          {SITE.phone.display}
        </a>
      </div>
    </div>
  );
}
