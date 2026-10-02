// Manifest de la PWA del panel (instalable en la tablet de barra/cocina o el TPV).
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "La Ofi · Gestión",
      short_name: "La Ofi",
      description: "Salón, TPV, cocina y gestión de Restaurante La Ofi",
      start_url: "/admin",
      scope: "/admin",
      display: "fullscreen",
      display_override: ["fullscreen", "standalone"],
      orientation: "any",
      background_color: "#0B1424",
      theme_color: "#0B1424",
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
