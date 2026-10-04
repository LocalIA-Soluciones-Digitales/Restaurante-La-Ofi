import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/cookies", title: "Política de cookies" });
}

export default function CookiesPage() {
  return (
    <LegalPage id="cookies-title" title="Política de cookies" updated="4 de octubre de 2026">
      <section>
        <h2>Este sitio no usa cookies propias</h2>
        <p>
          La web de La Ofi no instala cookies propias ni utiliza herramientas de analítica o publicidad. La única
          excepción es el mapa de Google descrito abajo.
        </p>
      </section>
      <section>
        <h2>Mapa interactivo de Google</h2>
        <p>
          En las páginas con el mapa de ubicación se carga Google Maps integrado, y Google puede instalar sus propias
          cookies según su política: policies.google.com/technologies/cookies.
        </p>
      </section>
      <section>
        <h2>Enlaces externos</h2>
        <p>
          Los enlaces a Instagram o Google Maps te llevan a sitios de terceros con sus propias políticas de cookies.
        </p>
      </section>
      <section>
        <h2>Cambios</h2>
        <p>
          Si en el futuro se incorporan analítica u otras herramientas que usen cookies no técnicas, se pedirá tu
          consentimiento previo y se actualizará esta política.
        </p>
      </section>
    </LegalPage>
  );
}
