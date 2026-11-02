import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncargoSeguimiento } from "@/components/vinos/EncargoSeguimiento";
import { obtenerEncargo } from "@/lib/encargos/actions";
import { href, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/encargo", title: "Tu encargo", noindex: true });
}

/** Seguimiento público del encargo de vino (enlace de la pantalla de «encargado» y del WhatsApp). */
export default async function EncargoPage({ params }: Props) {
  const { locale, id } = await params;
  const r = await obtenerEncargo(id);
  if (!r.ok || !r.data) notFound();
  return (
    <div className="container-page max-w-2xl pb-24 pt-28 sm:pt-36">
      <EncargoSeguimiento inicial={r.data} vinosHref={href(locale, "/vinos")} />
    </div>
  );
}
