import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] max-w-xl flex-col items-start justify-center pb-20 pt-32">
      <p className="eyebrow text-terracota">Error 404</p>
      <h1 className="mt-3 text-5xl text-carbon">Esta mesa no existe</h1>
      <p className="mt-4 text-lg text-carbon-muted">La página que buscas no está o ha cambiado de sitio.</p>
      <Link href="/es" className="btn-primary mt-8">
        <Icon name="chevronLeft" className="h-4 w-4" />
        Volver al inicio
      </Link>
    </div>
  );
}
