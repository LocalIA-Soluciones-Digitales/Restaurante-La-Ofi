import { SITE_URL } from "@/lib/env";
import { horarioSchemaOrg, type Semana } from "@/lib/horario";
import { SITE } from "@/lib/site";
import type { CartaItem, CartaSeccion, EventoView } from "@/lib/restaurant/types";

// JSON-LD solo con datos verificados. Menu y Event se generan únicamente a
// partir de datos reales de Supabase (nunca del contenido de ejemplo).

export function restaurantJsonLd(semana: Semana | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: SITE.name,
    url: `${SITE_URL}/es`,
    image: `${SITE_URL}/og/la-ofi-og.jpg`,
    telephone: `+34${SITE.phone.digits}`,
    servesCuisine: ["Cocina tradicional", "Brasa", "Pintxos"],
    acceptsReservations: true,
    hasMap: SITE.maps.place,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      postalCode: SITE.address.postalCode,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    sameAs: [SITE.instagram.url],
    hasMenu: `${SITE_URL}/es/carta`,
    ...(semana ? { openingHoursSpecification: horarioSchemaOrg(semana) } : {}),
  };
}

function dietas(item: CartaItem): string[] {
  const d: string[] = [];
  if (item.etiquetas.includes("vegano")) d.push("https://schema.org/VeganDiet");
  if (item.etiquetas.includes("vegetariano") || item.etiquetas.includes("vegano")) d.push("https://schema.org/VegetarianDiet");
  if (item.etiquetas.includes("sin_gluten") && item.alergenosConfirmados) d.push("https://schema.org/GlutenFreeDiet");
  return d;
}

export function menuJsonLd(secciones: CartaSeccion[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Carta de ${SITE.name}`,
    url: `${SITE_URL}/es/carta`,
    hasMenuSection: secciones.map((s) => ({
      "@type": "MenuSection",
      name: s.nombre,
      hasMenuItem: s.items.map((item) => ({
        "@type": "MenuItem",
        name: item.nombre,
        ...(item.descripcion ? { description: item.descripcion } : {}),
        ...(item.precioCentimos !== null
          ? { offers: { "@type": "Offer", price: (item.precioCentimos / 100).toFixed(2), priceCurrency: "EUR" } }
          : {}),
        // Nutrición y dietas solo con datos reales del restaurante (nunca ejemplos ni alérgenos sin confirmar).
        ...(item.fuente === "supabase" && item.nutricion?.fuente === "restaurante" && item.nutricion.calorias !== null
          ? { nutrition: { "@type": "NutritionInformation", calories: `${item.nutricion.calorias} kcal` } }
          : {}),
        ...(item.fuente === "supabase" && dietas(item).length > 0 ? { suitableForDiet: dietas(item) } : {}),
      })),
    })),
  };
}

const EVENT_STATUS: Record<EventoView["estado"], string> = {
  proximo: "https://schema.org/EventScheduled",
  agotado: "https://schema.org/EventScheduled",
  finalizado: "https://schema.org/EventScheduled",
  cancelado: "https://schema.org/EventCancelled",
};

export function eventJsonLd(evento: EventoView) {
  if (evento.fuente !== "supabase" || !evento.fecha) return null;
  // Hora local del evento (Europe/Madrid); sin desfase fijo para no equivocarse con el cambio de hora.
  const startDate = evento.hora ? `${evento.fecha}T${evento.hora.slice(0, 5)}` : evento.fecha;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: evento.titulo,
    description: evento.descripcion || undefined,
    startDate,
    eventStatus: EVENT_STATUS[evento.estado],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(evento.imagen ? { image: evento.imagen.src.startsWith("http") ? evento.imagen.src : `${SITE_URL}${evento.imagen.src}` } : {}),
    location: {
      "@type": "Place",
      name: SITE.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: SITE.address.street,
        postalCode: SITE.address.postalCode,
        addressLocality: SITE.address.locality,
        addressCountry: SITE.address.country,
      },
    },
    ...(evento.precioCentimos !== null
      ? {
          offers: {
            "@type": "Offer",
            price: (evento.precioCentimos / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: evento.estado === "agotado" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            ...(evento.enlaceReserva ? { url: evento.enlaceReserva } : {}),
          },
        }
      : {}),
  };
}
