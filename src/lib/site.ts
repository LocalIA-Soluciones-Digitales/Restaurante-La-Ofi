import { formatearTelefono, normalizarTelefono } from "@/lib/format";

// Solo datos VERIFICADOS (ver RESEARCH.md). Cualquier dato nuevo del negocio
// entra aquí únicamente tras confirmarlo con el propietario o una fuente oficial.

// Teléfono del local, confirmado por el propietario (29/10/2026). NEXT_PUBLIC_CONTACT_PHONE
// solo para sustituirlo sin tocar el código.
const TELEFONO_LOCAL = "946366479";

const telefono = normalizarTelefono(process.env.NEXT_PUBLIC_CONTACT_PHONE || TELEFONO_LOCAL);
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
  // Ficha de Google del local (Knowledge Graph /g/11rtmgj80h, a la que llevaba el
  // enlace share.google): desde ahí se escriben las reseñas.
  google: { ficha: "https://www.google.com/search?kgmid=/g/11rtmgj80h" },
  maps: {
    // URL canónica de Google Maps (no el acortador share.google, que oculta el destino).
    place: `https://www.google.com/maps/search/?api=1&query=${LAT},${LNG}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`,
  },
} as const;

/**
 * Titular del negocio para el aviso legal (LSSI art. 10), la privacidad (RGPD
 * art. 13) y las condiciones de pedido. Lo normal es rellenarlo desde
 * /admin/configuracion (ajuste «fiscal», ver getTitularResuelto); estos valores
 * solo cubren lo que el panel no tenga. Mientras un campo siga en null, las
 * páginas legales lo muestran como «[Pendiente: …]».
 * También lo importa un componente de cliente (CartDrawer): solo datos públicos.
 */
export interface Titular {
  razonSocial: string | null;
  nif: string | null;
  domicilio: string | null;
  /** Registro Mercantil de Bizkaia (tomo, folio, hoja); null si es autónomo. */
  registro: string | null;
  email: string | null;
}

// Escritura de constitución (6/10/2021) y datos del propietario (29/10/2026).
export const TITULAR: Titular = {
  razonSocial: "Orotela, S.L.",
  nif: "B16982597",
  domicilio: "Parque Tecnológico de Bizkaia, Edificio 502, bajo, 48160 Derio (Bizkaia)",
  registro: "Registro Mercantil de Bizkaia, tomo 6042, folio 1, hoja BI-77552, inscripción 1.ª",
  email: "laofiparke@gmail.com",
};
