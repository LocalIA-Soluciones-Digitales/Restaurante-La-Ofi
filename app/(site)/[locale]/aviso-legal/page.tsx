import type { Metadata } from "next";
import { LegalPage, Pendiente } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/aviso-legal", title: "Aviso legal" });
}

export default function AvisoLegalPage() {
  return (
    <LegalPage id="aviso-legal-title" title="Aviso legal" updated="1 de octubre de 2026">
      <section>
        <h2>Datos identificativos</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:
        </p>
        <ul>
          <li>
            Titular: <Pendiente>razón social</Pendiente>
          </li>
          <li>
            NIF/CIF: <Pendiente>NIF/CIF</Pendiente>
          </li>
          <li>
            Domicilio social: <Pendiente>domicilio social</Pendiente>
          </li>
          <li>
            Datos registrales: <Pendiente>inscripción en el Registro Mercantil, si procede</Pendiente>
          </li>
          <li>
            Establecimiento: {SITE.name}, {SITE.address.street}, {SITE.address.postalCode} {SITE.address.locality} (
            {SITE.address.region})
          </li>
          <li>Teléfono: {SITE.phone.display}</li>
          <li>
            Correo electrónico: <Pendiente>email de contacto</Pendiente>
          </li>
        </ul>
      </section>
      <section>
        <h2>Objeto</h2>
        <p>
          Este sitio web informa sobre el restaurante, su carta, el menú del día y los eventos que organiza. La
          información de precios, platos y alérgenos es orientativa; ante cualquier duda, prevalece la que facilite el
          personal en el local.
        </p>
      </section>
      <section>
        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, fotografías, logotipos y diseño de este sitio pertenecen a su titular o a terceros que han
          autorizado su uso. No se permite su reproducción sin autorización expresa.
        </p>
      </section>
      <section>
        <h2>Responsabilidad</h2>
        <p>
          El titular no se hace responsable del contenido de sitios web de terceros a los que se pueda acceder mediante
          enlaces (Google Maps, Instagram…). La disponibilidad de platos, menús y eventos puede variar sin previo aviso.
        </p>
      </section>
      <section>
        <h2>Legislación aplicable</h2>
        <p>Este aviso legal se rige por la legislación española.</p>
      </section>
    </LegalPage>
  );
}
