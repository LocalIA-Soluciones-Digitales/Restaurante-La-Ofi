import type { MetadataRoute } from "next";
import { IS_DEMO, SITE_URL } from "@/lib/env";
import { ENABLED_LOCALES, HTML_LANG } from "@/lib/i18n";
import { getEventos } from "@/lib/restaurant/queries";

export const revalidate = 3600;

const RUTAS: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/menu-del-dia", priority: 0.9, changeFrequency: "daily" },
  { path: "/carta", priority: 0.9, changeFrequency: "weekly" },
  { path: "/eventos", priority: 0.7, changeFrequency: "weekly" },
  { path: "/galeria", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.7, changeFrequency: "yearly" },
  { path: "/aviso-legal", priority: 0.1, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.1, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.1, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Demo: la web queda fuera del sitemap.
  if (IS_DEMO) return [];

  const eventos = (await getEventos()) ?? [];
  const rutas = [
    ...RUTAS,
    ...eventos.map((e) => ({ path: `/eventos/${e.slug}`, priority: 0.6, changeFrequency: "weekly" as const })),
  ];

  return ENABLED_LOCALES.flatMap((locale) =>
    rutas.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(ENABLED_LOCALES.map((l) => [HTML_LANG[l], `${SITE_URL}/${l}${path}`])),
      },
    })),
  );
}
