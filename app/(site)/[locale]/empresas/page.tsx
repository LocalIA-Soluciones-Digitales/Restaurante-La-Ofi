import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { EMPRESAS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/empresas",
    title: "Empresas del Parque",
    description: "Comidas de trabajo en El Despacho, pedidos de grupo para recoger y factura a nombre de tu empresa. La Ofi, edificio 502 del Parque Tecnológico de Bizkaia.",
  });
}

const PASOS = [
  { titulo: "Crea el pedido", texto: "Elige la hora de recogida y comparte el enlace con tu equipo." },
  { titulo: "Cada uno lo suyo", texto: "Cada persona añade sus platos desde su móvil, sin apuntar nada a mano." },
  { titulo: "Recoged juntos", texto: "Lo preparamos todo a la vez y os avisamos cuando esté listo." },
];

export default async function EmpresasPage({ params }: Params) {
  const { locale } = await params;
  return (
    <>
      <PageHero
        id="empresas-page-title"
        eyebrow="Empresas del Parque"
        title="Comer con tu equipo sin salir del Parque"
        lead="Reuniones con comida en El Despacho, pedidos de grupo para recoger y factura a nombre de tu empresa. En el edificio 502, a un paseo de la oficina."
        image={IMAGES.salonNoche}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={SITE.phone.href} className="btn-primary">
            <Icon name="phone" className="h-4 w-4" />
            {SITE.phone.display}
          </a>
          <Link href={href(locale, "/reservar?espacio=despacho")} className="btn-secondary">
            Reservar El Despacho
          </Link>
        </div>
      </PageHero>

      <section aria-labelledby="servicios-title" className="section bg-papel-2">
        <div className="container-wide grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <p className="kicker text-brasa">Qué podemos hacer</p>
            <h2 id="servicios-title" className="t-h2 mt-3 text-carbon">
              Para el día a día del Parque
            </h2>
          </div>
          <ol className="border-t border-tinta-line lg:col-span-8">
            {EMPRESAS.map((s, i) => (
              <li key={s.titulo} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-tinta-line py-6 sm:grid-cols-[3rem_1fr_1.2fr]">
                <span aria-hidden="true" className="font-display text-xl tabular-nums text-brasa">
                  0{i + 1}
                </span>
                <h3 className="t-h3 text-carbon">{s.titulo}</h3>
                <p className="col-start-2 mt-1 text-[0.95rem] leading-relaxed text-carbon-muted sm:col-start-3 sm:mt-0">{s.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="grupo-title" className="section bg-crema">
        <div className="container-wide grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-5">
            <p className="kicker text-brasa">Pedido de grupo</p>
            <h2 id="grupo-title" className="t-h2 mt-3 text-carbon">
              Pedís a media mañana, recogéis a la hora de comer
            </h2>
            <ol className="mt-8 space-y-6">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
                  <span aria-hidden="true" className="font-display text-3xl leading-none tabular-nums text-brasa">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-xl text-carbon">{p.titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-carbon-muted">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={href(locale, "/pedir?modo=grupo")} className="btn-dark mt-10">
              <Icon name="users" className="h-4 w-4" />
              Crear pedido de grupo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden bg-papel-3">
              <Photo img="barra" sizes="(min-width: 1024px) 55vw, 100vw" mobileBelow={0} />
            </div>
            <div className="relative aspect-square overflow-hidden bg-papel-3">
              <Photo img="tostadaBonita" sizes="(min-width: 1024px) 27vw, 50vw" mobileBelow={0} />
            </div>
            <div className="relative aspect-square overflow-hidden bg-papel-3">
              <Photo img="tostadaBurrata" sizes="(min-width: 1024px) 27vw, 50vw" mobileBelow={0} />
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" aria-labelledby="contacto-empresas-title" className="section scroll-mt-20 bg-marino-900 text-crema">
        <div className="container-wide grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="kicker text-ratan">El Despacho y celebraciones</p>
            <h2 id="contacto-empresas-title" className="t-h2 mt-3">
              Cuéntanos qué necesitas
            </h2>
            <p className="mt-4 max-w-xl text-crema/75">
              Reuniones, comidas de empresa, bautizos, comuniones o postbodas: llámanos y preparamos un menú concertado a tu medida.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <a href={SITE.phone.href} className="btn-light">
              <Icon name="phone" className="h-4 w-4" />
              Llamar al {SITE.phone.display}
            </a>
            <Link href={href(locale, "/reservar?espacio=despacho")} className="btn-ghost-light">
              Reservar El Despacho
            </Link>
            {SITE.whatsapp ? (
              <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
                <Icon name="whatsapp" className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
