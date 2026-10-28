import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), payment=(self)" },
];

// CSP de la web pública, ya aplicada: las 12 páginas, en móvil y escritorio y con
// scroll completo, no dieron ninguna violación en Report-Only (28/10/2026).
// 'unsafe-inline' en scripts porque Next inyecta scripts inline y con nonces las
// páginas dejarían de ser estáticas. El navegador solo habla con el propio dominio
// y con OpenFreeMap (mapa); Supabase en el navegador es solo del panel.
const cspPublica = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://tiles.openfreemap.org",
  "font-src 'self'",
  "connect-src 'self' https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// /admin, solo en Report-Only hasta revisarlo con sesión iniciada: Realtime de
// Supabase (wss), fotos de Storage y el OCR de gastos en WASM con workers.
const cspAdmin = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Backend local de desarrollo (LAOFI_PGLITE=1): PGlite queda fuera del bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // CSS crítico incrustado en el HTML: elimina la petición CSS que bloquea el
    // primer render (mejora el LCP en móvil; el CSS total es pequeño, ~8 KB).
    inlineCss: true,
    // La copia JPEG de un gasto (300-500 KB, hasta ~1,5 MB un PDF de 3 páginas).
    serverActions: { bodySizeLimit: "6mb" },
  },
  webpack(config) {
    // El lector de gastos (ppu-paddle-ocr) solo usa el motor WASM: así no se
    // empaquetan las variantes WebGPU/JSEP (otros ~30 MB). El .wasm se sirve
    // desde public/ocr (scripts/copiar-ocr.mjs).
    config.resolve.alias = { ...config.resolve.alias, "onnxruntime-web$": "onnxruntime-web/wasm" };
    return config;
  },
  images: {
    // Sin la optimización de Vercel: el plan agotó su cuota de transformaciones
    // (402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED). En su lugar, el build crea
    // copias de cada foto a estos anchos (scripts/variantes-imagenes.mjs) y el
    // cargador propio las pide según la pantalla. Anchos sincronizados con el script.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [96, 256, 384],
    formats: ["image/avif", "image/webp"],
    // Calidades permitidas (obligatorio desde Next 16): 60 fondos, 75 general, 80 fotos de plato grandes.
    qualities: [60, 75, 80],
    // Fotos futuras subidas desde /admin a Supabase Storage (mismo patrón que Palomita).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // /empresas y /eventos se fusionaron en /grupos (el detalle /eventos/[slug] sigue).
  // El idioma va acotado (LOCALES de src/lib/i18n.ts): con un ":locale" libre,
  // /admin/eventos también casaba y el panel acababa en /admin/grupos (404).
  async redirects() {
    return [
      { source: "/:locale(es|eu)/empresas", destination: "/:locale/grupos", permanent: true },
      { source: "/:locale(es|eu)/eventos", destination: "/:locale/grupos#agenda", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:path((?!admin).*)", headers: [{ key: "Content-Security-Policy", value: cspPublica }] },
      { source: "/admin/:path*", headers: [{ key: "Content-Security-Policy-Report-Only", value: cspAdmin }] },
      { source: "/admin", headers: [{ key: "Content-Security-Policy-Report-Only", value: cspAdmin }] },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
