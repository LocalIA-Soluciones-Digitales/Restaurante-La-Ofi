import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isEnabledLocale } from "@/lib/i18n";

// 1) /admin: refresca la sesión del staff (cookie de Supabase Auth) en cada
//    petición y manda al login si no hay sesión (patrón de Palomita §4.5). El rol
//    se comprueba después, en el servidor, con laofi.mi_rol().
// 2) Web pública: rutas sin prefijo de idioma → /es/... conservando la query
//    (p. ej. los QR /pedir?mesa=… → /es/pedir?mesa=…). Un idioma preparado pero
//    aún no publicado (eu) redirige temporalmente a castellano.
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return sesionAdmin(request);

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

const PUBLICAS_ADMIN = ["/admin/login", "/admin/manifest.webmanifest"];

async function sesionAdmin(request: NextRequest) {
  // Backend local de desarrollo: sin Supabase Auth (entra el encargado de pruebas).
  if (process.env.LAOFI_PGLITE === "1") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const c of lista) request.cookies.set(c.name, c.value);
        response = NextResponse.next({ request });
        for (const c of lista) response.cookies.set(c.name, c.value, c.options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !PUBLICAS_ADMIN.includes(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/((?!_next|api|admin|images|videos|og|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
