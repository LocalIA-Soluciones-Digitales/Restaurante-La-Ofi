import type { Metadata } from "next";
import { LegalPage, Pendiente } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/privacidad", title: "Política de privacidad" });
}

export default function PrivacidadPage() {
  return (
    <LegalPage id="privacidad-title" title="Política de privacidad" updated="1 de octubre de 2026">
      <section>
        <h2>Responsable del tratamiento</h2>
        <p>
          <Pendiente>razón social</Pendiente>, con NIF <Pendiente>NIF/CIF</Pendiente> y domicilio en{" "}
          <Pendiente>domicilio social</Pendiente>. Contacto para protección de datos: <Pendiente>email</Pendiente>.
        </p>
      </section>
      <section>
        <h2>Qué datos tratamos</h2>
        <p>
          Este sitio web no tiene formularios ni crea cuentas de usuario: no recoge datos personales a través de la web.
          Si nos llamas o nos escribes para reservar, trataremos tu nombre, teléfono y los datos de la reserva únicamente
          para gestionarla.
        </p>
      </section>
      <section>
        <h2>Base legal y conservación</h2>
        <p>
          La base legal es la ejecución de la reserva que solicitas (art. 6.1.b RGPD). Los datos se conservan el tiempo
          necesario para gestionarla y, después, durante los plazos exigidos por la ley.
        </p>
      </section>
      <section>
        <h2>Proveedores</h2>
        <ul>
          <li>Alojamiento web: Vercel Inc. (servidores en la UE y EE. UU., con cláusulas contractuales tipo).</li>
          <li>Base de datos de carta, menú y eventos: Supabase (no almacena datos de visitantes).</li>
        </ul>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
          escribiendo a <Pendiente>email</Pendiente>. Si consideras que no se han atendido, puedes reclamar ante la
          Agencia Vasca de Protección de Datos o la Agencia Española de Protección de Datos (www.aepd.es).
        </p>
      </section>
    </LegalPage>
  );
}
