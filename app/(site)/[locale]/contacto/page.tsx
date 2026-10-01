import type { Metadata } from "next";
import { Ubicacion } from "@/components/home/Ubicacion";
import { getDictionary } from "@/i18n/dictionaries";
import { resolverHorario } from "@/lib/horario";
import type { Locale } from "@/lib/i18n";
import { getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/contacto",
    title: "Contacto y cómo llegar",
    description: "Dirección, teléfono y cómo llegar a La Ofi: Barrio de Arteaga 502, Derio (Parque Tecnológico de Bizkaia, edificio 502).",
  });
}

export default async function ContactoPage({ params }: Params) {
  const { locale } = await params;
  const horario = await getHorario();
  return (
    <div className="pt-[4.5rem]">
      <Ubicacion t={getDictionary(locale)} horario={resolverHorario(horario)} headingLevel="h1" />
    </div>
  );
}
