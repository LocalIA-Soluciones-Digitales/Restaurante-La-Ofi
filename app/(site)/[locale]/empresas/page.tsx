import type { Metadata } from "next";
import Link from "next/link";
import { Empresas } from "@/components/home/Empresas";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { VIDEOS } from "@/lib/media";
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
  { icon: "link" as const, titulo: "Crea el pedido", texto: "Elige la hora de recogida y comparte el enlace con tu equipo." },
  { icon: "users" as const, titulo: "Cada uno lo suyo", texto: "Cada persona añade sus platos desde su móvil, sin apuntar nada a mano." },
  { icon: "bag" as const, titulo: "Recoged juntos", texto: "Lo preparamos todo a la vez y os avisamos cuando esté listo." },
];

export default async function EmpresasPage({ params }: Params) {
  const { locale } = await params;
  return (
    <>
      <PageHero
        id="empresas-page-title"
        eyebrow="Empresas del Parque"
        title="Comer con tu equipo sin salir del Parque"
        lead="Reuniones con comida en El Despacho, pedidos de grupo para recoger y factura a nombre de tu empresa."
        image={IMAGES.barra}
        ambiente={VIDEOS.ambienteNeon}
        noche
      />
      <Empresas locale={locale} />

      <section aria-labelledby="grupo-title" className="cv-auto bg-crema py-20 sm:py-28">
        <div className="container-page">
          <SectionHeader
            id="grupo-title"
            eyebrow="Pedido de grupo"
            title="Así funciona"
            lead="Pensado para el mediodía del Parque: pedís a media mañana y recogéis a la hora de comer."
            className="reveal"
          />
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="reveal relative rounded-[1.75rem] border border-carbon/10 bg-white p-6 shadow-card">
                <span className="font-display text-6xl text-arena-2">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-2 grid h-11 w-11 place-items-center rounded-full bg-marino text-crema">
                  <Icon name={p.icon} />
                </span>
                <h3 className="mt-4 text-2xl text-carbon">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-carbon-muted">{p.texto}</p>
              </li>
            ))}
          </ol>
          <Link href={href(locale, "/pedir?modo=grupo")} className="btn-primary mt-10">
            <Icon name="users" className="h-4 w-4" />
            Crear pedido de grupo
          </Link>
        </div>
      </section>

      <section id="contacto" aria-labelledby="contacto-empresas-title" className="cv-auto bg-arena py-20 sm:py-28">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeader
            id="contacto-empresas-title"
            eyebrow="El Despacho y celebraciones"
            title="Cuéntanos qué necesitas"
            lead="Reuniones, comidas de empresa, bautizos, comuniones o postbodas: llámanos y preparamos un menú concertado a tu medida."
            className="reveal"
          />
          <div className="reveal grid gap-3 sm:grid-cols-2">
            <a href={SITE.phone.href} className="btn-primary">
              <Icon name="phone" className="h-4 w-4" />
              Llamar al {SITE.phone.display}
            </a>
            <Link href={href(locale, "/reservar?espacio=despacho")} className="btn-secondary">
              <Icon name="briefcase" className="h-4 w-4" />
              Reservar El Despacho
            </Link>
            {SITE.whatsapp ? (
              <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-secondary sm:col-span-2">
                <Icon name="whatsapp" className="h-4 w-4" />
                Escríbenos por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
