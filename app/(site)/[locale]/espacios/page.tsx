import type { Metadata } from "next";
import Link from "next/link";
import { PlanoLocal3D } from "@/components/espacios/PlanoLocal3D";
import { Photo } from "@/components/media/Photo";
import { SceneMedia } from "@/components/media/SceneMedia";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { SectionRule } from "@/components/ui/SectionRule";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ESPACIOS, type Espacio } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES, imageKeyBySrc, type ImageKey } from "@/lib/images";
import { creditoVideo } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/espacios",
    title: "Espacios",
    description: "La barra, el comedor, El Despacho para reuniones de empresa y la terraza cubierta de La Ofi, en el Parque Tecnológico de Bizkaia.",
  });
}

// Foto adicional real de algunos espacios (además de la principal).
const EXTRA: Partial<Record<Espacio["id"], ImageKey>> = { barra: "barraMesasAltas", despacho: "despachoRotulo", terraza: "terrazaCarpa" };

function cta(e: Espacio, locale: Locale) {
  if (e.cta === "pedir") return { href: href(locale, "/pedir"), label: "Pedir para recoger" };
  if (e.cta === "presupuesto") return { href: href(locale, "/grupos#contacto"), label: "Pedir presupuesto" };
  return { href: href(locale, "/reservar"), label: "Reservar mesa" };
}

export default async function EspaciosPage({ params }: Params) {
  const { locale } = await params;
  return (
    <>
      <PageHero
        id="espacios-title"
        eyebrow="Espacios"
        title="Cuatro sitios en uno"
        lead="La barra del desayuno, el comedor del mediodía, un despacho para reunirse y la terraza para alargar la tarde."
        image={IMAGES.comedorPanoramica}
      />

      <div className="container-wide pb-20 sm:pb-28">
        <h2 className="sr-only">Nuestros espacios</h2>
        <ol className="space-y-20 sm:space-y-28">
          {ESPACIOS.map((e, i) => {
            const key = e.imagen ? imageKeyBySrc(e.imagen.src.src) : null;
            const extra = EXTRA[e.id];
            const accion = cta(e, locale);
            const par = i % 2 === 1;
            return (
              <li key={e.id} id={e.id} className="scroll-mt-24 grid gap-8 border-t border-tinta-line pt-10 lg:grid-cols-12 lg:items-center lg:gap-14">
                <div className={`lg:col-span-7 ${par ? "lg:order-2" : ""}`}>
                  {key ? (
                    <figure>
                      <div className="reveal-photo photo-hover relative aspect-[4/5] overflow-hidden bg-papel-3 sm:aspect-[3/2]">
                        <SceneMedia img={key} video={e.video} sizes="(min-width: 1024px) 58vw, 100vw" />
                      </div>
                      {(e.video ? creditoVideo(e.video) : null) ?? creditoFoto(IMAGES[key]) ? (
                        <figcaption className="mt-2 text-xs text-carbon-muted">{(e.video ? creditoVideo(e.video) : null) ?? creditoFoto(IMAGES[key])}</figcaption>
                      ) : null}
                    </figure>
                  ) : (
                    <div className="aspect-[3/2] bg-papel-2" />
                  )}
                </div>
                <div className={`lg:col-span-5 ${par ? "lg:order-1" : ""}`}>
                  <p className="kicker text-brasa">
                    <span className="tabular-nums">0{i + 1}</span>
                    {e.aforo ? <span className="text-carbon-muted"> · {e.aforo}</span> : null}
                  </p>
                  <h3 className="t-h2 mt-3 text-carbon">{e.nombre}</h3>
                  <p className="lead mt-4">{e.texto}</p>
                  <div className="mt-4">
                    <SourceBadge fuente={e.fuente} />
                  </div>
                  {extra ? (
                    <div className="photo-hover relative mt-8 hidden aspect-[16/10] w-2/3 overflow-hidden bg-papel-3 sm:block">
                      <Photo img={extra} sizes="24rem" mobileBelow={0} />
                    </div>
                  ) : null}
                  <Link href={accion.href} className="btn-secondary mt-8">
                    {accion.label}
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>

        <section aria-labelledby="plano-title" className="mt-24 sm:mt-32">
          <SectionRule id="plano-title" title="Dónde está cada cosa" aside={<span>El plano</span>} />
          <div className="mt-6">
            <p className="lead">
              El Despacho, la barra y el comedor bajo el mismo techo, con fachada de cristal hacia la terraza cubierta y la zona
              chill-out. Pulsa «Explorar en 3D» para girarlo y acercarte.
            </p>
          </div>
          <figure className="mt-10">
            <PlanoLocal3D />
            <figcaption className="mt-2 text-xs text-carbon-muted">
              Recreación orientativa del local, no a escala. La distribución real se publicará con el plano del salón.
            </figcaption>
          </figure>
        </section>

        <p className="mt-20 text-center text-carbon-muted">
          ¿Una comida de empresa o una celebración?{" "}
          <Link href={href(locale, "/grupos")} className="link-arrow">
            Grupos y eventos
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </>
  );
}
