import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PedidoStatus } from "@/components/pedir/PedidoStatus";
import type { Locale } from "@/lib/i18n";
import { obtenerPedido } from "@/lib/pedidos/actions";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ pago?: string; volver?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/pedido", title: "Tu pedido", noindex: true });
}

/** Seguimiento público del pedido. El uuid del pedido (no adivinable) es la llave, como en Palomita. */
export default async function PedidoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { pago } = await searchParams;
  const r = await obtenerPedido(id);
  if (!r.ok || !r.data) notFound();
  return (
    <div className="container-page max-w-2xl pb-24 pt-28 sm:pt-36">
      <PedidoStatus inicial={r.data} pago={pago === "ok" ? "ok" : pago === "cancelado" ? "cancelado" : null} />
    </div>
  );
}
