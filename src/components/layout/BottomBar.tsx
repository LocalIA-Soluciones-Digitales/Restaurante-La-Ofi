"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface Props {
  /** Entrada única de menú del día y carta; activa en cualquiera de `cartaMatch`. */
  cartaHref: string;
  cartaMatch: string[];
  reservarHref: string;
  directionsHref: string;
  labels: { carta: string; reservar: string; llegar: string };
}

/**
 * Barra de acciones persistente en móvil, en el orden en que la usa quien trabaja
 * en el Parque: carta y menú del día, reservar y llegar. Pedir vive en el menú
 * y en la home; en el flujo de pedido la sustituye la barra de la cesta.
 */
export function BottomBar({ cartaHref, cartaMatch, reservarHref, directionsHref, labels }: Props) {
  const pathname = usePathname();
  if (/\/(pedir|pedido)(\/|$)/.test(pathname)) return null;

  const item = (activo: boolean) =>
    `flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold tracking-wide transition-colors ${
      activo ? "text-brasa" : "text-carbon/75 hover:text-carbon"
    }`;
  const cartaActiva = cartaMatch.some((h) => pathname.startsWith(h));

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-tinta-line bg-crema/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 py-1">
        <Link href={cartaHref} aria-current={cartaActiva ? "page" : undefined} className={item(cartaActiva)}>
          <Icon name="utensils" className="h-5 w-5" />
          {labels.carta}
        </Link>
        <Link
          href={reservarHref}
          className="mx-1 flex min-h-[3.25rem] flex-[1.25] flex-col items-center justify-center gap-0.5 rounded-md bg-brasa text-[0.7rem] font-semibold tracking-wide text-crema"
        >
          <Icon name="calendar" className="h-5 w-5" />
          {labels.reservar}
        </Link>
        <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={item(false)}>
          <Icon name="pin" className="h-5 w-5" />
          {labels.llegar}
        </a>
      </div>
    </nav>
  );
}
