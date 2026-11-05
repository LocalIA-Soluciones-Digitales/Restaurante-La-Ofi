import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EncargoVinos } from "@/components/vinos/EncargoVinos";
import { TiendaVinos } from "@/components/vinos/TiendaVinos";
import { resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { ENCARGOS_VINO } from "@/lib/lanzamiento";
import { getCartaContent } from "@/lib/restaurant/content";
import { getCierres, getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { esPorCopa, esSeccionDeVino } from "@/lib/vinos";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/vinos/encargar",
    title: "Encargar vinos para llevar",
    description: "Encarga las botellas de la carta de vinos de La Ofi para tus comidas y cenas de Navidad y recógelas en Derio. Al precio de la carta, sin pago online.",
  });
}

/** La tienda de encargos de vino: tarjetas con «+», barra del encargo y panel para enviarlo. */
export default async function EncargarVinosPage({ params }: Params) {
  const { locale } = await params;
  if (!ENCARGOS_VINO) redirect(href(locale, "/vinos"));
  // El horario y los cierres, para elegir cuándo se pasa a recogerlo.
  const [carta, horarioBd, cierres] = await Promise.all([getCartaContent(), getHorario(), getCierres()]);
  const horario = resolverHorario(horarioBd, cierres);
  // Los que se sirven por copa (dulces y generosos) no se encargan.
  const vinos = carta.status === "empty" ? [] : carta.data.filter((s) => s.items.length > 0 && esSeccionDeVino(s) && !esPorCopa(s));
  if (vinos.length === 0) redirect(href(locale, "/vinos"));
  return (
    <EncargoVinos secciones={vinos} locale={locale} privacidadHref={href(locale, "/privacidad")} semana={horario.semana} cierres={horario.cierres}>
      <TiendaVinos secciones={vinos} cartaHref={href(locale, "/vinos")} />
    </EncargoVinos>
  );
}
