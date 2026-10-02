import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "../../globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Raíz independiente para /admin (sin cabecera ni pie públicos), como en
// Palomita-Bar. PWA instalable en la tablet/TPV con su propio manifest.
export const metadata: Metadata = {
  title: { default: "La Ofi · Gestión", template: "%s · La Ofi Gestión" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "La Ofi", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0B1424",
  width: "device-width",
  initialScale: 1,
  // Pantallas táctiles de servicio: sin zoom accidental al tocar rápido.
  maximumScale: 1,
};

// Aplica el tema guardado antes de pintar (sin parpadeo claro→oscuro).
const TEMA = `try{var t=localStorage.getItem("laofi:admin:tema");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className="min-h-screen bg-crema font-sans text-carbon antialiased dark:bg-noche dark:text-crema">{children}</body>
    </html>
  );
}
