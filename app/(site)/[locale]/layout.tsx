import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { BottomBar } from "@/components/layout/BottomBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { mainNav } from "@/components/layout/nav";
import { JsonLd } from "@/components/ui/JsonLd";
import { getDictionary } from "@/i18n/dictionaries";
import { IS_DEMO, SITE_URL } from "@/lib/env";
import { resolverHorario } from "@/lib/horario";
import { ENABLED_LOCALES, HTML_LANG, href, isEnabledLocale } from "@/lib/i18n";
import { restaurantJsonLd } from "@/lib/restaurant/jsonld";
import { getHorario } from "@/lib/restaurant/queries";
import { SITE } from "@/lib/site";
import "../../globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamicParams = false;

export function generateStaticParams() {
  return ENABLED_LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline} · Derio`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FAF5EC",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isEnabledLocale(locale)) notFound();

  const t = getDictionary(locale);
  const items = mainNav(locale, t);
  const semana = IS_DEMO ? null : resolverHorario(await getHorario()).semana;

  return (
    <html lang={HTML_LANG[locale]} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-marino px-5 py-3 text-crema focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t.common.saltarContenido}
        </a>
        {IS_DEMO ? null : <JsonLd data={restaurantJsonLd(semana)} />}
        <Header
          homeHref={href(locale)}
          items={items}
          phoneHref={SITE.phone.href}
          phoneDisplay={SITE.phone.display}
          directionsHref={SITE.maps.directions}
          labels={{
            reservar: t.cta.reservar,
            abrirMenu: t.cta.abrirMenu,
            cerrarMenu: t.cta.cerrarMenu,
            comoLlegar: t.cta.comoLlegar,
          }}
        />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} items={items} />
        <BottomBar
          cartaHref={href(locale, "/carta")}
          phoneHref={SITE.phone.href}
          directionsHref={SITE.maps.directions}
          labels={{ carta: t.nav.carta, reservar: t.cta.reservar, comoLlegar: t.cta.comoLlegar }}
        />
      </body>
    </html>
  );
}
