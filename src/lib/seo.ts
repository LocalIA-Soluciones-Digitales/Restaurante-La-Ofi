import type { Metadata } from "next";
import { IS_DEMO, SITE_URL } from "@/lib/env";
import { ENABLED_LOCALES, HTML_LANG, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const OG_IMAGE = "/og/la-ofi-og.jpg";

interface PageSeo {
  locale: Locale;
  /** Ruta sin prefijo de idioma: "" para inicio, "/carta"… */
  path: string;
  title?: string;
  description?: string;
  /** Páginas que nunca deben indexarse (pedir, reservar, admin…). */
  noindex?: boolean;
}

export function pageMetadata({ locale, path, title, description, noindex }: PageSeo): Metadata {
  const url = `${SITE_URL}/${locale}${path}`;
  const languages = Object.fromEntries(
    ENABLED_LOCALES.map((l) => [HTML_LANG[l], `${SITE_URL}/${l}${path}`]),
  );
  const desc = description ?? SITE.description;
  const blockIndexing = IS_DEMO || noindex;

  return {
    title,
    description: desc,
    alternates: {
      canonical: url,
      languages: { ...languages, "x-default": `${SITE_URL}/es${path}` },
    },
    openGraph: {
      type: "website",
      locale: "es_ES",
      url,
      siteName: SITE.name,
      title: title ? `${title} · ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`,
      description: desc,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Comedor de La Ofi con lámparas de ratán" }],
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} · ${SITE.name}` : SITE.name,
      description: desc,
      images: [OG_IMAGE],
    },
    robots: blockIndexing
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  };
}
