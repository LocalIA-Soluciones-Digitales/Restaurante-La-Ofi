import type { MetadataRoute } from "next";
import { IS_DEMO, SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (IS_DEMO) {
    // Demo: no se indexa nada.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  // /es/pedir no se bloquea aquí: lleva noindex en la página y Google tiene que
  // poder rastrearla para leerlo. /es/reservar se indexa (búsquedas «reservar La Ofi»).
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
