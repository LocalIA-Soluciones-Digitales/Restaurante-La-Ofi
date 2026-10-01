import type { MetadataRoute } from "next";
import { IS_DEMO, SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (IS_DEMO) {
    // Demo: no se indexa nada.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/es/pedir", "/es/reservar"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
