import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReservaSeguimiento } from "@/components/reservas/ReservaSeguimiento";
import type { Locale } from "@/lib/i18n";
import { obtenerReserva } from "@/lib/reservas/actions";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/reserva", title: "Tu reserva", noindex: true });
}

/** Seguimiento público de la reserva (enlace del email, del WhatsApp y de la pantalla de «enviada»). */
export default async function ReservaPage({ params }: Props) {
  const { id } = await params;
  const r = await obtenerReserva(id);
  if (!r.ok || !r.data) notFound();
  return (
    <div className="container-page max-w-2xl pb-24 pt-28 sm:pt-36">
      <ReservaSeguimiento inicial={r.data} />
    </div>
  );
}
