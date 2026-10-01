import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// Reservas online: preparado para la RPC compartida crear_reserva_publica
// (restaurant.reservas, mismo flujo que Palomita-Bar). En V1 se reserva por teléfono.

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/reservar", title: "Reservar mesa", noindex: true });
}

export default function ReservarPage() {
  return (
    <div className="container-page max-w-2xl pb-20 pt-32 sm:pt-40">
      <p className="eyebrow text-terracota">Reservas</p>
      <h1 className="mt-3 text-5xl text-carbon">Reserva tu mesa</h1>
      <p className="mt-4 text-lg text-carbon-muted">
        De momento reservamos por teléfono: llámanos y te confirmamos al momento. Muy pronto podrás hacerlo también
        desde aquí.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
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
  );
}
