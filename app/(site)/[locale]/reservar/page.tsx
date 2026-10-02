import type { Metadata } from "next";
import { ReservaForm } from "@/components/reservas/ReservaForm";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import type { Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { getEventos } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { rpcPublica } from "@/lib/supabase/rpc";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ espacio?: string; para?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/reservar", title: "Reservar mesa", noindex: true });
}

/** Reserva online si el local la ha activado (/admin/configuracion); si no, teléfono. */
export default async function ReservarPage({ searchParams }: Props) {
  const { espacio, para } = await searchParams;
  const [cfg, eventos] = await Promise.all([rpcPublica<{ online?: boolean; max_personas?: number }>("laofi_get_config_reservas"), getEventos()]);
  const online = Boolean(cfg?.data?.online);
  const reservables = (eventos ?? []).filter((e) => e.estado === "proximo");

  return (
    <>
      <PageHero
        id="reservar-title"
        eyebrow="Reservas"
        title="Reserva tu mesa"
        lead={online ? "Comedor, terraza o El Despacho. Te confirmamos enseguida." : "Comedor, terraza o El Despacho. Llámanos y te confirmamos al momento."}
        image={IMAGES.salonNoche}
        compact
      />
      <div className="container-page grid max-w-4xl gap-8 py-14">
        {online ? (
          <ReservaForm
            maxPersonas={cfg?.data?.max_personas ?? 12}
            eventos={reservables.map((e) => ({ slug: e.slug, titulo: e.titulo, fecha: e.fecha }))}
            espacioInicial={espacio === "despacho" ? "despacho" : "mesa"}
            paraHoy={para === "hoy"}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {online ? <p className="text-carbon-muted">¿Prefieres llamar?</p> : null}
          <a href={SITE.phone.href} className={online ? "btn-secondary" : "btn-primary"}>
            <Icon name="phone" className="h-4 w-4" />
            Llamar al {SITE.phone.display}
          </a>
          {SITE.whatsapp ? (
            <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <Icon name="whatsapp" className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
