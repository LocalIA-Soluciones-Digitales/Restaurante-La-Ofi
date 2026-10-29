import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/cookies",
    title: "Política de cookies",
    description: "La web de Restaurante La Ofi no instala cookies en sus páginas públicas ni usa analítica o publicidad: no hay nada que aceptar.",
  });
}

export default function CookiesPage() {
  return (
    <LegalPage id="cookies-title" title="Política de cookies" updated="28 de octubre de 2026">
      <section>
        <h2>Este sitio no usa cookies de analítica ni de publicidad</h2>
        <p>
          La web de La Ofi no instala cookies propias ni de terceros en sus páginas públicas, y no utiliza herramientas de
          analítica o publicidad. Por eso no te pedimos consentimiento: no hay nada que aceptar ni rechazar.
        </p>
      </section>
      <section>
        <h2>Almacenamiento técnico en tu navegador</h2>
        <p>Usamos el almacenamiento local del navegador solo para que la web funcione:</p>
        <ul>
          <li>La cesta de tu pedido (localStorage), para no perderla si recargas la página. Se borra al vaciar la cesta.</li>
          <li>Un aviso de que ya has visto la animación de entrada (sessionStorage). Se borra al cerrar la pestaña.</li>
        </ul>
        <p>
          Son técnicamente necesarios y están exentos de consentimiento (art. 22.2 LSSI). No sirven para identificarte ni
          para seguirte.
        </p>
      </section>
      <section>
        <h2>Mapa de ubicación</h2>
        <p>
          El mapa de ubicación (en la portada y en contacto) lo sirve OpenFreeMap. Al cargarlo, tu navegador le envía tu dirección IP para
          poder descargar el mapa, pero no instala cookies.
        </p>
      </section>
      <section>
        <h2>Enlaces externos</h2>
        <p>
          Los enlaces a Instagram, Google Maps o WhatsApp te llevan a sitios de terceros con sus propias políticas de
          cookies.
        </p>
      </section>
      <section>
        <h2>Cambios</h2>
        <p>
          Si en el futuro se incorporan analítica u otras herramientas que usen cookies no técnicas, se pedirá tu
          consentimiento previo, con la opción de rechazarlas igual de visible, y se actualizará esta política.
        </p>
      </section>
    </LegalPage>
  );
}
