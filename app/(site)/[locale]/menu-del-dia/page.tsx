import type { Metadata } from "next";
import Link from "next/link";
import { CartaBloque } from "@/components/carta/CartaBloque";
import { Photo } from "@/components/media/Photo";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { IS_DEMO } from "@/lib/env";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES } from "@/lib/images";
import { obtenerConfigPedidos } from "@/lib/pedidos/actions";
import { getCartaContent, getMenuDiaContent } from "@/lib/restaurant/content";
import { menuJsonLd } from "@/lib/restaurant/jsonld";
import { getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

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
 * "Carta y menú" en una sola página: arriba lo de hoy (la tarjeta del menú sobre
 * la foto del comedor) y, al seguir bajando, la carta completa. Nadie tiene que
 * encontrar una pestaña para ver la carta.
 */
export default async function MenuDelDiaPage({ params }: Params) {
  const { locale } = await params;
  const [state, horarioBd, carta, configR] = await Promise.all([getMenuDiaContent(), getHorario(), getCartaContent(), obtenerConfigPedidos()]);
  const horario = resolverHorario(horarioBd);
  const hoy = horarioDeHoy(horario.semana);
  const comedor = IMAGES.comedorRatan;

  const datos = [
    { label: "Hoy", value: <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="text-carbon" />, nota: hoy ?? "Consulta el horario por teléfono" },
    { label: "Dónde", value: <span className="text-carbon">Edificio 502, Parque Tecnológico</span>, nota: "Aparcamiento para 220 coches" },
  ];

  return (
    <>
      {carta.status === "real" && !IS_DEMO ? <JsonLd data={menuJsonLd(carta.data)} /> : null}
      <section aria-labelledby="menu-dia-title" className="overflow-hidden bg-papel-2 pb-20 pt-24 sm:pb-28 lg:pt-32">
        <div className="container-wide grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-4">
            <p className="kicker text-brasa">Mediodía · Lunes a viernes</p>
            <h1 id="menu-dia-title" className="t-display mt-4 text-carbon">
              Menú <em className="text-madera">del día</em>
            </h1>
            <p className="lead mt-5">Cocina casera que cambia cada día. Y si prefieres carta, la tienes justo debajo.</p>

            <dl className="mt-10 border-t border-tinta-line">
              {datos.map((d) => (
                <div key={d.label} className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-tinta-line py-4">
                  <dt className="pt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-carbon-muted">{d.label}</dt>
                  <dd className="text-[0.95rem]">
                    {d.value}
                    {d.nota ? <span className="mt-0.5 block text-sm text-carbon-muted">{d.nota}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
                Reservar para hoy
              </Link>
              <a href="#la-carta" className="btn-secondary">
                Ver la carta
                <Icon name="arrow" className="h-4 w-4 rotate-90" />
              </a>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href={SITE.phone.href} className="inline-flex items-center gap-2 text-carbon-muted hover:text-carbon">
                <Icon name="phone" className="h-4 w-4 text-brasa" />
                {SITE.phone.display}
              </a>
              <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-carbon-muted hover:text-carbon">
                <Icon name="pin" className="h-4 w-4 text-brasa" />
                Cómo llegar
              </a>
            </p>
          </div>

          {/* La foto del comedor detrás y la tarjeta del menú montada encima, como en la home. */}
          <div className="relative lg:col-span-8">
            <div className="parallax relative aspect-[4/3] overflow-hidden bg-papel-3 lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[60%]">
              <Photo img="comedorRatan" sizes="(min-width: 1024px) 30vw, 100vw" mobileBelow={0} />
            </div>
            <div className="relative z-10 mx-3 -mt-20 sm:mx-10 lg:mx-0 lg:my-16 lg:w-[64%]">
              <MenuDelDia state={state} detalle live headingLevel="h2" />
            </div>
            {comedor.kind === "ilustrativa" ? <p className="mt-3 text-right text-xs text-carbon-muted">{creditoFoto(comedor)}</p> : null}
          </div>
        </div>
      </section>

      <CartaBloque state={carta} config={configR.ok ? configR.data : null} />
    </>
  );
}
