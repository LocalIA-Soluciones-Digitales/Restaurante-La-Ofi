import { formatearTelefono, normalizarTelefono } from "@/lib/format";

// Solo datos VERIFICADOS (ver RESEARCH.md). Cualquier dato nuevo del negocio
// entra aquí únicamente tras confirmarlo con el propietario o una fuente oficial.

// TEMPORAL: número de pruebas acordado para la demo. El teléfono real del local
// (Google Business, verificado) es 946 36 64 79 — se configura con
// NEXT_PUBLIC_CONTACT_PHONE antes de pasar a producción (CONTENT_NEEDED.md).
const TELEFONO_PRUEBAS = "628409781";

const telefono = normalizarTelefono(process.env.NEXT_PUBLIC_CONTACT_PHONE || TELEFONO_PRUEBAS);
const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP || "").replace(/\D/g, "");

const LAT = 43.295441;
const LNG = -2.8672436;

export const SITE = {
  name: "Restaurante La Ofi",
  shortName: "La Ofi",
  // Hashtag propio del restaurante en Instagram (#puntodeencuentroybuenrollo).
  tagline: "Punto de encuentro y buen rollo",
  description:
    "Restaurante La Ofi en Derio, en el Parque Tecnológico de Bizkaia: desayunos con tostadas de pan de masa madre, pintxos, plato del día, cocina a la brasa y terraza cubierta.",
  address: {
    street: "Barrio de Arteaga 502",
    postalCode: "48160",
    locality: "Derio",
    region: "Bizkaia",
    country: "ES",
    context: "Parque Científico y Tecnológico de Bizkaia · Edificio 502",
  },
  geo: { lat: LAT, lng: LNG },
  phone: {
    digits: telefono,
    display: formatearTelefono(telefono),
    href: `tel:+34${telefono}`,
  },
  whatsapp: whatsapp ? { href: `https://wa.me/${whatsapp}` } : null,
  instagram: { handle: "@laofiparke", url: "https://www.instagram.com/laofiparke/" },
  maps: {
    // URL canónica de Google Maps (no el acortador share.google, que oculta el destino).
    place: `https://www.google.com/maps/search/?api=1&query=${LAT},${LNG}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`,
  },
} as const;

/**
 * Titular del negocio para el aviso legal (LSSI art. 10), la privacidad (RGPD
 * art. 13) y las condiciones de pedido. Pendiente del propietario: mientras un
 * campo sea null, las páginas legales lo muestran como «[Pendiente: …]».
 * También lo importa un componente de cliente (CartDrawer): solo datos públicos.
 */
export const TITULAR: {
  razonSocial: string | null;
  nif: string | null;
  domicilio: string | null;
  /** Registro Mercantil de Bizkaia (tomo, folio, hoja); null si es autónomo. */
  registro: string | null;
  email: string | null;
} = {
  razonSocial: null,
  nif: null,
  domicilio: null,
  registro: null,
  email: null,
};
