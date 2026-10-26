import type { Metadata } from "next";
import Link from "next/link";
import { CartaTabs } from "@/components/carta/CartaTabs";
import { Photo } from "@/components/media/Photo";
import { AllergenLegend } from "@/components/menu/AllergenLegend";
import { MenuDelDia } from "@/components/menu/MenuDelDia";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES } from "@/lib/images";
import { getMenuDiaContent } from "@/lib/restaurant/content";
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
    title: "Menú del día",
    description: "Menú del día de La Ofi en Derio (Parque Tecnológico de Bizkaia): plato del día casero de lunes a viernes, actualizado cada día.",
  });
}

/**
 * A un lado, el título y una tarjeta de "hoy" (horario, estado, incluidos) con
 * las acciones; al otro, la tarjeta del menú montada sobre la foto del comedor.
 */
export default async function MenuDelDiaPage({ params }: Params) {
  const { locale } = await params;
  const [state, horarioBd] = await Promise.all([getMenuDiaContent(), getHorario()]);
  const horario = resolverHorario(horarioBd);
  const hoy = horarioDeHoy(horario.semana);
  const comedor = IMAGES.comedorRatan;
  const incluye = state.status === "empty" ? [] : state.data.incluye;

  return (
    <>
      <div className="bg-papel-2 pb-16 pt-24 sm:pb-24 lg:pt-32">
        <div className="container-wide mb-10 lg:mb-14">
          <CartaTabs locale={locale} actual="menu" />
        </div>
        <div className="container-wide grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-4">
            <p className="kicker text-brasa">Mediodía · Lunes a viernes</p>
            <h1 id="menu-dia-title" className="t-display mt-4 text-carbon">
              Menú <em className="text-madera">del día</em>
            </h1>

            {/* Tarjeta oscura de "hoy": lo que se mira de un vistazo, sin párrafos. */}
            <div className="mt-10 overflow-hidden rounded-2xl bg-carbon text-crema shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]">
              <div className="px-7 pb-6 pt-7">
                <p className="kicker text-crema/60">Hoy</p>
                <p className="mt-2 font-display text-4xl tabular-nums tracking-tight">{hoy ?? "Consúltanos"}</p>
                <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} tone="light" className="mt-3 text-crema/80" />
              </div>
              {incluye.length > 0 ? (
                <div
                  className="grid border-t border-crema/10 text-center text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-crema/70"
                  style={{ gridTemplateColumns: `repeat(${incluye.length}, minmax(0, 1fr))` }}
                >
                  {incluye.map((x, i) => (
                    <span key={x} className={`py-3.5 ${i ? "border-l border-crema/10" : ""}`}>
                      {x}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={href(locale, "/reservar?para=hoy")} className="btn-primary">
                Reservar para hoy
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <a href={SITE.phone.href} className="btn-secondary" aria-label={`Llamar al ${SITE.phone.display}`}>
                <Icon name="phone" className="h-4 w-4" />
              </a>
              <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary" aria-label="Cómo llegar">
                <Icon name="pin" className="h-4 w-4" />
              </a>
            </div>
            <Link href={href(locale, "/carta")} className="link-arrow mt-6 text-sm">
              ¿Prefieres carta? Ver la carta completa
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>

          {/* La foto del comedor detrás y la tarjeta del menú montada encima, como en la home. */}
          <div className="relative lg:col-span-8">
            <div className="parallax relative aspect-[4/3] overflow-hidden bg-papel-3 lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[60%]">
              <Photo img="comedorRatan" sizes="(min-width: 1024px) 30vw, 100vw" mobileBelow={0} />
            </div>
            <div className="relative z-10 mx-3 -mt-20 sm:mx-10 lg:mx-0 lg:my-16 lg:w-[64%]">
              <MenuDelDia state={state} detalle live headingLevel="h2" />
            </div>
            {comedor.kind === "ilustrativa" ? (
              <p className="mt-3 text-right text-xs text-carbon-muted">{creditoFoto(comedor)}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="container-wide py-16">
        <AllergenLegend />
      </div>
    </>
  );
}
