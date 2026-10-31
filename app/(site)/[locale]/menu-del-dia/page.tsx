import type { Metadata } from "next";
import Link from "next/link";
import { CartaBloque } from "@/components/carta/CartaBloque";
import { Photo } from "@/components/media/Photo";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { HorarioHoy } from "@/components/ui/HorarioHoy";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { IS_DEMO } from "@/lib/env";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { PROXIMAMENTE } from "@/lib/lanzamiento";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { menuJsonLd } from "@/lib/restaurant/jsonld";
import { getCierres, getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// 5 min: el menú del día aparece a las 8:00 y desaparece a las 16:00 sin que nadie toque nada.
export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/menu-del-dia",
    title: "Menú del día y carta",
    description:
      "Menú del día de La Ofi en Derio (Parque Tecnológico de Bizkaia): plato del día casero de lunes a viernes, actualizado cada día, y la carta completa con precios y alérgenos.",
  });
}

/**
 * "Carta y menú" en una sola página: arriba lo de hoy (la hoja del menú centrada
 * sobre el comedor a todo el ancho) y, al seguir bajando, la carta completa.
 * Nadie tiene que encontrar una pestaña para ver la carta.
 */
export default async function MenuDelDiaPage({ params }: Params) {
  const { locale } = await params;
  const [state, horarioBd, cierres, carta] = await Promise.all([getMenuDiaContent(), getHorario(), getCierres(), getCartaContent()]);
  const horario = resolverHorario(horarioBd, cierres);

  return (
    <>
      {carta.status === "real" && !IS_DEMO ? <JsonLd data={menuJsonLd(carta.data)} /> : null}
      {/* El comedor a todo el ancho y la hoja del menú en el centro, por encima. */}
      <section aria-labelledby="menu-dia-title" data-header="light" className="relative isolate overflow-hidden bg-carbon pb-16 pt-28 text-crema sm:pb-24 lg:pt-36">
        <Photo img="comedorRatan" sizes="100vw" priority mobileBelow={0} decorative imgClassName="motion-safe:animate-kenburns" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-carbon/75 via-carbon/40 to-carbon/85" />

        <div className="container-wide relative flex flex-col items-center text-center">
          <p className="kicker text-crema/75">Mediodía · Lunes a viernes</p>
          <h1 id="menu-dia-title" className="t-display mt-4 text-crema">
            Menú <em className="text-[#E2B98A]">del día</em>
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-crema/80">
            <EstadoAhora semana={horario.semana} cierres={horario.cierres} inicial={estadoAhora(horario.semana, undefined, horario.cierres)} tone="light" />
            <HorarioHoy semana={horario.semana} cierres={horario.cierres} inicial={horarioDeHoy(horario.semana, undefined, horario.cierres)} separador />
          </div>

          <div className="mt-10 w-full max-w-xl text-left motion-safe:animate-fade-up sm:mt-14">
            <MenuDelDia state={state} detalle live headingLevel="h2" />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {PROXIMAMENTE.reservas ? (
              <a href={SITE.phone.href} className="btn-primary">
                <Icon name="phone" className="h-4 w-4" />
                Llamar para reservar
              </a>
            ) : (
              <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
                Reservar para hoy
              </Link>
            )}
            <Link href={href(locale, "/pedir")} className="btn border border-crema/40 text-crema hover:bg-crema hover:text-carbon">
              <Icon name="bag" className="h-4 w-4" />
              {PROXIMAMENTE.pedidos ? "Para llevar · muy pronto" : "Pedir para llevar"}
            </Link>
            <a
              href="#la-carta"
              className="btn border border-crema/40 text-crema hover:bg-crema hover:text-carbon"
            >
              Ver la carta
              <Icon name="arrow" className="h-4 w-4 rotate-90" />
            </a>
          </div>
          <p className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-crema/75">
            <a href={SITE.phone.href} className="inline-flex items-center gap-2 hover:text-crema">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
            <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-crema">
              <Icon name="pin" className="h-4 w-4" />
              Edificio 502 · Cómo llegar
            </a>
          </p>
        </div>
      </section>

      <CartaBloque state={carta} config={null} pedirHref={PROXIMAMENTE.pedidos ? undefined : href(locale, "/pedir")} />
    </>
  );
}
