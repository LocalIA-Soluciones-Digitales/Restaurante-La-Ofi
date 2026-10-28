import type { Metadata } from "next";
import { Dato, LegalPage } from "@/components/legal/LegalPage";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { TITULAR } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/privacidad", title: "Política de privacidad" });
}

export default function PrivacidadPage() {
  const email = <Dato valor={TITULAR.email} falta="email" />;
  return (
    <LegalPage id="privacidad-title" title="Política de privacidad" updated="28 de octubre de 2026">
      <section>
        <h2>Responsable del tratamiento</h2>
        <p>
          <Dato valor={TITULAR.razonSocial} falta="razón social" />, con NIF <Dato valor={TITULAR.nif} falta="NIF/CIF" /> y
          domicilio en <Dato valor={TITULAR.domicilio} falta="domicilio social" />. Contacto para protección de datos:{" "}
          {email}.
        </p>
      </section>
      <section>
        <h2>Qué datos tratamos, para qué y durante cuánto tiempo</h2>
        <ul>
          <li>
            <strong>Reservas.</strong> Nombre, teléfono, día, hora, número de personas y notas, para gestionar tu
            solicitud y avisarte de cualquier cambio. Base legal: las medidas precontractuales que solicitas (art. 6.1.b
            RGPD). Los conservamos 12 meses desde la fecha de la reserva.
          </li>
          <li>
            <strong>Alergias y otros datos de salud.</strong> Si los indicas en las notas de la reserva, los tratamos con
            tu consentimiento explícito (art. 9.2.a RGPD) únicamente para atenderte, y los borramos después del servicio.
            Puedes retirar el consentimiento en cualquier momento.
          </li>
          <li>
            <strong>Pedidos para recoger o desde la mesa.</strong> El nombre que indicas y el contenido del pedido, para
            prepararlo y entregártelo. Base legal: la ejecución del contrato (art. 6.1.b RGPD).
          </li>
          <li>
            <strong>Pagos y facturación.</strong> Si pagas online, el pago lo procesa Stripe: nosotros no vemos ni
            guardamos los datos de tu tarjeta. Los tickets y facturas se conservan los plazos que exige la normativa
            fiscal y mercantil (4 a 6 años). Base legal: obligación legal (art. 6.1.c RGPD).
          </li>
          <li>
            <strong>Llamadas y mensajes.</strong> Si nos llamas o escribes, usamos tus datos solo para responderte.
          </li>
        </ul>
        <p>
          Los datos marcados como obligatorios en cada formulario son necesarios para atender tu solicitud. No usamos tus
          datos para publicidad, no los cedemos a terceros salvo obligación legal y no tomamos decisiones automatizadas.
        </p>
      </section>
      <section>
        <h2>Proveedores que tratan datos por nuestra cuenta</h2>
        <ul>
          <li>Vercel Inc.: alojamiento de la web, con servidores en Dublín (Irlanda).</li>
          <li>Supabase Inc.: base de datos de reservas, pedidos, carta y eventos, alojada en Dublín (Irlanda).</li>
          <li>Stripe Payments Europe Ltd.: pagos online.</li>
          <li>
            OpenFreeMap: sirve el mapa de ubicación; al cargarlo recibe tu dirección IP, pero no instala cookies.
          </li>
        </ul>
        <p>
          Vercel, Supabase y Stripe pertenecen a grupos de EE. UU. y pueden acceder a datos desde allí. Esas
          transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. y en cláusulas contractuales tipo de la
          Comisión Europea.
        </p>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar
          tu consentimiento, escribiendo a {email}. Si consideras que no se han atendido, puedes reclamar ante la Agencia
          Española de Protección de Datos (www.aepd.es).
        </p>
      </section>
    </LegalPage>
  );
}
