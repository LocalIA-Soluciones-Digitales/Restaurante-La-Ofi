"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface Props {
  cartaHref: string;
  pedirHref: string;
  reservarHref: string;
  directionsHref: string;
  labels: { carta: string; pedir: string; reservar: string; comoLlegar: string };
}

/** Barra de acciones persistente en móvil. En el flujo de pedido la sustituye la barra de la cesta. */
export function BottomBar({ cartaHref, pedirHref, reservarHref, directionsHref, labels }: Props) {
  const pathname = usePathname();
  if (/\/(pedir|pedido)(\/|$)/.test(pathname)) return null;

  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.72rem] font-semibold transition-colors";
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-carbon/10 bg-crema/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1.5 px-2 py-1.5">
        <Link href={cartaHref} className={`${item} text-carbon hover:bg-carbon/5`}>
          <Icon name="utensils" />
          {labels.carta}
        </Link>
        <Link href={pedirHref} className={`${item} text-carbon hover:bg-carbon/5`}>
          <Icon name="bag" />
          {labels.pedir}
        </Link>
        <Link href={reservarHref} className={`${item} bg-marino text-crema shadow-card`}>
          <Icon name="calendar" />
          {labels.reservar}
        </Link>
        <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={`${item} text-carbon hover:bg-carbon/5`}>
          <Icon name="pin" />
          {labels.comoLlegar}
        </a>
      </div>
    </nav>
  );
}
