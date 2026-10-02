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
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Fotos futuras subidas desde /admin a Supabase Storage (mismo patrón que Palomita).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
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
