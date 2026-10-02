import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { getMenuDiaContent } from "@/lib/restaurant/content";
import { getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/menu-del-dia",
    title: "Menú del día",
    description: "Menú del día de La Ofi en Derio (Parque Tecnológico de Bizkaia): plato del día casero de lunes a viernes, actualizado cada día.",
  });
}

/**
 * El menú del día primero (en móvil, sin cabecera de foto delante): qué hay,
 * precio e incluidos; al lado, abierto/horario, reservar, llamar y llegar.
 */
export default async function MenuDelDiaPage({ params }: Params) {
  const { locale } = await params;
  const [state, horarioBd] = await Promise.all([getMenuDiaContent(), getHorario()]);
  const horario = resolverHorario(horarioBd);
  const hoy = horarioDeHoy(horario.semana);
  const comedor = IMAGES.comedorRatan;

  return (
    <>
      <div className="bg-papel-2 pb-16 pt-24 sm:pb-24 lg:pt-32">
        <div className="container-wide grid gap-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-0">
          <div className="order-1 lg:order-none lg:col-span-4 lg:row-start-1">
            <p className="kicker text-brasa">Mediodía · Lunes a viernes</p>
            <h1 id="menu-dia-title" className="t-display mt-4 text-carbon">
              Menú del día
            </h1>
            <p className="lead mt-4">Cocina casera para bajar a comer desde la oficina. Lo publicamos aquí cada día.</p>
          </div>

          <div className="order-3 lg:order-none lg:col-span-4 lg:row-start-2">
            <div className="border-t border-tinta-line lg:mt-8">
              <div className="border-b border-tinta-line py-4">
                <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="text-base text-carbon" />
                <p className="mt-1 text-sm text-carbon-muted">{hoy ? `Hoy: ${hoy}` : "Hoy: consulta el horario por teléfono"}</p>
              </div>
              <p className="flex items-start gap-3 border-b border-tinta-line py-4 text-sm text-carbon-muted">
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
                Edificio 502 del Parque Tecnológico, {SITE.address.locality}. Aparcamiento para 220 coches.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
                Reservar para hoy
              </Link>
              <a href={SITE.phone.href} className="btn-secondary">
                <Icon name="phone" className="h-4 w-4" />
                {SITE.phone.display}
              </a>
              <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <Icon name="pin" className="h-4 w-4" />
                Cómo llegar
              </a>
            </div>
          </div>

          <div className="order-2 lg:order-none lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1">
            <div className="grid gap-8 xl:grid-cols-[1fr_17rem] xl:items-start">
              <MenuDelDia state={state} detalle live headingLevel="h2" />
              <figure className="hidden xl:block">
                <div className="relative aspect-[3/4] overflow-hidden bg-papel-3">
                  <Photo img="comedorRatan" sizes="17rem" mobileBelow={0} />
                </div>
                <figcaption className="mt-2 text-xs text-carbon-muted">
                  El comedor{comedor.kind === "tercero" ? ` · Foto: ${comedor.credit}` : ""}
                </figcaption>
              </figure>
            </div>
            <p className="mt-6">
              <Link href={href(locale, "/carta")} className="link-arrow">
                ¿Prefieres carta? Ver la carta completa
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="container-wide py-16">
        <AllergenLegend />
      </div>
    </>
  );
}
