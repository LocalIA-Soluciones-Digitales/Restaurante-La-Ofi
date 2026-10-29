import type { Metadata } from "next";
import { Dato, LegalPage } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { getTitularResuelto } from "@/lib/restaurant/titular";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

// Los datos del titular se editan en /admin/configuracion.
export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/aviso-legal",
    title: "Aviso legal",
    description: "Aviso legal de Restaurante La Ofi (Derio): titular del sitio web, condiciones de uso, propiedad intelectual y legislación aplicable.",
  });
}

export default async function AvisoLegalPage() {
  const TITULAR = await getTitularResuelto();
  return (
    <LegalPage id="aviso-legal-title" title="Aviso legal" updated="28 de octubre de 2026">
      <section>
        <h2>Datos identificativos</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:
        </p>
        <ul>
          <li>
            Titular: <Dato valor={TITULAR.razonSocial} falta="razón social" />
          </li>
          <li>
            NIF/CIF: <Dato valor={TITULAR.nif} falta="NIF/CIF" />
          </li>
          <li>
            Domicilio social: <Dato valor={TITULAR.domicilio} falta="domicilio social" />
          </li>
          <li>
            Datos registrales: <Dato valor={TITULAR.registro} falta="inscripción en el Registro Mercantil, si procede" />
          </li>
          <li>
            Establecimiento: {SITE.name}, {SITE.address.street}, {SITE.address.postalCode} {SITE.address.locality} (
            {SITE.address.region})
          </li>
          <li>Teléfono: {SITE.phone.display}</li>
          <li>
            Correo electrónico: <Dato valor={TITULAR.email} falta="email de contacto" />
          </li>
        </ul>
      </section>
      <section>
        <h2>Objeto</h2>
        <p>
          Este sitio web informa sobre el restaurante, su carta, el menú del día y los eventos que organiza, y permite
          solicitar reservas y hacer pedidos para recoger o desde la mesa. Los precios publicados son precios finales con
          IVA incluido. La disponibilidad de platos, menús y eventos puede variar.
        </p>
      </section>
      <section>
        <h2>Alérgenos</h2>
        <p>
          La carta indica los alérgenos de cada plato según el Reglamento (UE) 1169/2011. Mientras cocina no los confirme,
          se muestran los de la receta habitual con un aviso: no pidas ese plato sin consultarlo antes. Si tienes cualquier
          alergia o intolerancia, avisa siempre al personal antes de pedir: en cocina se manipulan los 14 alérgenos y no
          podemos descartar trazas.
        </p>
      </section>
      <section>
        <h2>Pedidos, reservas, grupos y eventos</h2>
        <p>
          Los pedidos para recoger se pagan al recogerlos, en barra; el pago con tarjeta en la web estará disponible
          próximamente. Al ser comida preparada para consumir en el momento, no hay derecho de desistimiento (art. 103.d
          TRLGDCU).
        </p>
        <p>
          Las reservas, las comidas de grupo y las celebraciones no llevan señal ni gastos de cancelación: si no podéis
          venir o cambia el número de personas, avisadnos por teléfono cuanto antes. Los eventos con entrada indican su
          precio en la ficha de cada evento.
        </p>
      </section>
      <section>
        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, fotografías, logotipos y diseño de este sitio pertenecen a su titular o a terceros que han
          autorizado su uso. No se permite su reproducción sin autorización expresa. Las marcas de terceros que puedan
          aparecer en las fotografías pertenecen a sus respectivos titulares.
        </p>
      </section>
      <section>
        <h2>Responsabilidad</h2>
        <p>
          El titular no se hace responsable del contenido de sitios web de terceros a los que se pueda acceder mediante
          enlaces (Google Maps, Instagram, WhatsApp…).
        </p>
      </section>
      <section>
        <h2>Reclamaciones</h2>
        <p>
          Tienes a tu disposición hojas de reclamaciones en el local. También puedes escribirnos a{" "}
          <Dato valor={TITULAR.email} falta="email de contacto" /> o acudir a Kontsumobide, el Instituto Vasco de Consumo
          (kontsumobide.euskadi.eus).
        </p>
      </section>
      <section>
        <h2>Legislación aplicable</h2>
        <p>
          Este aviso legal se rige por la legislación española. Si eres consumidor, serán competentes los juzgados de tu
          domicilio.
        </p>
      </section>
    </LegalPage>
  );
}
