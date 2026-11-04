import type { Metadata } from "next";
import Link from "next/link";
import { CartaBodega } from "@/components/carta/CartaBodega";
import { Photo } from "@/components/media/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
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
      {/* Móvil: una tarjeta oscura y compacta, para llegar antes a los vinos. */}
      <div className="container-wide pt-2 sm:hidden">
        <div className="rounded-3xl bg-carbon p-6 text-crema shadow-lift">
          <p className="kicker text-[#E2B98A]">Navidad · Para llevar</p>
          <p className="mt-2 font-display text-[1.9rem] font-light leading-[1.05]">
            Lleva a casa lo mejor de <em className="text-[#E2B98A]">nuestra bodega</em>
          </p>
          <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-[0.78rem] leading-tight text-crema/80">
            {["Eliges las botellas", "Te avisamos", "Recoges y pagas"].map((t, i) => (
              <li key={t} className="rounded-xl bg-white/[0.06] px-1.5 py-3">
                <span className="mx-auto mb-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#E2B98A] font-display text-sm text-carbon">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <Link href={tiendaHref} className="btn mt-5 w-full bg-[#E2B98A] text-carbon hover:bg-crema">
            <Icon name="wine" className="h-4 w-4" />
            Hacer mi encargo
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-center text-xs text-crema/55">Al precio de la carta · Sin pago online</p>
        </div>
      </div>
      <div className="container-wide hidden gap-10 border-b border-tinta-line py-12 sm:grid lg:grid-cols-12 lg:gap-14 lg:py-14">
        <div className="lg:col-span-5">
          <p className="kicker text-madera-oscura">Navidad · Encargos para llevar</p>
          <h2 id="encargar-title" className="mt-3 font-display text-[clamp(2.5rem,4.5vw,3.75rem)] font-light leading-[0.98] tracking-tight">
            Lleva a casa lo mejor de <em className="text-madera-oscura">nuestra bodega</em>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-carbon-muted">
            Encarga las botellas para tus comidas y cenas de Navidad, al mismo precio que en la carta. Te las dejamos preparadas y
            pasas a recogerlas por La Ofi.
          </p>
          <Link href={tiendaHref} className="btn mt-7 bg-carbon px-6 text-crema hover:bg-[#1f1c18]">
            <Icon name="wine" className="h-4 w-4" />
            Hacer mi encargo
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:col-span-7 lg:self-end">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="border-t border-carbon/80 pt-4">
              <p className="font-display text-sm tabular-nums text-madera-oscura">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-2 font-display text-2xl leading-tight">{p.titulo}</p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-carbon-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
