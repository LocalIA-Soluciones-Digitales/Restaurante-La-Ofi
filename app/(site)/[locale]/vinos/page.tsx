import type { Metadata } from "next";
import Link from "next/link";
import { CartaBodega } from "@/components/carta/CartaBodega";
import { Photo } from "@/components/media/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
import { PromoCava } from "@/components/vinos/PromoCava";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { ENCARGOS_VINO } from "@/lib/lanzamiento";
import { getCartaContent } from "@/lib/restaurant/content";
import { pageMetadata } from "@/lib/seo";
import { esSeccionDeVino, TEXTO_BODEGA } from "@/lib/vinos";
import { SITE } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/vinos",
    title: "Carta de vinos",
    description: ENCARGOS_VINO
      ? "La carta de vinos de La Ofi en Derio. Para tomar aquí o para llevar a casa: encarga tus botellas desde la web y recógelas y págalas en La Ofi."
      : "La carta de vinos de La Ofi en Derio: blancos, rosados, cavas, champagnes y vinos dulces de distintas denominaciones, con precio por botella.",
  });
}

/**
 * La carta de vinos en su propia página (antes iba al final de la carta y
 * pasaba desapercibida): la vinoteca a todo el ancho con el título y debajo la carta
 * por tipos y denominaciones, con los vinos de la casa arriba. Con los encargos abiertos
 * (ENCARGOS_VINO), un bloque lleva a la tienda de encargos (/vinos/encargar): la carta se
 * queda solo para consultar (quien la mira para pedir en mesa no ve botones de encargo).
 */
export default async function VinosPage({ params }: Params) {
  const { locale } = await params;
  const carta = await getCartaContent();
  const vinos = carta.status === "empty" ? [] : carta.data.filter((s) => s.items.length > 0 && esSeccionDeVino(s));
  const encargos = ENCARGOS_VINO && vinos.length > 0;

  return (
    <>
      {/* La vinoteca a todo el ancho; abajo se funde con el papel de la carta de vinos. */}
      <section aria-labelledby="vinos-title" data-header="light" className="relative isolate overflow-hidden bg-carbon pb-24 pt-28 text-crema sm:pb-64 sm:pt-36 lg:pt-48">
        <Photo img="comedorPanoramica" sizes="100vw" priority mobileBelow={0} decorative imgClassName="motion-safe:animate-kenburns" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-carbon/80 via-carbon/50 to-carbon/40" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F6F0E5] sm:h-64" />
        <div className="container-wide relative flex flex-col items-center text-center">
          <p className="kicker text-[#E2B98A]">Vinos · Cavas · Champagnes</p>
          <h1 id="vinos-title" className="mt-4 font-display text-[clamp(3.5rem,8vw,7rem)] font-light leading-[0.95] tracking-tight drop-shadow-[0_4px_30px_rgb(0_0_0/0.35)]">
            Carta <em className="text-[#E2B98A]">de vinos</em>
          </h1>
          <p className="mx-auto mt-6 hidden max-w-2xl text-lg leading-relaxed text-crema/85 sm:block">{TEXTO_BODEGA}</p>
          <p className="mx-auto mt-4 max-w-sm leading-relaxed text-crema/85 sm:hidden">Rioja, Ribera, Rueda, txakoli, cavas y champagnes. Precio por botella.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 sm:mt-9">
            {encargos ? (
              <Link href={href(locale, "/vinos/encargar")} className="btn bg-[#E2B98A] px-6 text-carbon hover:bg-crema">
                <Icon name="wine" className="h-4 w-4" />
                Encargar para llevar
              </Link>
            ) : null}
            <a href="#la-bodega" className={`btn px-6 ${encargos ? "border border-crema/40 text-crema hover:bg-crema hover:text-carbon" : "bg-[#E2B98A] text-carbon hover:bg-crema"}`}>
              Ver los vinos
              <Icon name="chevronDown" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {vinos.length ? (
        <>
          {encargos ? <ComoEncargar tiendaHref={href(locale, "/vinos/encargar")} /> : null}
          <CartaBodega secciones={vinos} cabecera={false} />
        </>
      ) : (
        <div className="container-page max-w-2xl py-20">
          <EmptyState title="Carta de vinos en preparación" icon="wine">
            Muy pronto podrás consultarla aquí. Mientras tanto, pregúntanos en barra o llámanos al{" "}
            <a href={SITE.phone.href} className="font-semibold link-underline">
              {SITE.phone.display}
            </a>
            .
          </EmptyState>
        </div>
      )}
    </>
  );
}

const PASOS = [
  { titulo: "Elige tus botellas", texto: "En nuestra tienda de encargos: tintos, blancos, cavas y champagnes de la carta." },
  { titulo: "Lo preparamos", texto: "Te avisamos por WhatsApp o por teléfono en cuanto tu encargo esté listo." },
  { titulo: "Recoges y pagas", texto: "Pasa por La Ofi cuando te venga bien y paga allí. Sin pago online." },
];

/** Cómo funciona el encargo, entre la vinoteca y la carta: tres pasos, como una nota impresa. */
function ComoEncargar({ tiendaHref }: { tiendaHref: string }) {
  return (
    <section id="encargar" aria-labelledby="encargar-title" className="scroll-mt-20 bg-[#F6F0E5] text-carbon sm:pb-20">
      <div className="container-wide grid gap-10 pb-10 pt-8 sm:py-12 lg:grid-cols-12 lg:gap-14 lg:pb-6 lg:pt-14">
        <div className="lg:col-span-5">
          <p className="kicker text-madera-oscura">Navidad · Encargos para llevar</p>
          <h2 id="encargar-title" className="mt-3 font-display text-[clamp(2.5rem,4.5vw,3.75rem)] font-light leading-[0.98] tracking-tight">
            Lleva a casa lo mejor de <em className="text-madera-oscura">nuestra bodega</em>
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-carbon-muted sm:mt-5 sm:text-lg">
            Encarga las botellas para tus comidas y cenas de Navidad, al mismo precio que en la carta. Te las dejamos preparadas y
            pasas a recogerlas por La Ofi.
          </p>
          <Link href={tiendaHref} className="btn mt-6 w-full bg-carbon px-6 text-crema hover:bg-[#1f1c18] sm:mt-7 sm:w-auto">
            <Icon name="wine" className="h-4 w-4" />
            Hacer mi encargo
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-col gap-10 lg:col-span-7 lg:gap-12">
          {/* Móvil: los pasos en filas (número a la izquierda); desde sm, en tres columnas. */}
          <ol className="grid sm:grid-cols-3 sm:gap-6">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="grid grid-cols-[2.25rem_1fr] border-t border-carbon/80 py-4 sm:block sm:pb-0">
                <p className="pt-1 font-display text-sm tabular-nums text-madera-oscura sm:pt-0">{String(i + 1).padStart(2, "0")}</p>
                <div>
                  <p className="font-display text-xl leading-tight sm:mt-2 sm:text-2xl">{p.titulo}</p>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-carbon-muted sm:mt-2">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* Debajo de los pasos, el cava de regalo fundido con el papel. */}
          <PromoCava variante="integrado" />
        </div>
      </div>
    </section>
  );
}
