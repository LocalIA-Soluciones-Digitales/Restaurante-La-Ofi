import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

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
    // (402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) y las fotos nuevas o en tamaños
    // nuevos salían rotas. Las fotos ya están en WebP y a tamaño razonable.
    unoptimized: true,
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
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
