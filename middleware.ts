import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isEnabledLocale } from "@/lib/i18n";

// Rutas sin prefijo de idioma → /es/... conservando la query (p. ej. los QR
// /pedir?mesa=12 → /es/pedir?mesa=12). Un idioma preparado pero aún no
// publicado (eu) redirige temporalmente a castellano.
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, first = "", ...rest] = pathname.split("/");

  if ((LOCALES as readonly string[]).includes(first)) {
    if (isEnabledLocale(first)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${rest.length ? `/${rest.join("/")}` : ""}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url, pathname === "/" ? 307 : 308);
}

export const config = {
  matcher: [
    "/((?!_next|api|admin|images|videos|og|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
