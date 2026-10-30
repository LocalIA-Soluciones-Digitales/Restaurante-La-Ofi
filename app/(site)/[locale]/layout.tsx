import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { AvisoEvento, type AvisoEventoDatos } from "@/components/eventos/AvisoEvento";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ReservarFlotante } from "@/components/layout/ReservarFlotante";
import { footerNav, mainNav, primaryNav } from "@/components/layout/nav";
import { JsonLd } from "@/components/ui/JsonLd";
import { getDictionary } from "@/i18n/dictionaries";
import { IS_DEMO, SITE_URL } from "@/lib/env";
import { resolverHorario } from "@/lib/horario";
import { ENABLED_LOCALES, HTML_LANG, href, isEnabledLocale } from "@/lib/i18n";
import { restaurantJsonLd } from "@/lib/restaurant/jsonld";
import { getCierres, getEventos, getHorario } from "@/lib/restaurant/queries";
import type { Evento } from "@/lib/restaurant/types";
import { getTitularResuelto } from "@/lib/restaurant/titular";
import { SITE } from "@/lib/site";
import "../../globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  // Cursiva real para los acentos editoriales (sin eje óptico: pesa la mitad).
  style: ["normal", "italic"],
});

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Sin `dynamicParams = false`: con él, la revalidación bajo demanda desde /admin
// deja las páginas en 404 (NoFallbackError de Next 15). Un idioma no publicado ya
// da 404 abajo (isEnabledLocale) y el middleware lo redirige antes.

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
  // Los eventos van también en la demo: el aviso es contenido real que publica Carlos.
  const [horarioBd, cierres, titular, eventos] = await Promise.all(
    IS_DEMO ? [null, null, null, getEventos()] : [getHorario(), getCierres(), getTitularResuelto(), getEventos()],
  );
  const horario = IS_DEMO ? null : resolverHorario(horarioBd, cierres);
  const aviso = eventoParaAviso(eventos);

  return (
    // suppressHydrationWarning: el script de IntroOfi marca <html> con «intro-vista» antes de hidratar.
    <html lang={HTML_LANG[locale]} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-carbon px-5 py-3 text-crema focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t.common.saltarContenido}
        </a>
        {horario ? <JsonLd data={restaurantJsonLd(horario.semana, horario.cierres, titular?.email ?? null)} /> : null}
        <Header
          homeHref={href(locale)}
          reservarHref={href(locale, "/reservar")}
          items={items}
          primary={primaryNav(locale, t)}
          phoneHref={SITE.phone.href}
          phoneDisplay={SITE.phone.display}
          labels={{
            reservar: t.cta.reservar,
            llamar: t.cta.llamar,
            abrirMenu: t.cta.abrirMenu,
            cerrarMenu: t.cta.cerrarMenu,
          }}
        />
        {/* tabIndex -1: el enlace «Saltar al contenido» mueve el foco aquí también en Safari. */}
        <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer locale={locale} items={footerNav(locale, t)} />
        <ReservarFlotante href={href(locale, "/reservar")} label={t.cta.reservarMesa} />
        {aviso ? (
          <AvisoEvento
            evento={aviso}
            verHref={href(locale, `/eventos/${aviso.slug}`)}
            reservarHref={href(locale, `/reservar?espacio=evento&evento=${aviso.slug}`)}
            agendaHref={href(locale, "/eventos")}
          />
        ) : null}
      </body>
    </html>
  );
}

/**
 * El evento que Carlos ha elegido anunciar al entrar (si marca varios, el más
 * cercano: los eventos ya vienen por fecha). Las imágenes van en orden: portada,
 * los carteles de cada parte del programa y la galería, sin repetir.
 */
function eventoParaAviso(eventos: Evento[] | null): AvisoEventoDatos | null {
  const e = (eventos ?? []).find((x) => x.aviso_web === true && (x.estado === "proximo" || x.estado === "agotado"));
  if (!e) return null;
  const programa = e.programa ?? [];
  const media: AvisoEventoDatos["media"] = [];
  const anadir = (m: AvisoEventoDatos["media"][number]) => {
    if (!media.some((x) => x.url === m.url)) media.push(m);
  };
  if (e.imagen_url) anadir({ tipo: "imagen", url: e.imagen_url });
  for (const p of programa) if (p.imagen) anadir({ tipo: "imagen", url: p.imagen });
  for (const m of e.media ?? []) anadir(m);
  return {
    id: e.id,
    slug: e.slug,
    titulo: e.titulo,
    tipo: e.tipo,
    descripcion: e.descripcion,
    fecha: e.fecha,
    hora: e.hora,
    precioCentimos: e.precio_centimos,
    reservable: e.estado === "proximo",
    media,
    programa,
  };
}
