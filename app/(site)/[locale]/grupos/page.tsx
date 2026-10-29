import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/eventos/EventCard";
import { Photo } from "@/components/media/Photo";
import { VentanaFija } from "@/components/media/VentanaFija";
import { PresupuestoForm } from "@/components/reservas/PresupuestoForm";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { SectionRule } from "@/components/ui/SectionRule";
import { IS_DEMO } from "@/lib/env";
import { EMPRESAS } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { getEventosContent } from "@/lib/restaurant/content";
import { rpcPublica } from "@/lib/supabase/rpc";
import { eventJsonLd } from "@/lib/restaurant/jsonld";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// La agenda de eventos cambia desde /admin: se regenera como mucho cada 5 minutos.
export const revalidate = 86400;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/grupos",
    title: "Grupos y eventos",
    description:
      "Comidas de empresa en El Despacho, pedidos de grupo con factura, celebraciones con menú concertado y la agenda de La Ofi, en el edificio 502 del Parque Tecnológico de Bizkaia.",
  });
}

const PASOS = [
  { titulo: "Crea el pedido", texto: "Elige la hora de recogida y comparte el enlace con tu equipo." },
  { titulo: "Cada uno lo suyo", texto: "Cada persona añade sus platos desde su móvil, sin apuntar nada a mano." },
  { titulo: "Recoged juntos", texto: "Lo preparamos todo a la vez y os avisamos cuando esté listo." },
];

const CELEBRACIONES = ["Comidas de empresa", "Bautizos", "Comuniones", "Postbodas"];

/**
 * Todo lo que no es venir a comer por tu cuenta, en una sola página (antes
 * repartido entre /empresas, /eventos y el pie de /espacios): empresas,
 * pedido de grupo, celebraciones, la agenda (solo si hay eventos publicados)
 * y un único bloque de contacto. /empresas y /eventos redirigen aquí.
 */
export default async function GruposPage({ params }: Params) {
  const { locale } = await params;
  const [eventos, cfgReservas] = await Promise.all([
    getEventosContent(),
    rpcPublica<{ online?: boolean }>("laofi_get_config_reservas"),
  ]);
  const presupuestoOnline = Boolean(cfgReservas?.data?.online);
  const hayAgenda = eventos.status !== "empty" && eventos.data.length > 0;
  const jsonLd =
    eventos.status === "real" && !IS_DEMO ? eventos.data.map(eventJsonLd).filter((e): e is NonNullable<typeof e> => e !== null) : [];

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}

      <PageHero
        id="grupos-title"
        eyebrow="Grupos y eventos"
        title="Comidas de empresa y celebraciones"
        lead="El Despacho para reuniones, pedidos de grupo con factura y menús concertados para celebrar. En el edificio 502, a un paseo de la oficina."
        image={IMAGES.despacho}
      >
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href={href(locale, "/reservar?espacio=despacho")} className="btn-dark px-6">
            Reservar El Despacho
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <a href="#contacto" className="btn-secondary px-6">
            Pedir presupuesto
          </a>
        </div>
        <nav aria-label="En esta página" className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#empresas" className="link-arrow">
            Empresas
          </a>
          <a href="#celebraciones" className="link-arrow">
            Celebraciones
          </a>
          {hayAgenda ? (
            <a href="#agenda" className="link-arrow">
              Agenda
            </a>
          ) : null}
        </nav>
      </PageHero>

      <section id="empresas" aria-labelledby="empresas-title" className="section scroll-mt-20 bg-papel-2">
        <div className="container-wide">
          <SectionRule id="empresas-title" title="Para el día a día del Parque" aside={<span>Empresas</span>} />
          <ol className="mt-10 border-t border-tinta-line">
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
            <SectionRule id="grupo-title" title="Pedís a media mañana, recogéis a la hora de comer" aside={<span>Pedido de grupo</span>} />
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
          <div className="parallax relative aspect-[4/3] overflow-hidden bg-papel-3 lg:col-span-7">
            <Photo img="barra" sizes="(min-width: 1024px) 55vw, 100vw" mobileBelow={0} />
          </div>
        </div>
      </section>

      <section id="celebraciones" aria-labelledby="celebraciones-title" className="section scroll-mt-20 bg-papel-2">
        <div className="container-wide grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="parallax relative aspect-[4/3] overflow-hidden bg-papel-3 lg:order-2 lg:col-span-7">
            <Photo img="terraza" sizes="(min-width: 1024px) 55vw, 100vw" mobileBelow={0} />
          </div>
          <div className="lg:order-1 lg:col-span-5">
            <SectionRule id="celebraciones-title" title="Un menú concertado para celebrarlo" aside={<span>Celebraciones</span>} />
            <p className="lead mt-6">En el comedor privado o en la terraza cubierta, con un menú preparado a vuestra medida.</p>
            <ul className="mt-8 border-t border-tinta-line">
              {CELEBRACIONES.map((c) => (
                <li key={c} className="border-b border-tinta-line py-3 font-display text-xl text-carbon">
                  {c}
                </li>
              ))}
            </ul>
            <a href="#contacto" className="btn-line mt-8 text-carbon">
              <span>Pedir presupuesto</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {hayAgenda ? (
        <section id="agenda" aria-labelledby="agenda-title" className="section scroll-mt-20 bg-crema">
          <div className="container-wide">
            <SectionRule id="agenda-title" title="Próximos eventos" aside={<span>Agenda</span>} />
            <ul className="mt-12 space-y-14">
              {eventos.data.map((evento) => (
                <li key={evento.id}>
                  <EventCard evento={evento} locale={locale} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <VentanaFija
        id="sobremesa-title"
        img="salonNoche"
        kicker="Celebraciones"
        title={
          <>
            La comida acaba. <em className="text-ratan">La sobremesa, no.</em>
          </>
        }
        lead="Bombillas encendidas, mesas vestidas y el salón para vosotros: cenas de empresa, cumpleaños y despedidas con menú concertado."
      >
        <a href="#contacto" className="btn-line mt-9 text-crema">
          <span>Pedir presupuesto</span>
          <span aria-hidden="true">→</span>
        </a>
      </VentanaFija>

      <section id="contacto" aria-labelledby="contacto-grupos-title" className="section scroll-mt-20 bg-marino-900 text-crema">
        <div className={`container-wide grid gap-10 lg:grid-cols-12 ${presupuestoOnline ? "lg:items-start" : "lg:items-end"}`}>
          <div className={presupuestoOnline ? "lg:col-span-5" : "lg:col-span-7"}>
            <SectionRule dark id="contacto-grupos-title" title="Cuéntanos qué necesitas" aside={<span>Presupuesto</span>} />
            <p className="mt-4 max-w-xl text-crema/75">
              {presupuestoOnline
                ? "Reuniones, comidas de empresa o una celebración familiar: dinos fecha, cuántos sois y qué buscáis, y te llamamos con un menú concertado a tu medida."
                : "Reuniones, comidas de empresa o una celebración familiar: llámanos y preparamos un menú concertado a tu medida."}
            </p>
          </div>
          {presupuestoOnline ? (
            <div className="lg:col-span-7">
              <PresupuestoForm privacidadHref={href(locale, "/privacidad")} />
            </div>
          ) : null}
          <div className={`flex flex-wrap gap-3 ${presupuestoOnline ? "lg:col-span-12" : "lg:col-span-5 lg:justify-end"}`}>
            <a href={SITE.phone.href} className="btn-light">
              <Icon name="phone" className="h-4 w-4" />
              Llamar al {SITE.phone.display}
            </a>
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
