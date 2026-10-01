import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import type { Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/reservar", title: "Reservar mesa", noindex: true });
}

export default function ReservarPage() {
  return (
    <>
      <PageHero
        id="reservar-title"
        eyebrow="Reservas"
        title="Reserva tu mesa"
        lead="Comedor, terraza o El Despacho. Llámanos y te confirmamos al momento."
        image={IMAGES.salonNoche}
        compact
      />
      <div className="container-page max-w-2xl py-14">
        <div className="flex flex-wrap gap-3">
          <a href={SITE.phone.href} className="btn-primary">
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
