import type { Metadata } from "next";
import "../../globals.css";

// Raíz independiente para /admin (sin cabecera ni pie públicos), como en Palomita-Bar.
export const metadata: Metadata = {
  title: "Administración · La Ofi",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES">
      <body className="min-h-screen bg-crema font-sans text-carbon">{children}</body>
    </html>
  );
}
